create or replace function private.get_business_approvals_snapshot_internal(
  p_business_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid:=auth.uid();
  can_view_all boolean;
  can_request boolean;
  can_manage boolean;
  normalized_limit integer:=greatest(1,least(coalesce(p_limit,100),250));
begin
  can_view_all:=private.can_view_business_approvals(p_business_id);
  can_request:=private.can_request_business_approval(p_business_id);
  can_manage:=private.can_manage_business_approvals(p_business_id);
  if actor_id is null or not (can_view_all or can_request) then
    raise exception 'Approval workspace access required.' using errcode='42501';
  end if;
  return jsonb_build_object(
    'summary', jsonb_build_object(
      'pending', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='pending' and private.can_access_business_approval_request(request.id,actor_id)),
      'approved', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='approved' and private.can_access_business_approval_request(request.id,actor_id)),
      'rejected', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='rejected' and private.can_access_business_approval_request(request.id,actor_id)),
      'urgent', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='pending' and request.priority='urgent' and private.can_access_business_approval_request(request.id,actor_id)),
      'unassigned', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='pending' and request.assigned_to is null and private.can_access_business_approval_request(request.id,actor_id))
    ),
    'policies', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.active desc,row_data.module_key,row_data.action_key,row_data.name)
      from (
        select policy.id,policy.code,policy.name,policy.module_key,policy.action_key,policy.description,
               policy.branch_id,branch.name as branch_name,policy.min_amount,policy.max_amount,policy.currency,
               policy.required_approvals,policy.approver_permission,
               case when can_manage then policy.approver_user_id else null end as approver_user_id,
               case when can_manage then coalesce(nullif(btrim(approver.full_name),''),nullif(split_part(approver.email,'@',1),'')) else null end as approver_name,
               policy.active,policy.created_at,policy.updated_at
        from public.business_approval_policies policy
        left join public.business_branches branch on branch.id=policy.branch_id
        left join public.profiles approver on approver.id=policy.approver_user_id
        where policy.business_id=p_business_id
          and (can_view_all or policy.active)
          and (policy.branch_id is null or private.has_business_branch_access(p_business_id,policy.branch_id,actor_id))
      ) row_data
    ),'[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by
        case row_data.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
        row_data.created_at desc)
      from (
        select request.id,request.request_no,'APR-'||lpad(request.request_no::text,8,'0') as request_code,
               request.policy_id,policy.name as policy_name,request.branch_id,branch.name as branch_name,
               request.module_key,request.action_key,request.subject_type,request.subject_key,request.subject_label,
               request.title,request.description,request.amount,request.currency,request.priority,request.status,
               request.requested_by,request.requester_name,request.assigned_to,
               coalesce(nullif(btrim(assignee.full_name),''),nullif(split_part(assignee.email,'@',1),'')) as assigned_name,
               request.required_permission,request.required_approvals,request.approval_count,request.rejection_count,
               request.payload,request.resolved_by,request.resolved_at,request.created_at,request.updated_at
        from public.business_approval_requests request
        left join public.business_approval_policies policy on policy.id=request.policy_id
        left join public.business_branches branch on branch.id=request.branch_id
        left join public.profiles assignee on assignee.id=request.assigned_to
        where request.business_id=p_business_id
          and private.can_access_business_approval_request(request.id,actor_id)
        order by request.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'decisions', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select decision.id,decision.request_id,'APR-'||lpad(request.request_no::text,8,'0') as request_code,
               decision.actor_user_id,decision.actor_name,decision.decision,decision.comment,decision.created_at
        from public.business_approval_decisions decision
        join public.business_approval_requests request on request.id=decision.request_id
        where decision.business_id=p_business_id
          and private.can_access_business_approval_request(request.id,actor_id)
        order by decision.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'members', case when can_manage then coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.name,row_data.user_id)
      from (
        select membership.user_id,
               coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member') as name,
               profile.email,membership.role,membership.permissions,membership.branch_access_mode
        from public.business_members membership
        left join public.profiles profile on profile.id=membership.user_id
        where membership.business_id=p_business_id and membership.status='active'
          and (
            membership.role in ('owner','admin') or '*'=any(membership.permissions)
            or 'approvals.decide'=any(membership.permissions) or 'approvals.manage'=any(membership.permissions)
          )
      ) row_data
    ),'[]'::jsonb) else '[]'::jsonb end,
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object('id',branch.id,'code',branch.code,'name',branch.name,'is_primary',branch.is_primary) order by branch.is_primary desc,branch.name)
      from public.business_branches branch
      where branch.business_id=p_business_id and branch.status='active'
        and private.has_business_branch_access(p_business_id,branch.id,actor_id)
    ),'[]'::jsonb),
    'audit', case when can_view_all then coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select audit.id,audit.request_id,audit.policy_id,audit.actor_user_id,
               coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'System') as actor_name,
               audit.action,audit.metadata,audit.created_at
        from public.business_approval_audit_log audit
        left join public.profiles profile on profile.id=audit.actor_user_id
        where audit.business_id=p_business_id
        order by audit.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb) else '[]'::jsonb end,
    'capabilities', jsonb_build_object(
      'can_view_all',can_view_all,
      'can_request',can_request,
      'can_decide',private.can_decide_business_approval(p_business_id),
      'can_manage',can_manage
    )
  );
end;
$$;
