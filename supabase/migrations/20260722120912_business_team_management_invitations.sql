create table public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null,
  permissions text[] not null default '{}'::text[],
  token_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  delivery_status text not null default 'pending',
  delivery_error text,
  last_sent_at timestamptz,
  resend_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_invitations_role_check check (role in ('admin','accountant','manager','sales','cashier','inventory','viewer')),
  constraint business_invitations_status_check check (status in ('pending','accepted','cancelled','expired')),
  constraint business_invitations_delivery_check check (delivery_status in ('pending','sent','failed','manual')),
  constraint business_invitations_email_check check (email=lower(btrim(email)) and char_length(email) between 3 and 320 and email like '%@%'),
  constraint business_invitations_expiry_check check (expires_at>created_at),
  constraint business_invitations_resend_check check (resend_count>=0)
);
create unique index business_invitations_pending_email_idx on public.business_invitations(business_id,email) where status='pending';
create index business_invitations_business_created_idx on public.business_invitations(business_id,created_at desc);
create index business_invitations_invited_by_idx on public.business_invitations(invited_by);
create index business_invitations_accepted_by_idx on public.business_invitations(accepted_by) where accepted_by is not null;
create index business_invitations_cancelled_by_idx on public.business_invitations(cancelled_by) where cancelled_by is not null;

create table public.business_team_audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  invitation_id uuid references public.business_invitations(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint business_team_audit_action_check check (action in ('invitation_created','invitation_sent','invitation_failed','invitation_resent','invitation_cancelled','invitation_accepted','member_updated','member_suspended','member_reactivated','member_revoked','ownership_transferred')),
  constraint business_team_audit_metadata_check check (jsonb_typeof(metadata)='object')
);
create index business_team_audit_business_created_idx on public.business_team_audit_log(business_id,created_at desc);
create index business_team_audit_actor_idx on public.business_team_audit_log(actor_user_id) where actor_user_id is not null;
create index business_team_audit_target_idx on public.business_team_audit_log(target_user_id) where target_user_id is not null;
create index business_team_audit_invitation_idx on public.business_team_audit_log(invitation_id) where invitation_id is not null;

create trigger business_invitations_updated_at before update on public.business_invitations for each row execute function private.set_business_workspace_updated_at();

