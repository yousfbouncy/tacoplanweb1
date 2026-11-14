-- Restricted, revocable report links. Token hashes, never plaintext bearer tokens.
create table if not exists public.driver_report_shares (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique,
 date_from date not null,
 date_to date not null,
 fields text[] not null default array['date','route_type','diet_type']::text[],
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 constraint share_dates_valid check (date_to >= date_from and date_to <= date_from + 366),
 constraint share_expiry_valid check (expires_at > created_at and expires_at <= created_at + interval '31 days'),
 constraint share_fields_valid check (array_length(fields,1) between 1 and 12),
 constraint share_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$')
);
create index if not exists driver_report_shares_owner_idx on public.driver_report_shares(user_id,created_at desc);
create index if not exists driver_report_shares_expires_idx on public.driver_report_shares(expires_at);
alter table public.driver_report_shares enable row level security;
revoke all on public.driver_report_shares from anon,authenticated;
