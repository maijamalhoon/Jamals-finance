create or replace function private.is_business_owner_for_initial_membership(
  p_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.businesses business
    where business.id = p_business_id
      and business.owner_user_id = auth.uid()
      and business.status = 'active'
  );
$$;

revoke execute on function private.is_business_owner_for_initial_membership(uuid)
  from public, anon;
grant execute on function private.is_business_owner_for_initial_membership(uuid)
  to authenticated;

drop policy if exists business_members_insert_initial_owner
  on public.business_members;

create policy business_members_insert_initial_owner
on public.business_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and invited_by = (select auth.uid())
  and private.is_business_owner_for_initial_membership(business_id)
);

comment on function private.is_business_owner_for_initial_membership(uuid) is
  'Narrow RLS helper that verifies the authenticated owner without recursively evaluating business membership policies.';