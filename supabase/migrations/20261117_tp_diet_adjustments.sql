-- Tráfico proposes changes to dated diet entries without mutating the driver's original records.
-- Deployed to Tacoplan Supabase on 2026-11-17. Idempotent for repeat environments.
create table if not exists public.tp_diet_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.tp_companies(id) on delete cascade,
  driver_id uuid not null references auth.users(id),
  target_kind text not null check (target_kind in ('jornada','natural_day','manual')),
  target_id text,
  diet_date date not null,
  operation text not null check (operation in ('add','edit','delete')),
  original_diet_type text,
  original_percentage int,
  proposed_diet_type text,
  proposed_percentage int,
  original_pluses jsonb not null default '[]'::jsonb,
  proposed_pluses jsonb not null default '[]'::jsonb,
  reason text not null,
  status text not null default 'awaiting_driver' check (status in ('awaiting_driver','accepted','disputed')),
  created_by uuid not null references auth.users(id),
  driver_observation text,
  driver_decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((target_kind='manual' and target_id is null) or (target_kind<>'manual' and target_id is not null)),
  check (original_percentage is null or original_percentage in (30,60,100)),
  check (proposed_percentage is null or proposed_percentage in (30,60,100)),
  foreign key (company_id,driver_id) references public.tp_company_members(company_id,user_id)
);
create index if not exists tp_diet_adjustments_driver_created on public.tp_diet_adjustments(company_id,driver_id,created_at desc);
alter table public.tp_diet_adjustments enable row level security;
revoke all on public.tp_diet_adjustments from anon,authenticated;