create or replace function private.business_team_permission_catalog()
returns text[] language sql immutable security invoker set search_path='pg_catalog' as $$
select array[
 'team.view','team.manage','accounting.view','accounting.manage','contacts.view','contacts.manage',
 'sales.view','sales.manage','sales.collect','sales.return','purchases.view','purchases.manage','purchases.pay','purchases.return',
 'inventory.view','inventory.manage','inventory.transfer','inventory.adjust','crm.view','crm.manage','reports.view',
 'shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.normalize_business_team_permissions(p_permissions text[])
returns text[] language plpgsql immutable security invoker set search_path='pg_catalog','private' as $$
declare cleaned text[]; invalid_permission text;
begin
  select coalesce(array_agg(distinct lower(btrim(value)) order by lower(btrim(value))),'{}'::text[]) into cleaned
  from unnest(coalesce(p_permissions,'{}'::text[])) value where btrim(value)<>'';
  if '*'=any(cleaned) then raise exception 'Wildcard permission is reserved for the business owner.' using errcode='42501'; end if;
  select value into invalid_permission from unnest(cleaned) value where not (value=any(private.business_team_permission_catalog())) limit 1;
  if invalid_permission is not null then raise exception 'Unsupported team permission: %',invalid_permission using errcode='22023'; end if;
  return cleaned;
end;$$;

create or replace function private.can_view_business_team(p_business_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
select exists(select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and (m.role in('owner','admin','accountant','manager','viewer') or '*'=any(m.permissions) or 'team.view'=any(m.permissions) or 'team.manage'=any(m.permissions)));
$$;
create or replace function private.can_manage_business_team(p_business_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
select exists(select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and (m.role in('owner','admin') or '*'=any(m.permissions) or 'team.manage'=any(m.permissions)));
$$;

alter table public.business_invitations enable row level security;
alter table public.business_team_audit_log enable row level security;
revoke all on public.business_invitations,public.business_team_audit_log from public,anon,authenticated;
grant select on public.business_invitations,public.business_team_audit_log to authenticated,service_role;
grant all on public.business_invitations,public.business_team_audit_log to postgres,service_role;
create policy business_invitations_team_select on public.business_invitations for select to authenticated using ((select private.can_view_business_team(business_id)));
create policy business_team_audit_team_select on public.business_team_audit_log for select to authenticated using ((select private.can_view_business_team(business_id)));

create or replace function private.write_business_team_audit(p_business_id uuid,p_action text,p_target_user_id uuid,p_invitation_id uuid,p_before jsonb,p_after jsonb,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='pg_catalog','public' as $$
begin
 insert into public.business_team_audit_log(business_id,actor_user_id,action,target_user_id,invitation_id,before_state,after_state,metadata)
 values(p_business_id,auth.uid(),p_action,p_target_user_id,p_invitation_id,p_before,p_after,coalesce(p_metadata,'{}'::jsonb));
end;$$;

create or replace function private.get_business_team_snapshot_internal(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path='pg_catalog','public','private' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if not private.can_view_business_team(p_business_id) then raise exception 'Team access required.' using errcode='42501'; end if;
 select jsonb_build_object(
  'business',(select jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'workspace_mode',b.workspace_mode,'owner_user_id',b.owner_user_id) from public.businesses b where b.id=p_business_id),
  'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(nullif(p.full_name,''),split_part(coalesce(p.email,''),'@',1),'Team member'),'email',p.email,'role',m.role,'status',m.status,'permissions',m.permissions,'joined_at',m.joined_at,'created_at',m.created_at,'is_primary_owner',(b.owner_user_id=m.user_id)) order by (b.owner_user_id=m.user_id) desc,m.status,m.role,coalesce(p.full_name,p.email)) from public.business_members m join public.businesses b on b.id=m.business_id left join public.profiles p on p.id=m.user_id where m.business_id=p_business_id),'[]'::jsonb),
  'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'permissions',i.permissions,'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,'expires_at',i.expires_at,'delivery_status',i.delivery_status,'delivery_error',i.delivery_error,'last_sent_at',i.last_sent_at,'resend_count',i.resend_count,'created_at',i.created_at,'invited_by',i.invited_by) order by i.created_at desc) from public.business_invitations i where i.business_id=p_business_id),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(row_data order by row_data->>'created_at' desc) from (select jsonb_build_object('id',a.id,'action',a.action,'actor_user_id',a.actor_user_id,'actor_name',coalesce(ap.full_name,ap.email),'target_user_id',a.target_user_id,'target_name',coalesce(tp.full_name,tp.email),'invitation_id',a.invitation_id,'metadata',a.metadata,'created_at',a.created_at) row_data from public.business_team_audit_log a left join public.profiles ap on ap.id=a.actor_user_id left join public.profiles tp on tp.id=a.target_user_id where a.business_id=p_business_id order by a.created_at desc limit 100) q),'[]'::jsonb),
  'permission_catalog',to_jsonb(private.business_team_permission_catalog())
 ) into result;
 return result;
end;$$;
create or replace function public.get_business_team_snapshot(p_business_id uuid)
returns jsonb language sql stable security invoker set search_path='pg_catalog','public','private' as $$select private.get_business_team_snapshot_internal(p_business_id);$$;

