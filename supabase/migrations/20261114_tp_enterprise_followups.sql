alter table public.tp_diet_reviews alter column jornada_id type text using jornada_id::text;
create table if not exists public.tp_login_attempts (id bigint generated always as identity primary key,key_hash text not null,attempted_at timestamptz not null default now());
create index if not exists tp_login_attempts_lookup on public.tp_login_attempts(key_hash,attempted_at desc);
alter table public.tp_login_attempts enable row level security;
revoke all on public.tp_login_attempts from anon,authenticated;
