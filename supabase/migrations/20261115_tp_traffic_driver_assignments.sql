create table if not exists public.tp_traffic_driver_assignments(
 company_id uuid not null references public.tp_companies(id) on delete cascade,
 driver_id uuid not null references auth.users(id) on delete cascade,
 traffic_user_id uuid not null references auth.users(id) on delete cascade,
 assigned_by uuid not null references auth.users(id),
 assigned_at timestamptz not null default now(),
 primary key(company_id,driver_id),
 constraint tp_traffic_assignment_not_self check(driver_id<>traffic_user_id),
 constraint tp_traffic_assignment_driver_member foreign key(company_id,driver_id) references public.tp_company_members(company_id,user_id) on delete cascade,
 constraint tp_traffic_assignment_traffic_member foreign key(company_id,traffic_user_id) references public.tp_company_members(company_id,user_id) on delete cascade
);
create index if not exists tp_traffic_assignment_staff_idx on public.tp_traffic_driver_assignments(company_id,traffic_user_id);
alter table public.tp_traffic_driver_assignments enable row level security;
revoke all on public.tp_traffic_driver_assignments from anon,authenticated;
