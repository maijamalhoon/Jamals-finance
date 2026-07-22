create or replace function private.get_business_crm_members_internal(p_business_id uuid)
returns table(user_id uuid,display_name text,role text)
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_view_business_crm(p_business_id) then raise exception 'CRM access required.' using errcode='42501'; end if;
  return query
  select membership.user_id,
         coalesce(nullif(btrim(profile.full_name),''),'Team member')::text as display_name,
         membership.role
  from public.business_members membership
  left join public.profiles profile on profile.id=membership.user_id
  where membership.business_id=p_business_id and membership.status='active'
  order by coalesce(nullif(btrim(profile.full_name),''),'Team member'),membership.user_id;
end;
$$;

create or replace function public.get_business_crm_members(p_business_id uuid)
returns table(user_id uuid,display_name text,role text)
language sql
stable
security invoker
set search_path='pg_catalog','public','private'
as $$
select * from private.get_business_crm_members_internal(p_business_id);
$$;

revoke all on function private.get_business_crm_members_internal(uuid) from public,anon;
grant execute on function private.get_business_crm_members_internal(uuid) to authenticated,service_role;
revoke all on function public.get_business_crm_members(uuid) from public,anon;
grant execute on function public.get_business_crm_members(uuid) to authenticated,service_role;