create or replace function private.create_business_invitation_internal(p_business_id uuid,p_email text,p_role text,p_permissions text[],p_expires_days integer)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare current_user_id uuid:=auth.uid(); normalized_email text:=lower(btrim(coalesce(p_email,''))); normalized_role text:=lower(btrim(coalesce(p_role,''))); normalized_permissions text[]; raw_token text; invitation_uuid uuid; expiry timestamptz; owner_id uuid; inviter_role text; inviter_permissions text[]; existing_user uuid;
begin
 if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if not private.can_manage_business_team(p_business_id) then raise exception 'Team management permission required.' using errcode='42501'; end if;
 if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'A valid email address is required.' using errcode='22023'; end if;
 if normalized_role not in('admin','accountant','manager','sales','cashier','inventory','viewer') then raise exception 'Unsupported team role.' using errcode='22023'; end if;
 if coalesce(p_expires_days,7) not between 1 and 30 then raise exception 'Invitation expiry must be 1 to 30 days.' using errcode='22023'; end if;
 normalized_permissions:=private.normalize_business_team_permissions(p_permissions);
 select b.owner_user_id,m.role,m.permissions into owner_id,inviter_role,inviter_permissions from public.businesses b join public.business_members m on m.business_id=b.id and m.user_id=current_user_id and m.status='active' where b.id=p_business_id and b.status='active';
 if owner_id is null then raise exception 'Active business not found.' using errcode='P0002'; end if;
 if current_user_id<>owner_id and (normalized_role='admin' or 'team.manage'=any(normalized_permissions)) then raise exception 'Only the primary owner can grant administrative team access.' using errcode='42501'; end if;
 select p.id into existing_user from public.profiles p where lower(p.email)=normalized_email limit 1;
 if existing_user is not null and exists(select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=existing_user and m.status='active') then raise exception 'This user is already an active team member.' using errcode='23505'; end if;
 update public.business_invitations set status='expired',updated_at=now() where business_id=p_business_id and email=normalized_email and status='pending' and expires_at<=now();
 if exists(select 1 from public.business_invitations where business_id=p_business_id and email=normalized_email and status='pending') then raise exception 'A pending invitation already exists for this email.' using errcode='23505'; end if;
 raw_token:=encode(gen_random_bytes(32),'hex'); expiry:=now()+make_interval(days=>coalesce(p_expires_days,7));
 insert into public.business_invitations(business_id,email,role,permissions,token_hash,expires_at,invited_by) values(p_business_id,normalized_email,normalized_role,normalized_permissions,encode(digest(raw_token,'sha256'),'hex'),expiry,current_user_id) returning id into invitation_uuid;
 perform private.write_business_team_audit(p_business_id,'invitation_created',existing_user,invitation_uuid,null,jsonb_build_object('email',normalized_email,'role',normalized_role,'permissions',normalized_permissions,'expires_at',expiry),'{}'::jsonb);
 return jsonb_build_object('id',invitation_uuid,'email',normalized_email,'token',raw_token,'expires_at',expiry,'role',normalized_role);
end;$$;
create or replace function public.create_business_invitation(p_business_id uuid,p_email text,p_role text,p_permissions text[] default '{}'::text[],p_expires_days integer default 7)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private' as $$select private.create_business_invitation_internal(p_business_id,p_email,p_role,p_permissions,p_expires_days);$$;

create or replace function private.resend_business_invitation_internal(p_business_id uuid,p_invitation_id uuid,p_expires_days integer)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare invitation_record record; raw_token text; expiry timestamptz;
begin
 if auth.uid() is null or not private.can_manage_business_team(p_business_id) then raise exception 'Team management permission required.' using errcode='42501'; end if;
 if coalesce(p_expires_days,7) not between 1 and 30 then raise exception 'Invitation expiry must be 1 to 30 days.' using errcode='22023'; end if;
 select * into invitation_record from public.business_invitations where id=p_invitation_id and business_id=p_business_id and status in('pending','expired') for update;
 if not found then raise exception 'Invitation is unavailable for resend.' using errcode='P0002'; end if;
 raw_token:=encode(gen_random_bytes(32),'hex'); expiry:=now()+make_interval(days=>coalesce(p_expires_days,7));
 update public.business_invitations set token_hash=encode(digest(raw_token,'sha256'),'hex'),status='pending',expires_at=expiry,delivery_status='pending',delivery_error=null,resend_count=resend_count+1,updated_at=now() where id=p_invitation_id;
 perform private.write_business_team_audit(p_business_id,'invitation_resent',null,p_invitation_id,to_jsonb(invitation_record),jsonb_build_object('email',invitation_record.email,'role',invitation_record.role,'expires_at',expiry),'{}'::jsonb);
 return jsonb_build_object('id',p_invitation_id,'email',invitation_record.email,'token',raw_token,'expires_at',expiry,'role',invitation_record.role);
end;$$;
create or replace function public.resend_business_invitation(p_business_id uuid,p_invitation_id uuid,p_expires_days integer default 7)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private' as $$select private.resend_business_invitation_internal(p_business_id,p_invitation_id,p_expires_days);$$;

