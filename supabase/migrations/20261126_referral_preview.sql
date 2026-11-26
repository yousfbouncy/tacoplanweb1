begin;
create table public.tp_referral_config (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 active_since timestamptz,
 monthly_cents integer not null default 100 check(monthly_cents>=0),
 annual_cents integer not null default 500 check(annual_cents>=0),
 min_referrals integer not null default 5 check(min_referrals>0),
 min_payout_cents integer not null default 1000 check(min_payout_cents>0),
 milestone_count integer not null default 50 check(milestone_count>0),
 milestone_cents integer not null default 5000 check(milestone_cents>=0),
 loyalty_min_count integer not null default 50 check(loyalty_min_count>0),
 loyalty_cents integer not null default 200 check(loyalty_cents>=0),
 hold_days integer not null default 30 check(hold_days>=30)
);
insert into public.tp_referral_config(id) values(true);
create table public.tp_referral_codes (
 user_id uuid primary key references auth.users(id),
 code text not null unique check(code ~ '^[A-Z0-9]{12}$'),
 created_at timestamptz not null default now()
);
create table public.tp_referral_attributions (
 referred_user_id uuid primary key references auth.users(id),
 referrer_user_id uuid not null references public.tp_referral_codes(user_id),
 created_at timestamptz not null default now(),
 check(referred_user_id<>referrer_user_id)
);
create table public.tp_referral_rewards (
 id uuid primary key default gen_random_uuid(),
 referred_user_id uuid not null unique references public.tp_referral_attributions(referred_user_id),
 stripe_invoice_id text not null unique,
 amount_cents integer not null check(amount_cents>0),
 interval_kind text not null check(interval_kind in ('month','year')),
 paid_at timestamptz not null,
 available_at timestamptz not null check(available_at>=paid_at),
 status text not null default 'pending' check(status in ('pending','available','void','reserved','paid')),
 created_at timestamptz not null default now()
);
create table public.tp_referral_payouts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 amount_cents integer not null check(amount_cents>0),
 status text not null default 'requested' check(status in ('requested','approved','paid','rejected')),
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 transfer_reference text
);
alter table public.tp_referral_rewards add column payout_id uuid references public.tp_referral_payouts(id);
create unique index tp_referral_one_open_payout on public.tp_referral_payouts(user_id) where status in ('requested','approved');
alter table public.tp_referral_config enable row level security;
alter table public.tp_referral_codes enable row level security;
alter table public.tp_referral_attributions enable row level security;
alter table public.tp_referral_rewards enable row level security;
alter table public.tp_referral_payouts enable row level security;
revoke all on public.tp_referral_config,public.tp_referral_codes,public.tp_referral_attributions,public.tp_referral_rewards,public.tp_referral_payouts from anon,authenticated;
grant select on public.tp_referral_config,public.tp_referral_codes,public.tp_referral_attributions,public.tp_referral_rewards,public.tp_referral_payouts to authenticated;
grant select,insert,update,delete on public.tp_referral_config,public.tp_referral_codes,public.tp_referral_attributions,public.tp_referral_rewards,public.tp_referral_payouts to service_role;
create policy referral_config_read on public.tp_referral_config for select to authenticated using(true);
create policy referral_code_owner on public.tp_referral_codes for select to authenticated using(user_id=(select auth.uid()));
create policy referral_attribution_owner on public.tp_referral_attributions for select to authenticated using(referrer_user_id=(select auth.uid()) or referred_user_id=(select auth.uid()));
create policy referral_reward_owner on public.tp_referral_rewards for select to authenticated using(exists(select 1 from public.tp_referral_attributions a where a.referred_user_id=tp_referral_rewards.referred_user_id and a.referrer_user_id=(select auth.uid())));
create policy referral_payout_owner on public.tp_referral_payouts for select to authenticated using(user_id=(select auth.uid()));
create table public.tp_referral_bonuses (
 id uuid primary key default gen_random_uuid(),
 referrer_user_id uuid not null references public.tp_referral_codes(user_id),
 referred_user_id uuid references public.tp_referral_attributions(referred_user_id),
 kind text not null check(kind in ('milestone','loyalty')),
 amount_cents integer not null check(amount_cents>0),
 qualified_at timestamptz not null,
 status text not null default 'available' check(status in ('available','void','reserved','paid')),
 payout_id uuid references public.tp_referral_payouts(id),
 check((kind='milestone' and referred_user_id is null) or (kind='loyalty' and referred_user_id is not null))
);
create unique index tp_referral_one_milestone on public.tp_referral_bonuses(referrer_user_id) where kind='milestone';
create unique index tp_referral_one_loyalty on public.tp_referral_bonuses(referred_user_id) where kind='loyalty';
alter table public.tp_referral_bonuses enable row level security;
revoke all on public.tp_referral_bonuses from public,anon,authenticated;
grant select on public.tp_referral_bonuses to authenticated;
grant select,insert,update,delete on public.tp_referral_bonuses to service_role;
create policy referral_bonus_owner on public.tp_referral_bonuses for select to authenticated using(referrer_user_id=(select auth.uid()));
-- Immutable registration attribution: only accepted during insertion of a new auth user.
create schema if not exists tp_referral_private;
revoke all on schema tp_referral_private from public,anon,authenticated;
create function tp_referral_private.capture_signup() returns trigger
language plpgsql security definer set search_path='' as $signup$
begin
 if exists(select 1 from public.tp_referral_config where id and enabled and active_since is not null and new.created_at >= active_since) then
  insert into public.tp_referral_attributions(referred_user_id,referrer_user_id)
  select new.id,c.user_id from public.tp_referral_codes c
  where c.code=upper(trim(coalesce(new.raw_user_meta_data->>'referral_code','')))
   and c.user_id<>new.id
  on conflict(referred_user_id) do nothing;
 end if;
 return new;
