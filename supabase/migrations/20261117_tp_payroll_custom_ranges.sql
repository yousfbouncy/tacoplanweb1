-- Free-form payroll closures. Preserve the original month column for legacy reports,
-- while retaining the exact date boundaries of every snapshot.
-- Postgres btree_gist enforces non-overlapping inclusive periods per employee,
-- including concurrent requests from different RRHH accounts.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

alter table public.tp_payroll_closures
  add column if not exists period_from date,
  add column if not exists period_to date;

-- Safely preserve snapshots from the former calendar-month-only workflow.
update public.tp_payroll_closures set
  period_from = coalesce(period_from, (month || '-01')::date),
  period_to = coalesce(period_to, ((month || '-01')::date + interval '1 month - 1 day')::date)
where period_from is null or period_to is null;

alter table public.tp_payroll_closures
  alter column period_from set not null,
  alter column period_to set not null,
  drop constraint if exists tp_payroll_closures_company_id_month_driver_id_key;

alter table public.tp_payroll_closures
  add constraint tp_payroll_period_valid check (period_from <= period_to),
  add constraint tp_payroll_period_no_overlap
    exclude using gist (company_id with =, driver_id with =,
                        daterange(period_from, period_to, '[]') with &&);

create index if not exists tp_payroll_company_period
  on public.tp_payroll_closures (company_id, period_from, period_to);

comment on column public.tp_payroll_closures.month is
  'Legacy reference month (first selected date). Real closure boundaries are period_from and period_to.';