create or replace function private.set_business_invitation_delivery_internal(p_business_id uuid,p_invitation_id uuid,p_delivery_status text,p_error text)
returns void language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare next_status text:=lower(btrim(coalesce(p_delivery_status,'')));
begin
 if auth.uid() is null or not private.can_manage_business_team(p_business_id) then raise exception 'Team management permission required.' using errcode='42501'; end if;
 if next_status not in('sent','failed','manual') then raise exception 'Unsupported invitation delivery status.' using errcode='22023'; end if;
 update public.business_invitations set delivery_status=next_status,delivery_error=case when next_status='failed' then left(coalesce(p_error,'Delivery failed.'),500) else null end,last_sent_at=case when next_status in('sent','manual') then now() else last_sent_at end,updated_at=now() where id=p_invitation_id and business_id=p_business_id and status='pending';
 if not found then raise exception 'Pending invitation not found.' using errcode='P0002'; end if;
 perform private.write_business_team_audit(p_business_id,case when next_status='sent' then 'invitation_sent' when next_status='failed' then 'invitation_failed' else 'invitation_sent' end,null,p_invitation_id,null,jsonb_build_object('delivery_status',next_status),jsonb_build_object('error',case when next_status='failed' then left(coalesce(p_error,''),500) else null end));
end;$$;
create or replace function public.set_business_invitation_delivery(p_business_id uuid,p_invitation_id uuid,p_delivery_status text,p_error text default null)
returns void language sql security invoker set search_path='pg_catalog','public','private' as $$select private.set_business_invitation_delivery_internal(p_business_id,p_invitation_id,p_delivery_status,p_error);$$;

create or replace function private.cancel_business_invitation_internal(p_business_id uuid,p_invitation_id uuid)
returns void language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare old_record record;
begin
 if auth.uid() is null or not private.can_manage_business_team(p_business_id) then raise exception 'Team management permission required.' using errcode='42501'; end if;
 select * into old_record from public.business_invitations where id=p_invitation_id and business_id=p_business_id and status='pending' for update;
 if not found then raise exception 'Pending invitation not found.' using errcode='P0002'; end if;
 update public.business_invitations set status='cancelled',cancelled_by=auth.uid(),cancelled_at=now(),updated_at=now() where id=p_invitation_id;
 perform private.write_business_team_audit(p_business_id,'invitation_cancelled',null,p_invitation_id,to_jsonb(old_record),jsonb_build_object('status','cancelled'),'{}'::jsonb);
end;$$;
create or replace function public.cancel_business_invitation(p_business_id uuid,p_invitation_id uuid)
returns void language sql security invoker set search_path='pg_catalog','public','private' as $$select private.cancel_business_invitation_internal(p_business_id,p_invitation_id);$$;

create or replace function private.accept_business_invitation_internal(p_token text)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare current_user_id uuid:=auth.uid(); current_email text:=lower(coalesce(auth.jwt()->>'email','')); token_digest text:=encode(digest(coalesce(p_token,''),'sha256'),'hex'); invite record; business_slug text;
begin
 if current_user_id is null or current_email='' then raise exception 'Authenticated email is required.' using errcode='42501'; end if;
 select * into invite from public.business_invitations where token_hash=token_digest for update;
 if not found then raise exception 'Invitation token is invalid.' using errcode='P0002'; end if;
 if invite.status<>'pending' then raise exception 'Invitation is no longer pending.' using errcode='55000'; end if;
 if invite.expires_at<=now() then update public.business_invitations set status='expired',updated_at=now() where id=invite.id; raise exception 'Invitation has expired.' using errcode='22008'; end if;
 if current_email<>invite.email then raise exception 'Sign in with the invited email address.' using errcode='42501'; end if;
 insert into public.business_members(business_id,user_id,role,status,permissions,invited_by,joined_at) values(invite.business_id,current_user_id,invite.role,'active',invite.permissions,invite.invited_by,now())
 on conflict(business_id,user_id) do update set role=excluded.role,status='active',permissions=excluded.permissions,invited_by=excluded.invited_by,joined_at=coalesce(public.business_members.joined_at,now()),updated_at=now();
 update public.business_invitations set status='accepted',accepted_by=current_user_id,accepted_at=now(),updated_at=now() where id=invite.id;
 insert into public.business_workspace_preferences(user_id,default_workspace,active_business_id,onboarding_choice) values(current_user_id,'business',invite.business_id,'business') on conflict(user_id) do update set active_business_id=excluded.active_business_id,updated_at=now();
 select slug into business_slug from public.businesses where id=invite.business_id;
 perform private.write_business_team_audit(invite.business_id,'invitation_accepted',current_user_id,invite.id,jsonb_build_object('status','pending'),jsonb_build_object('status','accepted','role',invite.role,'permissions',invite.permissions),'{}'::jsonb);
 return jsonb_build_object('business_id',invite.business_id,'business_slug',business_slug,'role',invite.role);
