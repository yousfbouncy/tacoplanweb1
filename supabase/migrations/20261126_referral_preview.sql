begin;
create table public.tp_referral_config (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
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
commit;
