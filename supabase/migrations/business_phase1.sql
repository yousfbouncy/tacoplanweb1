create extension if not exists "pgcrypto";

create or replace function public.tacoplan_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  legal_name text not null,
  activity_type text not null,
  category text not null check (category in ('Comercio', 'Artesanía', 'Servicios', 'Transporte', 'Construcción', 'Profesión independiente', 'Otra')),
  fiscal_identifier text,
  autoentrepreneur_identifier text,
  phone text,
  email text,
  address text,
  city text,
  country text not null default 'Marruecos',
  currency text not null default 'MAD',
  invoice_language text not null default 'Francés' check (invoice_language in ('Francés', 'Árabe', 'Español')),
  logo_url text,
  invoice_prefix text not null default 'FAC',
  next_invoice_number integer not null default 1 check (next_invoice_number > 0),
  declaration_frequency text not null default 'Sin configurar' check (declaration_frequency in ('Mensual', 'Trimestral', 'Sin configurar')),
  estimated_tax_percentage numeric(5,2),
  calculate_tax boolean not null default true,
  timezone text not null default 'Africa/Casablanca',
  date_format text not null default 'dd/MM/yyyy',
  locale text not null default 'fr-MA',
  onboarding_completed boolean not null default false,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);

create table if not exists public.business_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete set null,
  name text not null,
  client_type text not null check (client_type in ('Particular', 'Empresa')),
  fiscal_identifier text,
  phone text,
  email text,
  address text,
  city text,
  country text,
  notes text,
  status text not null default 'Activo' check (status in ('Activo', 'Archivado')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.business_expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete set null,
  name text not null,
  description text,
  color text,
  is_system boolean not null default false,
  status text not null default 'Activa' check (status in ('Activa', 'Archivada')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.business_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete set null,
  name text not null,
  account_type text not null check (account_type in ('Caja en efectivo', 'Cuenta bancaria', 'Tarjeta', 'Cuenta móvil', 'Otra')),
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'MAD',
  opening_balance_date date not null default current_date,
  status text not null default 'Activa' check (status in ('Activa', 'Archivada')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.business_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists business_clients_user_name_unique_idx
  on public.business_clients (user_id, lower(name))
  where deleted_at is null;

create unique index if not exists business_expense_categories_user_name_unique_idx
  on public.business_expense_categories (user_id, lower(name))
  where deleted_at is null;

create unique index if not exists business_financial_accounts_user_name_unique_idx
  on public.business_financial_accounts (user_id, lower(name))
  where deleted_at is null;

create index if not exists business_clients_user_id_idx on public.business_clients (user_id);
create index if not exists business_clients_status_idx on public.business_clients (status);
create index if not exists business_clients_created_at_idx on public.business_clients (created_at desc);
create index if not exists business_expense_categories_user_id_idx on public.business_expense_categories (user_id);
create index if not exists business_financial_accounts_user_id_idx on public.business_financial_accounts (user_id);
create index if not exists business_financial_accounts_status_idx on public.business_financial_accounts (status);
create index if not exists business_audit_logs_user_id_idx on public.business_audit_logs (user_id);
create index if not exists business_audit_logs_created_at_idx on public.business_audit_logs (created_at desc);

drop trigger if exists trg_business_profiles_updated_at on public.business_profiles;
create trigger trg_business_profiles_updated_at
before update on public.business_profiles
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_clients_updated_at on public.business_clients;
create trigger trg_business_clients_updated_at
before update on public.business_clients
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_expense_categories_updated_at on public.business_expense_categories;
create trigger trg_business_expense_categories_updated_at
before update on public.business_expense_categories
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_financial_accounts_updated_at on public.business_financial_accounts;
create trigger trg_business_financial_accounts_updated_at
before update on public.business_financial_accounts
for each row execute function public.tacoplan_set_updated_at();

alter table public.business_profiles enable row level security;
alter table public.business_clients enable row level security;
alter table public.business_expense_categories enable row level security;
alter table public.business_financial_accounts enable row level security;
alter table public.business_audit_logs enable row level security;

drop policy if exists "business_profiles_select_own" on public.business_profiles;
create policy "business_profiles_select_own"
on public.business_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_profiles_insert_own" on public.business_profiles;
create policy "business_profiles_insert_own"
on public.business_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "business_profiles_update_own" on public.business_profiles;
create policy "business_profiles_update_own"
on public.business_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business_clients_select_own" on public.business_clients;
create policy "business_clients_select_own"
on public.business_clients
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_clients_insert_own" on public.business_clients;
create policy "business_clients_insert_own"
on public.business_clients
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    business_profile_id is null
    or exists (
      select 1
      from public.business_profiles profile
      where profile.id = business_profile_id
        and profile.user_id = auth.uid()
    )
  )
);

drop policy if exists "business_clients_update_own" on public.business_clients;
create policy "business_clients_update_own"
on public.business_clients
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business_expense_categories_select_own" on public.business_expense_categories;
create policy "business_expense_categories_select_own"
on public.business_expense_categories
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_expense_categories_insert_own" on public.business_expense_categories;
create policy "business_expense_categories_insert_own"
on public.business_expense_categories
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    business_profile_id is null
    or exists (
      select 1
      from public.business_profiles profile
      where profile.id = business_profile_id
        and profile.user_id = auth.uid()
    )
  )
);

drop policy if exists "business_expense_categories_update_own" on public.business_expense_categories;
create policy "business_expense_categories_update_own"
on public.business_expense_categories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business_financial_accounts_select_own" on public.business_financial_accounts;
create policy "business_financial_accounts_select_own"
on public.business_financial_accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_financial_accounts_insert_own" on public.business_financial_accounts;
create policy "business_financial_accounts_insert_own"
on public.business_financial_accounts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    business_profile_id is null
    or exists (
      select 1
      from public.business_profiles profile
      where profile.id = business_profile_id
        and profile.user_id = auth.uid()
    )
  )
);

drop policy if exists "business_financial_accounts_update_own" on public.business_financial_accounts;
create policy "business_financial_accounts_update_own"
on public.business_financial_accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business_audit_logs_select_own" on public.business_audit_logs;
create policy "business_audit_logs_select_own"
on public.business_audit_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_audit_logs_insert_own" on public.business_audit_logs;
create policy "business_audit_logs_insert_own"
on public.business_audit_logs
for insert
to authenticated
with check (auth.uid() = user_id);