end; $signup$;
revoke all on function tp_referral_private.capture_signup() from public,anon,authenticated;
create trigger tp_referral_signup after insert on auth.users for each row execute function tp_referral_private.capture_signup();
-- Verified invoice evidence is separate from withdrawable rewards. No reward is
-- released until refund/dispute and continuity verification has been completed.
create table public.tp_referral_invoice_evidence (
 invoice_id text primary key,
 referred_user_id uuid not null references public.tp_referral_attributions(referred_user_id),
 stripe_subscription_id text not null,
 stripe_customer_id text not null,
 paid_at timestamptz not null,
 amount_paid_cents integer not null check(amount_paid_cents>0),
 currency text not null,
 observed_at timestamptz not null default now()
);
alter table public.tp_referral_invoice_evidence enable row level security;
revoke all on public.tp_referral_invoice_evidence from public,anon,authenticated;
grant select,insert,update on public.tp_referral_invoice_evidence to service_role;
-- One-time choice for new social signups, including an explicit skip.
create table public.tp_referral_onboarding_choices (
 user_id uuid primary key references auth.users(id),
 decided_at timestamptz not null default now(),
 skipped boolean not null
);
alter table public.tp_referral_onboarding_choices enable row level security;
revoke all on public.tp_referral_onboarding_choices from public,anon,authenticated;
grant select,insert on public.tp_referral_onboarding_choices to service_role;
create function public.tp_referral_onboarding(p_user uuid,p_action text,p_code text default null) returns text
language plpgsql security definer set search_path='' as $onboarding$
declare
 v_referrer uuid;
 v_started timestamptz;
begin
 if p_action not in ('check','claim','skip') then return 'invalid'; end if;
 -- Only trusted service callers may invoke this function. Serialize decisions.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 select active_since into v_started from public.tp_referral_config where id and enabled;
 if v_started is null then return 'disabled'; end if;
 if exists(select 1 from public.tp_referral_attributions where referred_user_id=p_user)
 or exists(select 1 from public.tp_referral_onboarding_choices where user_id=p_user) then return 'settled'; end if;
 if not exists(select 1 from auth.users u where u.id=p_user and u.created_at>=v_started
   and u.created_at>=now()-interval '7 days'
   and (u.raw_app_meta_data->>'provider') in ('google','apple'))
 or exists(select 1 from public.profiles p where p.id=p_user and p.onboarding_completed is true)
 or exists(select 1 from public.jornadas j where j.user_id=p_user)
 or exists(select 1 from public.tp_driver_subscriptions s where s.user_id=p_user and (s.first_paid_at is not null or s.stripe_subscription_id is not null))
 then return 'ineligible'; end if;
 if p_action='check' then return 'eligible'; end if;
 if p_action='claim' then
  select c.user_id into v_referrer from public.tp_referral_codes c
  where c.code=upper(trim(coalesce(p_code,''))) and c.user_id<>p_user;
  if v_referrer is null then return 'invalid_code'; end if;
  insert into public.tp_referral_attributions(referred_user_id,referrer_user_id)
  values(p_user,v_referrer) on conflict(referred_user_id) do nothing;
 end if;
 insert into public.tp_referral_onboarding_choices(user_id,skipped) values(p_user,p_action='skip')
 on conflict(user_id) do nothing;
 return 'settled';
end; $onboarding$;
revoke all on function public.tp_referral_onboarding(uuid,text,text) from public,anon,authenticated;
grant execute on function public.tp_referral_onboarding(uuid,text,text) to service_role;
commit;
