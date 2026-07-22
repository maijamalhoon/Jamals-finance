create or replace function private.resend_business_invitation_internal(p_business_id uuid,p_invitation_id uuid,p_expires_days integer)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private','extensions' as $$
declare invitation_record record; raw_token text; expiry timestamptz;
begin
 if auth.uid() is null or not private.can_manage_business_team(p_business_id) then raise exception 'Team management permission required.' using errcode='42501'; end if;
 if coalesce(p_expires_days,7) not between 1 and 30 then raise exception 'Invitation expiry must be 1 to 30 days.' using errcode='22023'; end if;
 select * into invitation_record from public.business_invitations where id=p_invitation_id and business_id=p_business_id and status in('pending','expired') for update;
 if not found then raise exception 'Invitation is unavailable for resend.' using errcode='P0002'; end if;
 if invitation_record.last_sent_at is not null and invitation_record.last_sent_at>now()-interval '60 seconds' then raise exception 'Please wait before resending this invitation.' using errcode='55000'; end if;
 if invitation_record.resend_count>=20 then raise exception 'Invitation resend limit reached. Cancel it and create a new invitation.' using errcode='54000'; end if;
 raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); expiry:=now()+make_interval(days=>coalesce(p_expires_days,7));
 update public.business_invitations set token_hash=encode(extensions.digest(raw_token,'sha256'),'hex'),status='pending',expires_at=expiry,delivery_status='pending',delivery_error=null,resend_count=resend_count+1,updated_at=now() where id=p_invitation_id;
 perform private.write_business_team_audit(p_business_id,'invitation_resent',null,p_invitation_id,to_jsonb(invitation_record),jsonb_build_object('email',invitation_record.email,'role',invitation_record.role,'expires_at',expiry),'{}'::jsonb);
 return jsonb_build_object('id',p_invitation_id,'email',invitation_record.email,'token',raw_token,'expires_at',expiry,'role',invitation_record.role);
end;$$;
