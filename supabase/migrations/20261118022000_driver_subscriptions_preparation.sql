-- Driver billing prepared, no automatic charges or user restrictions.
create table if not exists public.tp_driver_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 price_slug text not null references public.tp_subscription_price_catalog(slug),
 stripe_customer_id text unique,
 stripe_subscription_id text unique,
 status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','unpaid','canceled','incomplete','incomplete_expired','paused')),
 trial_used boolean not null default false,
 trial_ends_at timestamptz,
 current_period_end timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.tp_driver_subscriptions enable row level security;
revoke all on public.tp_driver_subscriptions from anon, authenticated;
create table if not exists public.tp_driver_billing_events (
 event_id text primary key,
 event_type text not null,
 processed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.tp_driver_billing_events enable row level security;
revoke all on public.tp_driver_billing_events from anon, authenticated;
-- Explicit benefit assignments, never inferred from self-reported user metadata.
create table if not exists public.tp_driver_price_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 audience text not null check(audience in ('standard','existing','founder')),
 verified_by text,
 verified_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.tp_driver_price_entitlements enable row level security;
revoke all on public.tp_driver_price_entitlements from anon, authenticated;
create index if not exists tp_driver_subscriptions_status_idx on public.tp_driver_subscriptions(status);