end;$$;
create or replace function public.accept_business_invitation(p_token text)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private' as $$select private.accept_business_invitation_internal(p_token);$$;

create or replace function private.update_business_team_member_internal(p_business_id uuid,p_user_id uuid,p_role text,p_status text,p_permissions text[])
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare actor_id uuid:=auth.uid(); owner_id uuid; actor_role text; old_member record; normalized_role text:=lower(btrim(coalesce(p_role,''))); normalized_status text:=lower(btrim(coalesce(p_status,''))); normalized_permissions text[];
begin
 if actor_id is null or not private.can_manage_business_team(p_business_id) then raise exception 'Team management permission required.' using errcode='42501'; end if;
 select b.owner_user_id,m.role into owner_id,actor_role from public.businesses b join public.business_members m on m.business_id=b.id and m.user_id=actor_id and m.status='active' where b.id=p_business_id;
 if p_user_id=owner_id then raise exception 'Primary owner cannot be edited, suspended, or removed. Transfer ownership first.' using errcode='42501'; end if;
 select * into old_member from public.business_members where business_id=p_business_id and user_id=p_user_id for update;
 if not found then raise exception 'Team member not found.' using errcode='P0002'; end if;
 if normalized_role not in('admin','accountant','manager','sales','cashier','inventory','viewer') then raise exception 'Unsupported team role.' using errcode='22023'; end if;
 if normalized_status not in('active','suspended','revoked') then raise exception 'Unsupported membership status.' using errcode='22023'; end if;
 normalized_permissions:=private.normalize_business_team_permissions(p_permissions);
 if actor_id<>owner_id and (old_member.role='admin' or normalized_role='admin' or 'team.manage'=any(normalized_permissions)) then raise exception 'Only the primary owner can manage administrative access.' using errcode='42501'; end if;
 update public.business_members set role=normalized_role,status=normalized_status,permissions=normalized_permissions,joined_at=case when normalized_status='active' then coalesce(joined_at,now()) else joined_at end,updated_at=now() where business_id=p_business_id and user_id=p_user_id;
 if normalized_status<>'active' then update public.business_workspace_preferences set active_business_id=null,default_workspace='personal',updated_at=now() where user_id=p_user_id and active_business_id=p_business_id; end if;
 perform private.write_business_team_audit(p_business_id,case when normalized_status='suspended' then 'member_suspended' when normalized_status='revoked' then 'member_revoked' when old_member.status<>'active' and normalized_status='active' then 'member_reactivated' else 'member_updated' end,p_user_id,null,to_jsonb(old_member),jsonb_build_object('role',normalized_role,'status',normalized_status,'permissions',normalized_permissions),'{}'::jsonb);
 return jsonb_build_object('user_id',p_user_id,'role',normalized_role,'status',normalized_status,'permissions',normalized_permissions);
end;$$;
create or replace function public.update_business_team_member(p_business_id uuid,p_user_id uuid,p_role text,p_status text,p_permissions text[] default '{}'::text[])
returns jsonb language sql security invoker set search_path='pg_catalog','public','private' as $$select private.update_business_team_member_internal(p_business_id,p_user_id,p_role,p_status,p_permissions);$$;

