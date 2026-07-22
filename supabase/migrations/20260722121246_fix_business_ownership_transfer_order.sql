create or replace function private.transfer_business_ownership_internal(p_business_id uuid,p_new_owner_user_id uuid)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare old_owner uuid:=auth.uid(); target record;
begin
 if old_owner is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id and owner_user_id=old_owner and status='active' for update) then raise exception 'Only the primary owner can transfer ownership.' using errcode='42501'; end if;
 if p_new_owner_user_id=old_owner then raise exception 'Select another active member.' using errcode='22023'; end if;
 select * into target from public.business_members where business_id=p_business_id and user_id=p_new_owner_user_id and status='active' for update;
 if not found then raise exception 'New owner must be an active team member.' using errcode='P0002'; end if;
 update public.businesses set owner_user_id=p_new_owner_user_id,updated_at=now() where id=p_business_id;
 update public.business_members set role='owner',permissions=array['*']::text[],status='active',updated_at=now() where business_id=p_business_id and user_id=p_new_owner_user_id;
 update public.business_members set role='admin',permissions=array_remove(permissions,'*'),updated_at=now() where business_id=p_business_id and user_id=old_owner;
 perform private.write_business_team_audit(p_business_id,'ownership_transferred',p_new_owner_user_id,null,jsonb_build_object('owner_user_id',old_owner),jsonb_build_object('owner_user_id',p_new_owner_user_id),jsonb_build_object('previous_owner_role','admin'));
 return jsonb_build_object('previous_owner_user_id',old_owner,'owner_user_id',p_new_owner_user_id);
end;$$;
