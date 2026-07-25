drop policy if exists "business_clients_update_own" on public.business_clients;
create policy "business_clients_update_own"
on public.business_clients
for update
to authenticated
using (auth.uid() = user_id)
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
