drop policy if exists business_fiscal_periods_manage_accounting
  on public.business_fiscal_periods;

drop policy if exists business_chart_accounts_manage_accounting
  on public.business_chart_of_accounts;

create policy business_fiscal_periods_insert_manager
on public.business_fiscal_periods
for insert
to authenticated
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_fiscal_periods_update_manager
on public.business_fiscal_periods
for update
to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
)
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_fiscal_periods_delete_manager
on public.business_fiscal_periods
for delete
to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_chart_accounts_insert_manager
on public.business_chart_of_accounts
for insert
to authenticated
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_chart_accounts_update_manager
on public.business_chart_of_accounts
for update
to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
)
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_chart_accounts_delete_manager
on public.business_chart_of_accounts
for delete
to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);