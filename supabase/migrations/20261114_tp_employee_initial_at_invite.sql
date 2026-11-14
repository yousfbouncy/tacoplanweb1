-- Configure employees before sending enterprise invitation.
-- Idempotent migration, applied to Supabase project dutgxjwfjtqxmqonnjlp.
alter table public.tp_company_invites
 add column if not exists employee_name text;
alter table public.tp_company_invites
 add column if not exists initial_settings jsonb not null default '{}'::jsonb;
alter table public.tp_company_members
 add column if not exists employee_name text;
alter table public.tp_driver_settings
 add column if not exists initial_config jsonb not null default '{}'::jsonb;
create index if not exists tp_invites_company_email
 on public.tp_company_invites(company_id, lower(email))
 where accepted_at is null and revoked_at is null;
-- Existing pending invitations remain intact and must be completed by
-- their company owner before the employee can finalize onboarding.
