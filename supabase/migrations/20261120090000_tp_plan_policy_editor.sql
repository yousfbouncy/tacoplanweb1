-- Administrative feature policy; service-role only. No client may read drafts.
create table if not exists public.tp_plan_policies (
 slug text primary key check (slug in ('free','plus','pro')),
 draft_config jsonb not null,
 published_config jsonb not null,
 version integer not null default 1 check (version > 0),
 draft_updated_at timestamptz not null default now(),
 published_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.tp_plan_policies enable row level security;
revoke all on public.tp_plan_policies from public, anon, authenticated;
create table if not exists public.tp_plan_policy_audit (
 id bigint generated always as identity primary key,
 plan_slug text not null,
 action text not null check (action in ('draft','publish')),
 before_config jsonb,
 after_config jsonb not null,
 actor text not null default 'admin',
 created_at timestamptz not null default now()
);
alter table public.tp_plan_policy_audit enable row level security;
revoke all on public.tp_plan_policy_audit from public, anon, authenticated;

-- Preserve current live catalog trial durations (7 days); only prefill a
-- 14-day trial as a DRAFT for Plus and Pro. Never rewrite existing trials.
insert into public.tp_plan_policies (slug,draft_config,published_config,published_at)
values
('free',
 '{"duration_days":null,"history_days":14,"trial_days":0,"features":{"auto":false,"diets":true,"manual":false,"notify":true,"reports":false,"trip":true,"widget":true}}'::jsonb,
 '{"duration_days":null,"history_days":14,"trial_days":0,"features":{"auto":false,"diets":true,"manual":false,"notify":true,"reports":false,"trip":true,"widget":true}}'::jsonb,now()),
('plus',
 '{"duration_days":null,"history_days":90,"trial_days":14,"features":{"auto":true,"diets":true,"manual":true,"notify":true,"reports":true,"trip":true,"widget":true}}'::jsonb,
 '{"duration_days":null,"history_days":90,"trial_days":7,"features":{"auto":true,"diets":true,"manual":true,"notify":true,"reports":true,"trip":true,"widget":true}}'::jsonb,now()),
('pro',
 '{"duration_days":null,"history_days":null,"trial_days":14,"features":{"auto":true,"diets":true,"manual":true,"notify":true,"reports":true,"trip":true,"widget":true}}'::jsonb,
 '{"duration_days":null,"history_days":null,"trial_days":7,"features":{"auto":true,"diets":true,"manual":true,"notify":true,"reports":true,"trip":true,"widget":true}}'::jsonb,now())
on conflict (slug) do nothing;

-- An atomic publication with concurrent-edit protection. Paid trial
-- duration changes are only prospective: never touch tp_driver_subscriptions.
create or replace function public.tp_publish_plan_policy(p_slug text, p_version integer)
returns public.tp_plan_policies
language plpgsql security invoker set search_path = public
as $$
declare current_policy public.tp_plan_policies;
 old_published jsonb;
begin
  select * into current_policy from public.tp_plan_policies where slug=p_slug for update;
  if not found then raise exception 'Plan no encontrado'; end if;
  if current_policy.version <> p_version then raise exception 'El plan ha cambiado: recarga antes de publicar'; end if;
  old_published := current_policy.published_config;
  if p_slug in ('plus','pro') then
    update public.tp_subscription_price_catalog
    set trial_days=(current_policy.draft_config->>'trial_days')::integer,updated_at=now()
    where plan=p_slug;
  end if;
  update public.tp_plan_policies
  set published_config=draft_config,published_at=now(),updated_at=now(),version=version+1
  where slug=p_slug returning * into current_policy;
  insert into public.tp_plan_policy_audit(plan_slug,action,before_config,after_config)
  values(p_slug,'publish',old_published,current_policy.published_config);
  return current_policy;
end;
$$;
revoke all on function public.tp_publish_plan_policy(text,integer) from public,anon,authenticated;
grant execute on function public.tp_publish_plan_policy(text,integer) to service_role;