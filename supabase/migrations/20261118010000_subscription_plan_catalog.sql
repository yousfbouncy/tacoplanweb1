-- Preparación de catálogo editable; sin activar cobros ni restricciones.
create table if not exists public.tp_subscription_price_catalog (
  slug text primary key,
  plan text not null check (plan in ('free','plus','pro')),
  audience text not null check (audience in ('standard','existing','founder')),
  monthly_cents integer not null check (monthly_cents >= 0 and monthly_cents <= 100000),
  annual_cents integer check (annual_cents is null or (annual_cents >= 0 and annual_cents <= 1200000)),
  trial_days integer not null default 7 check (trial_days between 0 and 30),
  updated_at timestamptz not null default now()
);
alter table public.tp_subscription_price_catalog enable row level security;
revoke all on public.tp_subscription_price_catalog from anon, authenticated;
insert into public.tp_subscription_price_catalog(slug,plan,audience,monthly_cents,annual_cents,trial_days)
values
('free','free','standard',0,0,0),
('plus','plus','standard',400,4000,7),
('pro','pro','standard',799,7990,7),
('plus_existing','plus','existing',200,null,7),
('pro_existing','pro','existing',400,null,7),
('pro_founder','pro','founder',200,null,7)
on conflict (slug) do nothing;
create table if not exists public.tp_subscription_runtime (
 id integer primary key default 1 check(id=1),
 billing_enabled boolean not null default false,
 restrictions_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.tp_subscription_runtime enable row level security;
revoke all on public.tp_subscription_runtime from anon, authenticated;
insert into public.tp_subscription_runtime(id,billing_enabled,restrictions_enabled)
values(1,false,false) on conflict (id) do nothing;
