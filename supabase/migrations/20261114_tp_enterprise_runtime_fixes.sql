-- Incremental fixes applied to the enterprise Supabase project.
-- Keep this migration idempotent so staging environments match production.
alter table public.tp_diet_reviews
  alter column jornada_id type text using jornada_id::text;
alter table public.tp_diet_reviews
  add column if not exists jornada_date date;
create table if not exists public.tp_payroll_closures (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.tp_companies(id) on delete cascade,
 month text not null check(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 driver_id uuid not null references auth.users(id),
 total_diets numeric(12,2) not null default 0,
 total_pluses numeric(12,2) not null default 0,
 confirmed_count integer not null default 0,
 pending_count integer not null default 0,
 disputed_count integer not null default 0,
 line_items jsonb not null default '[]'::jsonb,
 closed_by uuid not null references auth.users(id),
 closed_at timestamptz not null default now(),
 unique(company_id,month,driver_id),
 foreign key (company_id,driver_id) references public.tp_company_members(company_id,user_id)
);
create index if not exists tp_payroll_company_month on public.tp_payroll_closures(company_id,month);
alter table public.tp_payroll_closures enable row level security;
revoke all on public.tp_payroll_closures from anon,authenticated;
