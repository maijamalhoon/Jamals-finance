drop policy if exists business_branches_select on public.business_branches;
create policy business_branches_select
on public.business_branches
for select
to authenticated
using (
  private.can_view_business_branches(business_id)
  and (
    private.can_manage_business_branches(business_id)
    or private.has_business_branch_access(business_id, id, (select auth.uid()))
  )
);

drop policy if exists business_member_branch_access_select on public.business_member_branch_access;
create policy business_member_branch_access_select
on public.business_member_branch_access
for select
to authenticated
using (
  private.can_manage_business_branches(business_id)
  or user_id = (select auth.uid())
);
