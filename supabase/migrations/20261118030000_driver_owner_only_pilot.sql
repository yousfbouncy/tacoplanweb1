-- Owner-only pilot. Never infer authorization from display names or caller-supplied email.
create table if not exists public.tp_driver_pilot_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 pro_access boolean not null default false,
 checkout_enabled boolean not null default false,
 verified_by text not null default 'owner_requested',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tp_driver_pilot_access enable row level security;
revoke all on public.tp_driver_pilot_access from anon, authenticated;
insert into public.tp_driver_pilot_access (user_id,enabled,pro_access,checkout_enabled)
select id,true,false,false from auth.users
where lower(email) in ('youssef.youssef15@gmail.com','yosf.bouncy@gmail.com')
on conflict (user_id) do update set enabled=true,pro_access=false,checkout_enabled=false,updated_at=now();
