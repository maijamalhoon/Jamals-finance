create or replace function private.submit_business_payroll_run_internal(
  p_business_id uuid,
  p_run_id uuid,
  p_assigned_to uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  actor_id uuid:=auth.uid();
  run_record public.business_payroll_runs%rowtype;
  approval_record jsonb;
  request_id uuid;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then
    raise exception 'Payroll processing permission required.' using errcode='42501';
  end if;
  select * into run_record
  from public.business_payroll_runs
  where business_id=p_business_id and id=p_run_id
  for update;
  if not found then raise exception 'Payroll run not found.' using errcode='P0002'; end if;
  if run_record.status<>'draft' then
    raise exception 'Only draft payroll runs can be submitted.' using errcode='55000';
  end if;
  if run_record.employee_count<=0 or run_record.gross_total<=0 or run_record.net_total<0 then
    raise exception 'Calculate at least one valid employee before submission.' using errcode='22023';
  end if;
  perform private.validate_business_payroll_branch(p_business_id,run_record.branch_id,actor_id,true);
  approval_record:=private.create_business_approval_request_internal(
    p_business_id,
    'payroll',
    'approve_run',
    'payroll_run',
    run_record.id::text,
    'Payroll PAY-'||lpad(run_record.run_no::text,8,'0'),
    'Approve '||run_record.name,
    'Payroll period '||run_record.period_start::text||' to '||run_record.period_end::text||' for '||run_record.employee_count::text||' employee(s).',
    run_record.net_total,
    run_record.currency,
    'high',
    run_record.branch_id,
    null,
    p_assigned_to,
    jsonb_build_object(
      'payroll_run_id',run_record.id,
      'gross_total',run_record.gross_total,
      'deduction_total',run_record.deduction_total,
      'net_total',run_record.net_total,
      'employer_cost_total',run_record.employer_cost_total,
      'employee_count',run_record.employee_count,
      'period_start',run_record.period_start,
      'period_end',run_record.period_end,
      'pay_date',run_record.pay_date
    ),
    gen_random_uuid()
  );
  request_id:=(approval_record->>'id')::uuid;
  perform set_config('app.business_payroll_action','run_write',true);
  update public.business_payroll_runs
  set status='pending_approval',
      approval_request_id=request_id,
      submitted_by=actor_id,
      submitted_at=now(),
      approved_at=null
  where business_id=p_business_id and id=p_run_id
  returning * into run_record;
  perform private.write_business_payroll_audit(
    p_business_id,null,p_run_id,'payroll_run_submitted',
    jsonb_build_object('approval_request_id',request_id)
  );
  return to_jsonb(run_record)
    || jsonb_build_object(
      'run_code','PAY-'||lpad(run_record.run_no::text,8,'0'),
      'approval_request',approval_record
    );
end;
$$;

create or replace function private.sync_business_payroll_approval_request()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  run_id uuid;
  run_record public.business_payroll_runs%rowtype;
begin
  if new.module_key<>'payroll'
     or new.action_key<>'approve_run'
     or new.subject_type<>'payroll_run'
     or new.status=old.status then
    return new;
  end if;
  begin
    run_id:=new.subject_key::uuid;
  exception when invalid_text_representation then
    return new;
  end;
  select * into run_record
  from public.business_payroll_runs
  where business_id=new.business_id
    and id=run_id
    and approval_request_id=new.id
  for update;
  if not found or run_record.status<>'pending_approval' then return new; end if;
  perform set_config('app.business_payroll_action','run_write',true);
  if new.status='approved' then
    update public.business_payroll_runs
    set status='approved',approved_at=coalesce(new.resolved_at,now())
    where business_id=new.business_id and id=run_id;
    perform private.write_business_payroll_audit(
      new.business_id,null,run_id,'payroll_run_approved',
      jsonb_build_object('approval_request_id',new.id)
    );
  elsif new.status='rejected' then
    update public.business_payroll_runs
    set status='rejected',approved_at=null
    where business_id=new.business_id and id=run_id;
    perform private.write_business_payroll_audit(
      new.business_id,null,run_id,'payroll_run_rejected',
      jsonb_build_object('approval_request_id',new.id)
    );
  elsif new.status='cancelled' then
    update public.business_payroll_runs
    set status='cancelled',
        cancelled_by=new.resolved_by,
        cancelled_at=coalesce(new.resolved_at,now())
    where business_id=new.business_id and id=run_id;
    perform private.write_business_payroll_audit(
      new.business_id,null,run_id,'payroll_run_cancelled',
      jsonb_build_object('approval_request_id',new.id)
    );
  end if;
  return new;
end;
$$;

create trigger business_approval_requests_sync_payroll
after update of status on public.business_approval_requests
for each row execute function private.sync_business_payroll_approval_request();

create or replace function private.reopen_rejected_business_payroll_run_internal(
  p_business_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  actor_id uuid:=auth.uid();
  run_record public.business_payroll_runs%rowtype;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then
    raise exception 'Payroll processing permission required.' using errcode='42501';
  end if;
  select * into run_record
  from public.business_payroll_runs
  where business_id=p_business_id and id=p_run_id
  for update;
  if not found then raise exception 'Payroll run not found.' using errcode='P0002'; end if;
  if run_record.status<>'rejected' then
    raise exception 'Only rejected payroll runs can be reopened.' using errcode='55000';
  end if;
  perform private.validate_business_payroll_branch(p_business_id,run_record.branch_id,actor_id,true);
  perform set_config('app.business_payroll_action','run_write',true);
  update public.business_payroll_runs
  set status='draft',
      approval_request_id=null,
      submitted_by=null,
      submitted_at=null,
      approved_at=null
  where business_id=p_business_id and id=p_run_id
  returning * into run_record;
  perform private.write_business_payroll_audit(
    p_business_id,null,p_run_id,'payroll_run_reopened',
    jsonb_build_object('previous_status','rejected')
  );
  return to_jsonb(run_record)
    || jsonb_build_object('run_code','PAY-'||lpad(run_record.run_no::text,8,'0'));
end;
$$;

create or replace function private.cancel_business_payroll_run_internal(
  p_business_id uuid,
  p_run_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  actor_id uuid:=auth.uid();
  run_record public.business_payroll_runs%rowtype;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then
    raise exception 'Payroll processing permission required.' using errcode='42501';
  end if;
  select * into run_record
  from public.business_payroll_runs
  where business_id=p_business_id and id=p_run_id
  for update;
  if not found then raise exception 'Payroll run not found.' using errcode='P0002'; end if;
  if run_record.status in ('posted','paid','cancelled') then
    raise exception 'Posted, paid, or cancelled payroll runs cannot be cancelled here.' using errcode='55000';
  end if;
  perform private.validate_business_payroll_branch(p_business_id,run_record.branch_id,actor_id,true);
  if run_record.status='pending_approval' then
    perform private.cancel_business_approval_request_internal(
      p_business_id,run_record.approval_request_id,p_reason
    );
    select * into run_record
    from public.business_payroll_runs
    where business_id=p_business_id and id=p_run_id;
  else
    perform set_config('app.business_payroll_action','run_write',true);
    update public.business_payroll_runs
    set status='cancelled',cancelled_by=actor_id,cancelled_at=now()
    where business_id=p_business_id and id=p_run_id
    returning * into run_record;
    perform private.write_business_payroll_audit(
      p_business_id,null,p_run_id,'payroll_run_cancelled',
      jsonb_build_object('reason',nullif(btrim(coalesce(p_reason,'')),''))
    );
  end if;
  return to_jsonb(run_record)
    || jsonb_build_object('run_code','PAY-'||lpad(run_record.run_no::text,8,'0'));
end;
$$;

create or replace function private.get_business_payroll_snapshot_internal(
  p_business_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare
  actor_id uuid:=auth.uid();
  can_manage boolean;
  can_process boolean;
  can_pay boolean;
  normalized_limit integer:=greatest(1,least(coalesce(p_limit,100),250));
begin
  if actor_id is null or not private.can_view_business_payroll(p_business_id) then
    raise exception 'Payroll view permission required.' using errcode='42501';
  end if;
  can_manage:=private.can_manage_business_payroll(p_business_id);
  can_process:=private.can_process_business_payroll(p_business_id);
  can_pay:=private.can_pay_business_payroll(p_business_id);
  return jsonb_build_object(
    'summary',jsonb_build_object(
      'active_employees',(
        select count(*) from public.business_employees employee
        where employee.business_id=p_business_id and employee.status='active'
          and (employee.branch_id is null or private.has_business_branch_access(p_business_id,employee.branch_id,actor_id))
      ),
      'draft_runs',(
        select count(*) from public.business_payroll_runs run
        where run.business_id=p_business_id and run.status='draft'
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      ),
      'pending_runs',(
        select count(*) from public.business_payroll_runs run
        where run.business_id=p_business_id and run.status='pending_approval'
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      ),
      'approved_runs',(
        select count(*) from public.business_payroll_runs run
        where run.business_id=p_business_id and run.status='approved'
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      ),
      'unpaid_net',(
        select coalesce(sum(run.net_total),0) from public.business_payroll_runs run
        where run.business_id=p_business_id and run.status in ('approved','posted')
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      )
    ),
    'settings',(
      select to_jsonb(settings)
      from public.business_payroll_settings settings
      where settings.business_id=p_business_id
    ),
    'employees',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.status,row_data.employee_code)
      from (
        select employee.*
        from public.business_employees employee
        where employee.business_id=p_business_id
          and (employee.branch_id is null or private.has_business_branch_access(p_business_id,employee.branch_id,actor_id))
        order by employee.employee_code
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'components',coalesce((
      select jsonb_agg(to_jsonb(component) order by component.active desc,component.component_type,component.code)
      from public.business_pay_components component
      where component.business_id=p_business_id
    ),'[]'::jsonb),
    'employee_components',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.employee_id,row_data.component_code,row_data.effective_from)
      from (
        select assignment.*,
               component.code as component_code,
               component.name as component_name,
               component.component_type,
               component.calculation_type
        from public.business_employee_pay_components assignment
        join public.business_pay_components component
          on component.business_id=assignment.business_id and component.id=assignment.component_id
        join public.business_employees employee
          on employee.business_id=assignment.business_id and employee.id=assignment.employee_id
        where assignment.business_id=p_business_id
          and (employee.branch_id is null or private.has_business_branch_access(p_business_id,employee.branch_id,actor_id))
      ) row_data
    ),'[]'::jsonb),
    'runs',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.pay_date desc,row_data.run_no desc)
      from (
        select run.*,
               'PAY-'||lpad(run.run_no::text,8,'0') as run_code,
               approval.status as approval_status,
               branch.name as branch_name
        from public.business_payroll_runs run
        left join public.business_approval_requests approval on approval.id=run.approval_request_id
        left join public.business_branches branch on branch.id=run.branch_id
        where run.business_id=p_business_id
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
        order by run.pay_date desc,run.run_no desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'items',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.payroll_run_id,row_data.employee_code)
      from (
        select item.*
        from public.business_payroll_items item
        join public.business_payroll_runs run
          on run.business_id=item.business_id and run.id=item.payroll_run_id
        where item.business_id=p_business_id
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      ) row_data
    ),'[]'::jsonb),
    'lines',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.payroll_item_id,row_data.component_type,row_data.component_code)
      from (
        select line.*
        from public.business_payroll_item_lines line
        join public.business_payroll_items item
          on item.business_id=line.business_id and item.id=line.payroll_item_id
        join public.business_payroll_runs run
          on run.business_id=item.business_id and run.id=item.payroll_run_id
        where line.business_id=p_business_id
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      ) row_data
    ),'[]'::jsonb),
    'payments',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.payment_date desc)
      from (
        select payment.*
        from public.business_payroll_payments payment
        join public.business_payroll_runs run
          on run.business_id=payment.business_id and run.id=payment.payroll_run_id
        where payment.business_id=p_business_id
          and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))
      ) row_data
    ),'[]'::jsonb),
    'branches',coalesce((
      select jsonb_agg(
        jsonb_build_object('id',branch.id,'code',branch.code,'name',branch.name,'is_primary',branch.is_primary)
        order by branch.is_primary desc,branch.name
      )
      from public.business_branches branch
      where branch.business_id=p_business_id and branch.status='active'
        and private.has_business_branch_access(p_business_id,branch.id,actor_id)
    ),'[]'::jsonb),
    'members',case when can_manage then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id',membership.user_id,
          'name',coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member'),
          'email',profile.email,
          'role',membership.role
        ) order by profile.full_name,membership.user_id
      )
      from public.business_members membership
      left join public.profiles profile on profile.id=membership.user_id
      where membership.business_id=p_business_id and membership.status='active'
    ),'[]'::jsonb) else '[]'::jsonb end,
    'payment_accounts',case when can_pay then coalesce((
      select jsonb_agg(
        jsonb_build_object('id',account.id,'code',account.code,'name',account.name,'system_key',account.system_key)
        order by account.code
      )
      from public.business_chart_of_accounts account
      where account.business_id=p_business_id and account.active and account.system_key in ('cash','bank')
    ),'[]'::jsonb) else '[]'::jsonb end,
    'audit',coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select audit.*,
               coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'System') as actor_name
        from public.business_payroll_audit_log audit
        left join public.profiles profile on profile.id=audit.actor_user_id
        where audit.business_id=p_business_id
        order by audit.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'capabilities',jsonb_build_object(
      'can_manage',can_manage,
      'can_process',can_process,
      'can_pay',can_pay
    )
  );
