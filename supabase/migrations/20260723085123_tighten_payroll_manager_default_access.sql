create or replace function private.can_view_business_payroll(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
select (select auth.uid()) is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id
    and membership.user_id=(select auth.uid())
    and membership.status='active'
    and business.status='active'
    and (
      membership.role in ('owner','admin','accountant')
      or '*'=any(membership.permissions)
      or 'payroll.view'=any(membership.permissions)
      or 'payroll.manage'=any(membership.permissions)
      or 'payroll.process'=any(membership.permissions)
      or 'payroll.pay'=any(membership.permissions)
    )
);
$$;

create or replace function private.can_process_business_payroll(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
select (select auth.uid()) is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id
    and membership.user_id=(select auth.uid())
    and membership.status='active'
    and business.status='active'
    and (
      membership.role in ('owner','admin','accountant')
      or '*'=any(membership.permissions)
      or 'payroll.process'=any(membership.permissions)
      or 'payroll.manage'=any(membership.permissions)
    )
);
$$;