create or replace function private.transfer_business_ownership_internal(p_business_id uuid,p_new_owner_user_id uuid)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare old_owner uuid:=auth.uid(); target record;
begin
 if old_owner is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id and owner_user_id=old_owner and status='active' for update) then raise exception 'Only the primary owner can transfer ownership.' using errcode='42501'; end if;
 if p_new_owner_user_id=old_owner then raise exception 'Select another active member.' using errcode='22023'; end if;
 select * into target from public.business_members where business_id=p_business_id and user_id=p_new_owner_user_id and status='active' for update;
 if not found then raise exception 'New owner must be an active team member.' using errcode='P0002'; end if;
 update public.business_members set role='owner',permissions=array['*']::text[],status='active',updated_at=now() where business_id=p_business_id and user_id=p_new_owner_user_id;
 update public.business_members set role='admin',permissions=array_remove(permissions,'*'),updated_at=now() where business_id=p_business_id and user_id=old_owner;
 update public.businesses set owner_user_id=p_new_owner_user_id,updated_at=now() where id=p_business_id;
 perform private.write_business_team_audit(p_business_id,'ownership_transferred',p_new_owner_user_id,null,jsonb_build_object('owner_user_id',old_owner),jsonb_build_object('owner_user_id',p_new_owner_user_id),jsonb_build_object('previous_owner_role','admin'));
 return jsonb_build_object('previous_owner_user_id',old_owner,'owner_user_id',p_new_owner_user_id);
end;$$;
create or replace function public.transfer_business_ownership(p_business_id uuid,p_new_owner_user_id uuid)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private' as $$select private.transfer_business_ownership_internal(p_business_id,p_new_owner_user_id);$$;

revoke all on function private.business_team_permission_catalog() from public,anon;
revoke all on function private.normalize_business_team_permissions(text[]) from public,anon;
revoke all on function private.can_view_business_team(uuid) from public,anon;
revoke all on function private.can_manage_business_team(uuid) from public,anon;
revoke all on function private.write_business_team_audit(uuid,text,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function private.get_business_team_snapshot_internal(uuid) from public,anon;
revoke all on function private.create_business_invitation_internal(uuid,text,text,text[],integer) from public,anon;
revoke all on function private.resend_business_invitation_internal(uuid,uuid,integer) from public,anon;
revoke all on function private.set_business_invitation_delivery_internal(uuid,uuid,text,text) from public,anon;
revoke all on function private.cancel_business_invitation_internal(uuid,uuid) from public,anon;
revoke all on function private.accept_business_invitation_internal(text) from public,anon;
revoke all on function private.update_business_team_member_internal(uuid,uuid,text,text,text[]) from public,anon;
revoke all on function private.transfer_business_ownership_internal(uuid,uuid) from public,anon;
grant execute on function private.business_team_permission_catalog(),private.normalize_business_team_permissions(text[]),private.can_view_business_team(uuid),private.can_manage_business_team(uuid),private.get_business_team_snapshot_internal(uuid),private.create_business_invitation_internal(uuid,text,text,text[],integer),private.resend_business_invitation_internal(uuid,uuid,integer),private.set_business_invitation_delivery_internal(uuid,uuid,text,text),private.cancel_business_invitation_internal(uuid,uuid),private.accept_business_invitation_internal(text),private.update_business_team_member_internal(uuid,uuid,text,text,text[]),private.transfer_business_ownership_internal(uuid,uuid) to authenticated,service_role;
grant execute on function private.write_business_team_audit(uuid,text,uuid,uuid,jsonb,jsonb,jsonb) to service_role;

revoke all on function public.get_business_team_snapshot(uuid),public.create_business_invitation(uuid,text,text,text[],integer),public.resend_business_invitation(uuid,uuid,integer),public.set_business_invitation_delivery(uuid,uuid,text,text),public.cancel_business_invitation(uuid,uuid),public.accept_business_invitation(text),public.update_business_team_member(uuid,uuid,text,text,text[]),public.transfer_business_ownership(uuid,uuid) from public,anon;
grant execute on function public.get_business_team_snapshot(uuid),public.create_business_invitation(uuid,text,text,text[],integer),public.resend_business_invitation(uuid,uuid,integer),public.set_business_invitation_delivery(uuid,uuid,text,text),public.cancel_business_invitation(uuid,uuid),public.accept_business_invitation(text),public.update_business_team_member(uuid,uuid,text,text,text[]),public.transfer_business_ownership(uuid,uuid) to authenticated,service_role;
