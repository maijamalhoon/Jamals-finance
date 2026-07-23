create or replace function private.decide_business_approval_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_decision text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  normalized_decision text := lower(btrim(coalesce(p_decision,'')));
  request_record public.business_approval_requests%rowtype;
  member_record public.business_members%rowtype;
  approvals_total integer;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if normalized_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.' using errcode='22023'; end if;
  select * into request_record
  from public.business_approval_requests
  where business_id=p_business_id and id=p_request_id
  for update;
  if not found then raise exception 'Approval request not found.' using errcode='P0002'; end if;
  if request_record.status<>'pending' then raise exception 'Approval request is already resolved.' using errcode='55000'; end if;
  if request_record.requested_by=actor_id then
    raise exception 'Requester cannot approve or reject their own request.' using errcode='42501';
  end if;
  if request_record.assigned_to is not null and request_record.assigned_to<>actor_id then
    raise exception 'This request is assigned to another approver.' using errcode='42501';
  end if;
  if request_record.branch_id is not null and not private.has_business_branch_access(p_business_id,request_record.branch_id,actor_id) then
    raise exception 'You cannot decide requests for this branch.' using errcode='42501';
  end if;
  select * into member_record from public.business_members
  where business_id=p_business_id and user_id=actor_id and status='active';
  if not found or not (
    member_record.role in ('owner','admin')
    or '*'=any(member_record.permissions)
    or request_record.required_permission=any(member_record.permissions)
    or 'approvals.decide'=any(member_record.permissions)
    or 'approvals.manage'=any(member_record.permissions)
  ) then raise exception 'Approval decision permission required.' using errcode='42501'; end if;
  if normalized_decision='rejected' and nullif(btrim(coalesce(p_comment,'')),'') is null then
    raise exception 'A rejection reason is required.' using errcode='22023';
  end if;
  select coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member')
  into actor_name from public.profiles profile where profile.id=actor_id;
  actor_name := coalesce(actor_name,'Team member');
  perform set_config('app.business_approval_action','decision_write',true);
  insert into public.business_approval_decisions(
    business_id,request_id,actor_user_id,actor_name,decision,comment
  ) values (
    p_business_id,p_request_id,actor_id,actor_name,normalized_decision,
    nullif(btrim(coalesce(p_comment,'')),'')
  );
  if normalized_decision='rejected' then
    perform set_config('app.business_approval_action','request_write',true);
    update public.business_approval_requests
    set rejection_count=rejection_count+1,status='rejected',resolved_by=actor_id,resolved_at=now()
    where id=p_request_id
    returning * into request_record;
  else
    select count(*) into approvals_total
    from public.business_approval_decisions
    where request_id=p_request_id and decision='approved';
    perform set_config('app.business_approval_action','request_write',true);
    update public.business_approval_requests
    set approval_count=approvals_total,
        status=case when approvals_total>=required_approvals then 'approved' else 'pending' end,
        assigned_to=case when approvals_total>=required_approvals then assigned_to else null end,
        resolved_by=case when approvals_total>=required_approvals then actor_id else null end,
        resolved_at=case when approvals_total>=required_approvals then now() else null end
    where id=p_request_id
    returning * into request_record;
  end if;
  perform private.write_business_approval_audit(
    p_business_id,p_request_id,request_record.policy_id,
    case when normalized_decision='approved' then 'request_approved' else 'request_rejected' end,
    jsonb_build_object(
      'approval_count',request_record.approval_count,
      'required_approvals',request_record.required_approvals,
      'status',request_record.status,
      'assignment_released',normalized_decision='approved' and request_record.status='pending'
    )
  );
  return to_jsonb(request_record) || jsonb_build_object('request_code','APR-'||lpad(request_record.request_no::text,8,'0'));
exception
  when unique_violation then
    raise exception 'You have already decided this request.' using errcode='23505';
end;
$$;
