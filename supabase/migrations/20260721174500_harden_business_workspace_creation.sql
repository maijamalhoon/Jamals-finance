grant insert on table public.businesses to authenticated;
grant insert on table public.business_members to authenticated;

drop policy if exists businesses_insert_owner on public.businesses;
create policy businesses_insert_owner
on public.businesses
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

drop policy if exists business_members_insert_initial_owner
  on public.business_members;
create policy business_members_insert_initial_owner
on public.business_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and invited_by = (select auth.uid())
  and exists (
    select 1
    from public.businesses business
    where business.id = business_members.business_id
      and business.owner_user_id = (select auth.uid())
  )
);

alter function public.create_business_workspace(text, text, text, text, text)
  security invoker;

comment on function public.create_business_workspace(text, text, text, text, text) is
  'Atomically creates a business tenant through authenticated grants and RLS-enforced ownership.';