end;
$$;

create or replace function public.submit_business_payroll_run(
  p_business_id uuid,p_run_id uuid,p_assigned_to uuid default null
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.submit_business_payroll_run_internal(p_business_id,p_run_id,p_assigned_to);$$;

create or replace function public.reopen_rejected_business_payroll_run(
  p_business_id uuid,p_run_id uuid
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.reopen_rejected_business_payroll_run_internal(p_business_id,p_run_id);$$;

create or replace function public.cancel_business_payroll_run(
  p_business_id uuid,p_run_id uuid,p_reason text default null
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.cancel_business_payroll_run_internal(p_business_id,p_run_id,p_reason);$$;

create or replace function public.get_business_payroll_snapshot(
  p_business_id uuid,p_limit integer default 100
)
returns jsonb language sql stable set search_path=pg_catalog,public,private
as $$select private.get_business_payroll_snapshot_internal(p_business_id,p_limit);$$;

revoke execute on function public.submit_business_payroll_run(uuid,uuid,uuid),
public.reopen_rejected_business_payroll_run(uuid,uuid),
public.cancel_business_payroll_run(uuid,uuid,text),
public.get_business_payroll_snapshot(uuid,integer)
from public,anon;

grant execute on function public.submit_business_payroll_run(uuid,uuid,uuid),
public.reopen_rejected_business_payroll_run(uuid,uuid),
public.cancel_business_payroll_run(uuid,uuid,text),
public.get_business_payroll_snapshot(uuid,integer)
to authenticated;
