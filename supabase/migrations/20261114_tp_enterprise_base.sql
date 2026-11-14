-- Empresas: una empresa por conductor y una función por usuario.
-- Configuración y revisiones permanecen fuera del acceso directo del cliente.
create extension if not exists citext with schema extensions;
create table if not exists public.tp_companies (
 id uuid primary key default gen_random_uuid(),name text not null,
 tax_id text,owner_user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),
 stripe_customer_id text unique,stripe_subscription_id text unique,plan_price_id text,
 subscription_status text not null default 'pending',trial_ends_at timestamptz,subscription_ends_at timestamptz
);
create table if not exists public.tp_company_members (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.tp_companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,username text not null,role text not null,
 active boolean not null default true,joined_at timestamptz not null default now(),
 unique(user_id),unique(username),unique(company_id,user_id)
);
create table if not exists public.tp_driver_settings (
 company_id uuid not null references public.tp_companies(id) on delete cascade,
 driver_id uuid not null references auth.users(id) on delete cascade,
 base_name text,workplace text,agreement text,effective_from date not null default current_date,
 diet_rates jsonb not null default '{}'::jsonb,plus_rates jsonb not null default '{}'::jsonb,
 payroll_terms jsonb not null default '{}'::jsonb,
 updated_by uuid references auth.users(id),updated_at timestamptz not null default now(),
 primary key(company_id,driver_id),foreign key (company_id,driver_id) references public.tp_company_members(company_id,user_id)
);
create table if not exists public.tp_company_invites (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.tp_companies(id) on delete cascade,
 email text not null,username text not null,role text not null,
 token_hash text not null unique,invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),expires_at timestamptz not null,accepted_at timestamptz,revoked_at timestamptz
);
create table if not exists public.tp_diet_reviews (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.tp_companies(id) on delete cascade,
 driver_id uuid not null references auth.users(id),jornada_id uuid not null,
 original_diet_type text,original_amount numeric(12,2) not null default 0,original_pluses jsonb not null default '[]'::jsonb,
 proposed_diet_type text,proposed_amount numeric(12,2),proposed_pluses jsonb,
 status text not null default 'pending_traffic',traffic_observation text,change_reason text,
 driver_observation text,driver_decision_at timestamptz,confirmed_at timestamptz,
 confirmed_by uuid references auth.users(id),updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(company_id,jornada_id),foreign key (company_id,driver_id) references public.tp_company_members(company_id,user_id)
);
create table if not exists public.tp_company_audit (
 id bigint generated always as identity primary key,company_id uuid not null references public.tp_companies(id) on delete cascade,
 actor_id uuid not null references auth.users(id),action text not null,entity text not null,entity_id text not null,
 before_data jsonb,after_data jsonb,reason text,created_at timestamptz not null default now()
);
create index if not exists tp_company_members_comp_role on public.tp_company_members(company_id,role) where active;
create index if not exists tp_diet_reviews_company_status on public.tp_diet_reviews(company_id,status);
create index if not exists tp_company_audit_company_created on public.tp_company_audit(company_id,created_at desc);
alter table public.tp_companies enable row level security;
alter table public.tp_company_members enable row level security;
alter table public.tp_driver_settings enable row level security;
alter table public.tp_company_invites enable row level security;
alter table public.tp_diet_reviews enable row level security;
alter table public.tp_company_audit enable row level security;
revoke all on public.tp_companies,public.tp_company_members,public.tp_driver_settings,public.tp_company_invites,public.tp_diet_reviews,public.tp_company_audit from anon,authenticated;
