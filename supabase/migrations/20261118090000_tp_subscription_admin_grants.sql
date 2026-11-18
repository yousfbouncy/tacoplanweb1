-- User-specific complimentary plan grants controlled by the authenticated admin API only.
-- No mobile or public client can create, edit, or list another driver's grant.
create table if not exists public.tp_subscription_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('plus','pro')),
  enabled boolean not null default true,
  reason text,
  granted_by text not null default 'admin',
  updated_at timestamptz not null default now()
);
alter table public.tp_subscription_grants enable row level security;
revoke all on public.tp_subscription_grants from anon, authenticated;
create index if not exists tp_subscription_grants_active_idx on public.tp_subscription_grants(enabled,plan);
-- The restrictions flag was already introduced and intentionally defaults to false.
update public.tp_subscription_runtime set restrictions_enabled = false where id=1 and restrictions_enabled is null;
