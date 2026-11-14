create table if not exists public.tp_stripe_events (event_id text primary key,event_type text not null,received_at timestamptz not null default now(),processed_at timestamptz,error text);
alter table public.tp_stripe_events enable row level security;
revoke all on public.tp_stripe_events from anon,authenticated;
