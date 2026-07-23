create index business_payroll_settings_updated_by_idx on public.business_payroll_settings(updated_by);

create or replace function private.write_business_payroll_audit(
  p_business_id uuid,p_employee_id uuid,p_payroll_run_id uuid,p_action text,p_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$begin
  perform set_config('app.business_payroll_action','audit_write',true);
  insert into public.business_payroll_audit_log(business_id,employee_id,payroll_run_id,actor_user_id,action,metadata)
  values(p_business_id,p_employee_id,p_payroll_run_id,auth.uid(),p_action,coalesce(p_metadata,'{}'::jsonb));
end;$$;

create or replace function private.validate_business_payroll_branch(
  p_business_id uuid,p_branch_id uuid,p_user_id uuid,p_require_access boolean default true
)
returns void language plpgsql stable security definer set search_path=pg_catalog,public,private
as $$begin
  if p_branch_id is null then return;end if;
  if not exists(select 1 from public.business_branches branch where branch.business_id=p_business_id and branch.id=p_branch_id and branch.status='active') then
    raise exception 'Payroll branch is unavailable.' using errcode='22023';
  end if;
  if p_require_access and not private.has_business_branch_access(p_business_id,p_branch_id,p_user_id) then
    raise exception 'You cannot access payroll for this branch.' using errcode='42501';
  end if;
end;$$;

create or replace function private.upsert_business_employee_internal(
  p_business_id uuid,p_employee_id uuid,p_employee_code text,p_display_name text,p_member_user_id uuid default null,p_branch_id uuid default null,
  p_email text default null,p_phone text default null,p_job_title text default null,p_department text default null,p_hire_date date default current_date,
  p_termination_date date default null,p_status text default 'active',p_pay_frequency text default 'monthly',p_base_pay numeric default 0,p_currency text default null,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();v_currency text;normalized_status text:=lower(btrim(coalesce(p_status,'active')));employee_record public.business_employees%rowtype;
begin
  if actor_id is null or not private.can_manage_business_payroll(p_business_id) then raise exception 'Payroll management permission required.' using errcode='42501';end if;
  select business.base_currency into v_currency from public.businesses business where business.id=p_business_id and business.status='active';
  if v_currency is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  if p_currency is not null and upper(btrim(p_currency))<>v_currency then raise exception 'Employee payroll currency must match the business base currency.' using errcode='22023';end if;
  perform private.validate_business_payroll_branch(p_business_id,p_branch_id,actor_id,true);
  if p_member_user_id is not null and not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=p_member_user_id and membership.status='active') then
    raise exception 'Linked user must be an active business member.' using errcode='22023';
  end if;
  if normalized_status='terminated' and p_termination_date is null then raise exception 'Termination date is required for a terminated employee.' using errcode='22023';end if;
  perform set_config('app.business_payroll_action','employee_write',true);
  if p_employee_id is null then
    insert into public.business_employees(
      business_id,employee_code,display_name,member_user_id,branch_id,email,phone,job_title,department,hire_date,termination_date,status,pay_frequency,base_pay,currency,notes,created_by,updated_by
    ) values(
      p_business_id,upper(btrim(p_employee_code)),btrim(p_display_name),p_member_user_id,p_branch_id,nullif(lower(btrim(coalesce(p_email,''))),''),
      nullif(btrim(coalesce(p_phone,'')),''),nullif(btrim(coalesce(p_job_title,'')),''),nullif(btrim(coalesce(p_department,'')),''),p_hire_date,p_termination_date,
      normalized_status,lower(btrim(p_pay_frequency)),coalesce(p_base_pay,0),v_currency,nullif(btrim(coalesce(p_notes,'')),''),actor_id,actor_id
    ) returning * into employee_record;
    perform private.write_business_payroll_audit(p_business_id,employee_record.id,null,'employee_created',jsonb_build_object('employee_code',employee_record.employee_code,'branch_id',employee_record.branch_id,'status',employee_record.status));
  else
    update public.business_employees set
      employee_code=upper(btrim(p_employee_code)),display_name=btrim(p_display_name),member_user_id=p_member_user_id,branch_id=p_branch_id,
      email=nullif(lower(btrim(coalesce(p_email,''))),''),phone=nullif(btrim(coalesce(p_phone,'')),''),job_title=nullif(btrim(coalesce(p_job_title,'')),''),
      department=nullif(btrim(coalesce(p_department,'')),''),hire_date=p_hire_date,termination_date=p_termination_date,status=normalized_status,
      pay_frequency=lower(btrim(p_pay_frequency)),base_pay=coalesce(p_base_pay,0),currency=v_currency,notes=nullif(btrim(coalesce(p_notes,'')),''),updated_by=actor_id
    where business_id=p_business_id and id=p_employee_id returning * into employee_record;
    if not found then raise exception 'Employee not found.' using errcode='P0002';end if;
    perform private.write_business_payroll_audit(p_business_id,employee_record.id,null,'employee_updated',jsonb_build_object('employee_code',employee_record.employee_code,'branch_id',employee_record.branch_id,'status',employee_record.status));
  end if;
  return to_jsonb(employee_record);
exception when unique_violation then raise exception 'Employee code or linked business member is already in use.' using errcode='23505';
end;$$;

create or replace function private.upsert_business_pay_component_internal(
  p_business_id uuid,p_component_id uuid,p_code text,p_name text,p_component_type text,p_calculation_type text,
  p_default_amount numeric default null,p_default_rate numeric default null,p_taxable boolean default false,p_active boolean default true
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();component_record public.business_pay_components%rowtype;
begin
  if actor_id is null or not private.can_manage_business_payroll(p_business_id) then raise exception 'Payroll management permission required.' using errcode='42501';end if;
  perform set_config('app.business_payroll_action','component_write',true);
  if p_component_id is null then
    insert into public.business_pay_components(business_id,code,name,component_type,calculation_type,default_amount,default_rate,taxable,active,created_by,updated_by)
    values(p_business_id,upper(btrim(p_code)),btrim(p_name),lower(btrim(p_component_type)),lower(btrim(p_calculation_type)),p_default_amount,p_default_rate,coalesce(p_taxable,false),coalesce(p_active,true),actor_id,actor_id)
    returning * into component_record;
    perform private.write_business_payroll_audit(p_business_id,null,null,'component_created',jsonb_build_object('component_id',component_record.id,'code',component_record.code,'type',component_record.component_type));
  else
    update public.business_pay_components set code=upper(btrim(p_code)),name=btrim(p_name),component_type=lower(btrim(p_component_type)),calculation_type=lower(btrim(p_calculation_type)),
      default_amount=p_default_amount,default_rate=p_default_rate,taxable=coalesce(p_taxable,false),active=coalesce(p_active,true),updated_by=actor_id
    where business_id=p_business_id and id=p_component_id returning * into component_record;
    if not found then raise exception 'Pay component not found.' using errcode='P0002';end if;
    perform private.write_business_payroll_audit(p_business_id,null,null,'component_updated',jsonb_build_object('component_id',component_record.id,'code',component_record.code,'type',component_record.component_type,'active',component_record.active));
  end if;
  return to_jsonb(component_record);
exception when unique_violation then raise exception 'Pay component code is already in use.' using errcode='23505';
end;$$;

create or replace function private.upsert_business_employee_component_internal(
  p_business_id uuid,p_assignment_id uuid,p_employee_id uuid,p_component_id uuid,p_amount_override numeric default null,p_rate_override numeric default null,
  p_active boolean default true,p_effective_from date default current_date,p_effective_to date default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();employee_record public.business_employees%rowtype;component_record public.business_pay_components%rowtype;assignment_record public.business_employee_pay_components%rowtype;
begin
  if actor_id is null or not private.can_manage_business_payroll(p_business_id) then raise exception 'Payroll management permission required.' using errcode='42501';end if;
  select * into employee_record from public.business_employees where business_id=p_business_id and id=p_employee_id;
  if not found then raise exception 'Employee not found.' using errcode='P0002';end if;
  perform private.validate_business_payroll_branch(p_business_id,employee_record.branch_id,actor_id,true);
  select * into component_record from public.business_pay_components where business_id=p_business_id and id=p_component_id;
  if not found then raise exception 'Pay component not found.' using errcode='P0002';end if;
  if component_record.calculation_type='fixed' and p_rate_override is not null then raise exception 'Fixed components cannot use a rate override.' using errcode='22023';end if;
  if component_record.calculation_type='percentage' and p_amount_override is not null then raise exception 'Percentage components cannot use an amount override.' using errcode='22023';end if;
  perform set_config('app.business_payroll_action','assignment_write',true);
  if p_assignment_id is null then
    insert into public.business_employee_pay_components(business_id,employee_id,component_id,amount_override,rate_override,active,effective_from,effective_to,created_by,updated_by)
    values(p_business_id,p_employee_id,p_component_id,p_amount_override,p_rate_override,coalesce(p_active,true),p_effective_from,p_effective_to,actor_id,actor_id)
    returning * into assignment_record;
  else
    update public.business_employee_pay_components set employee_id=p_employee_id,component_id=p_component_id,amount_override=p_amount_override,rate_override=p_rate_override,
      active=coalesce(p_active,true),effective_from=p_effective_from,effective_to=p_effective_to,updated_by=actor_id
    where business_id=p_business_id and id=p_assignment_id returning * into assignment_record;
    if not found then raise exception 'Employee pay assignment not found.' using errcode='P0002';end if;
  end if;
  perform private.write_business_payroll_audit(p_business_id,p_employee_id,null,case when p_assignment_id is null then 'employee_component_created' else 'employee_component_updated' end,
    jsonb_build_object('assignment_id',assignment_record.id,'component_id',p_component_id,'active',assignment_record.active));
  return to_jsonb(assignment_record);
exception when unique_violation then raise exception 'This component already has an assignment starting on that date.' using errcode='23505';
end;$$;

create or replace function private.create_business_payroll_run_internal(
  p_business_id uuid,p_name text,p_pay_frequency text,p_period_start date,p_period_end date,p_pay_date date,p_branch_id uuid default null,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();v_currency text;run_record public.business_payroll_runs%rowtype;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then raise exception 'Payroll processing permission required.' using errcode='42501';end if;
  select business.base_currency into v_currency from public.businesses business where business.id=p_business_id and business.status='active';
  if v_currency is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  perform private.validate_business_payroll_branch(p_business_id,p_branch_id,actor_id,true);
  perform private.ensure_business_payroll_foundation(p_business_id,actor_id);
  perform set_config('app.business_payroll_action','run_write',true);
  insert into public.business_payroll_runs(business_id,branch_id,name,pay_frequency,period_start,period_end,pay_date,currency,notes,created_by)
  values(p_business_id,p_branch_id,btrim(p_name),lower(btrim(p_pay_frequency)),p_period_start,p_period_end,p_pay_date,v_currency,nullif(btrim(coalesce(p_notes,'')),''),actor_id)
  returning * into run_record;
  perform private.write_business_payroll_audit(p_business_id,null,run_record.id,'payroll_run_created',jsonb_build_object('run_no',run_record.run_no,'branch_id',run_record.branch_id,'period_start',run_record.period_start,'period_end',run_record.period_end));
  return to_jsonb(run_record)||jsonb_build_object('run_code','PAY-'||lpad(run_record.run_no::text,8,'0'));
exception when unique_violation then raise exception 'An open payroll run already exists for this branch, frequency, and period.' using errcode='23505';
end;$$;

create or replace function private.refresh_business_payroll_totals(p_business_id uuid,p_run_id uuid)
returns public.business_payroll_runs language plpgsql security definer set search_path=pg_catalog,public
as $$
declare run_record public.business_payroll_runs%rowtype;
begin
  perform set_config('app.business_payroll_action','run_write',true);
  update public.business_payroll_runs run set gross_total=coalesce(summary.gross_total,0),deduction_total=coalesce(summary.deduction_total,0),net_total=coalesce(summary.net_total,0),
    employer_cost_total=coalesce(summary.employer_cost_total,0),employee_count=coalesce(summary.employee_count,0)
  from(select count(*)::integer employee_count,coalesce(sum(gross_pay),0) gross_total,coalesce(sum(deduction_total),0) deduction_total,
    coalesce(sum(net_pay),0) net_total,coalesce(sum(employer_cost_total),0) employer_cost_total
    from public.business_payroll_items where business_id=p_business_id and payroll_run_id=p_run_id)summary
  where run.business_id=p_business_id and run.id=p_run_id returning run.* into run_record;
  if not found then raise exception 'Payroll run not found.' using errcode='P0002';end if;
  return run_record;
end;$$;

create or replace function private.recalculate_business_payroll_item(p_business_id uuid,p_item_id uuid)
returns public.business_payroll_items language plpgsql security definer set search_path=pg_catalog,public
as $$
declare item_record public.business_payroll_items%rowtype;base_amount numeric;earning_amount numeric;deduction_amount numeric;employer_amount numeric;
begin
  select coalesce(sum(amount),0) into base_amount from public.business_payroll_item_lines where business_id=p_business_id and payroll_item_id=p_item_id and component_type='base';
  select coalesce(sum(amount),0) into earning_amount from public.business_payroll_item_lines where business_id=p_business_id and payroll_item_id=p_item_id and component_type='earning';
  select coalesce(sum(amount),0) into deduction_amount from public.business_payroll_item_lines where business_id=p_business_id and payroll_item_id=p_item_id and component_type='deduction';
  select coalesce(sum(amount),0) into employer_amount from public.business_payroll_item_lines where business_id=p_business_id and payroll_item_id=p_item_id and component_type='employer_cost';
  if deduction_amount>base_amount+earning_amount then raise exception 'Payroll deductions cannot exceed gross pay.' using errcode='22023';end if;
  perform set_config('app.business_payroll_action','item_write',true);
  update public.business_payroll_items set base_pay=base_amount,earnings_total=earning_amount,gross_pay=base_amount+earning_amount,
    deduction_total=deduction_amount,net_pay=base_amount+earning_amount-deduction_amount,employer_cost_total=employer_amount
  where business_id=p_business_id and id=p_item_id returning * into item_record;
  if not found then raise exception 'Payroll item not found.' using errcode='P0002';end if;
  perform private.refresh_business_payroll_totals(p_business_id,item_record.payroll_run_id);
  return item_record;
end;$$;

create or replace function private.recalculate_business_payroll_run_internal(p_business_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();run_record public.business_payroll_runs%rowtype;employee_record record;assignment_record record;item_id uuid;line_amount numeric;line_rate numeric;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then raise exception 'Payroll processing permission required.' using errcode='42501';end if;
  select * into run_record from public.business_payroll_runs where business_id=p_business_id and id=p_run_id for update;
  if not found then raise exception 'Payroll run not found.' using errcode='P0002';end if;
  if run_record.status<>'draft' then raise exception 'Only draft payroll runs can be recalculated.' using errcode='55000';end if;
  perform private.validate_business_payroll_branch(p_business_id,run_record.branch_id,actor_id,true);
  perform set_config('app.business_payroll_action','line_write',true);
  delete from public.business_payroll_item_lines where business_id=p_business_id and payroll_item_id in(select id from public.business_payroll_items where business_id=p_business_id and payroll_run_id=p_run_id);
  perform set_config('app.business_payroll_action','item_write',true);
  delete from public.business_payroll_items where business_id=p_business_id and payroll_run_id=p_run_id;
  for employee_record in
    select employee.* from public.business_employees employee
    where employee.business_id=p_business_id and employee.pay_frequency=run_record.pay_frequency and employee.currency=run_record.currency
      and employee.hire_date<=run_record.period_end and (employee.termination_date is null or employee.termination_date>=run_record.period_start)
      and employee.status in ('active','terminated') and (run_record.branch_id is null or employee.branch_id=run_record.branch_id)
      and (employee.branch_id is null or private.has_business_branch_access(p_business_id,employee.branch_id,actor_id))
    order by employee.employee_code
  loop
    perform set_config('app.business_payroll_action','item_write',true);
    insert into public.business_payroll_items(business_id,payroll_run_id,employee_id,employee_code,employee_name,branch_id,base_pay,earnings_total,gross_pay,deduction_total,net_pay,employer_cost_total)
    values(p_business_id,p_run_id,employee_record.id,employee_record.employee_code,employee_record.display_name,employee_record.branch_id,employee_record.base_pay,0,employee_record.base_pay,0,employee_record.base_pay,0)
    returning id into item_id;
    perform set_config('app.business_payroll_action','line_write',true);
    insert into public.business_payroll_item_lines(business_id,payroll_item_id,component_id,component_code,component_name,component_type,calculation_type,basis_amount,rate,amount)
    values(p_business_id,item_id,null,'BASE','Base pay','base','fixed',employee_record.base_pay,null,employee_record.base_pay);
    for assignment_record in
      select assignment.*,component.code,component.name,component.component_type,component.calculation_type,component.default_amount,component.default_rate
      from public.business_employee_pay_components assignment
      join public.business_pay_components component on component.business_id=assignment.business_id and component.id=assignment.component_id
      where assignment.business_id=p_business_id and assignment.employee_id=employee_record.id and assignment.active and component.active
        and assignment.effective_from<=run_record.period_end and (assignment.effective_to is null or assignment.effective_to>=run_record.period_start)
      order by component.code
    loop
      if assignment_record.calculation_type='fixed' then line_rate:=null;line_amount:=coalesce(assignment_record.amount_override,assignment_record.default_amount,0);
      else line_rate:=coalesce(assignment_record.rate_override,assignment_record.default_rate,0);line_amount:=round(employee_record.base_pay*line_rate/100,4);end if;
      perform set_config('app.business_payroll_action','line_write',true);
      insert into public.business_payroll_item_lines(business_id,payroll_item_id,component_id,component_code,component_name,component_type,calculation_type,basis_amount,rate,amount)
      values(p_business_id,item_id,assignment_record.component_id,assignment_record.code,assignment_record.name,assignment_record.component_type,assignment_record.calculation_type,employee_record.base_pay,line_rate,line_amount);
    end loop;
    perform private.recalculate_business_payroll_item(p_business_id,item_id);
  end loop;
  run_record:=private.refresh_business_payroll_totals(p_business_id,p_run_id);
  perform private.write_business_payroll_audit(p_business_id,null,p_run_id,'payroll_run_recalculated',jsonb_build_object('employee_count',run_record.employee_count,'gross_total',run_record.gross_total,'net_total',run_record.net_total));
  return to_jsonb(run_record)||jsonb_build_object('run_code','PAY-'||lpad(run_record.run_no::text,8,'0'));
end;$$;

create or replace function private.upsert_business_payroll_adjustment_internal(
  p_business_id uuid,p_payroll_item_id uuid,p_line_id uuid,p_code text,p_name text,p_component_type text,p_amount numeric
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();run_record public.business_payroll_runs%rowtype;line_record public.business_payroll_item_lines%rowtype;item_record public.business_payroll_items%rowtype;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then raise exception 'Payroll processing permission required.' using errcode='42501';end if;
  select run.* into run_record from public.business_payroll_items item join public.business_payroll_runs run on run.business_id=item.business_id and run.id=item.payroll_run_id
  where item.business_id=p_business_id and item.id=p_payroll_item_id for update of run;
  if not found then raise exception 'Payroll item not found.' using errcode='P0002';end if;
  if run_record.status<>'draft' then raise exception 'Only draft payroll runs can be adjusted.' using errcode='55000';end if;
  perform private.validate_business_payroll_branch(p_business_id,run_record.branch_id,actor_id,true);
  if lower(btrim(p_component_type)) not in ('earning','deduction','employer_cost') then raise exception 'Adjustment type must be earning, deduction, or employer cost.' using errcode='22023';end if;
  perform set_config('app.business_payroll_action','line_write',true);
  if p_line_id is null then
    insert into public.business_payroll_item_lines(business_id,payroll_item_id,component_id,component_code,component_name,component_type,calculation_type,basis_amount,rate,amount)
    values(p_business_id,p_payroll_item_id,null,upper(btrim(p_code)),btrim(p_name),lower(btrim(p_component_type)),'fixed',0,null,coalesce(p_amount,0)) returning * into line_record;
  else
    update public.business_payroll_item_lines set component_code=upper(btrim(p_code)),component_name=btrim(p_name),component_type=lower(btrim(p_component_type)),
      calculation_type='fixed',basis_amount=0,rate=null,amount=coalesce(p_amount,0)
    where business_id=p_business_id and id=p_line_id and payroll_item_id=p_payroll_item_id and component_id is null and component_type<>'base'
    returning * into line_record;
    if not found then raise exception 'Manual payroll adjustment not found.' using errcode='P0002';end if;
  end if;
  item_record:=private.recalculate_business_payroll_item(p_business_id,p_payroll_item_id);
  perform private.write_business_payroll_audit(p_business_id,item_record.employee_id,item_record.payroll_run_id,case when p_line_id is null then 'payroll_adjustment_created' else 'payroll_adjustment_updated' end,
    jsonb_build_object('line_id',line_record.id,'type',line_record.component_type,'amount',line_record.amount));
  return jsonb_build_object('line',to_jsonb(line_record),'item',to_jsonb(item_record));
end;$$;

create or replace function private.delete_business_payroll_adjustment_internal(p_business_id uuid,p_line_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor_id uuid:=auth.uid();line_record public.business_payroll_item_lines%rowtype;run_record public.business_payroll_runs%rowtype;item_record public.business_payroll_items%rowtype;
begin
  if actor_id is null or not private.can_process_business_payroll(p_business_id) then raise exception 'Payroll processing permission required.' using errcode='42501';end if;
  select line.* into line_record from public.business_payroll_item_lines line where line.business_id=p_business_id and line.id=p_line_id;
  if not found or line_record.component_id is not null or line_record.component_type='base' then raise exception 'Manual payroll adjustment not found.' using errcode='P0002';end if;
  select run.* into run_record from public.business_payroll_items item join public.business_payroll_runs run on run.business_id=item.business_id and run.id=item.payroll_run_id
  where item.business_id=p_business_id and item.id=line_record.payroll_item_id for update of run;
  if not found then raise exception 'Payroll run not found.' using errcode='P0002';end if;
  if run_record.status<>'draft' then raise exception 'Only draft payroll adjustments can be deleted.' using errcode='55000';end if;
  perform private.validate_business_payroll_branch(p_business_id,run_record.branch_id,actor_id,true);
  perform set_config('app.business_payroll_action','line_write',true);
  delete from public.business_payroll_item_lines where business_id=p_business_id and id=p_line_id;
  item_record:=private.recalculate_business_payroll_item(p_business_id,line_record.payroll_item_id);
  perform private.write_business_payroll_audit(p_business_id,item_record.employee_id,item_record.payroll_run_id,'payroll_adjustment_deleted',jsonb_build_object('line_id',p_line_id));
  return to_jsonb(item_record);
end;$$;

create or replace function public.upsert_business_employee(
  p_business_id uuid,p_employee_id uuid,p_employee_code text,p_display_name text,p_member_user_id uuid default null,p_branch_id uuid default null,p_email text default null,p_phone text default null,
  p_job_title text default null,p_department text default null,p_hire_date date default current_date,p_termination_date date default null,p_status text default 'active',
  p_pay_frequency text default 'monthly',p_base_pay numeric default 0,p_currency text default null,p_notes text default null
) returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.upsert_business_employee_internal(p_business_id,p_employee_id,p_employee_code,p_display_name,p_member_user_id,p_branch_id,p_email,p_phone,p_job_title,p_department,p_hire_date,p_termination_date,p_status,p_pay_frequency,p_base_pay,p_currency,p_notes);$$;
create or replace function public.upsert_business_pay_component(p_business_id uuid,p_component_id uuid,p_code text,p_name text,p_component_type text,p_calculation_type text,p_default_amount numeric default null,p_default_rate numeric default null,p_taxable boolean default false,p_active boolean default true)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.upsert_business_pay_component_internal(p_business_id,p_component_id,p_code,p_name,p_component_type,p_calculation_type,p_default_amount,p_default_rate,p_taxable,p_active);$$;
create or replace function public.upsert_business_employee_component(p_business_id uuid,p_assignment_id uuid,p_employee_id uuid,p_component_id uuid,p_amount_override numeric default null,p_rate_override numeric default null,p_active boolean default true,p_effective_from date default current_date,p_effective_to date default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.upsert_business_employee_component_internal(p_business_id,p_assignment_id,p_employee_id,p_component_id,p_amount_override,p_rate_override,p_active,p_effective_from,p_effective_to);$$;
create or replace function public.create_business_payroll_run(p_business_id uuid,p_name text,p_pay_frequency text,p_period_start date,p_period_end date,p_pay_date date,p_branch_id uuid default null,p_notes text default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.create_business_payroll_run_internal(p_business_id,p_name,p_pay_frequency,p_period_start,p_period_end,p_pay_date,p_branch_id,p_notes);$$;
create or replace function public.recalculate_business_payroll_run(p_business_id uuid,p_run_id uuid)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.recalculate_business_payroll_run_internal(p_business_id,p_run_id);$$;
create or replace function public.upsert_business_payroll_adjustment(p_business_id uuid,p_payroll_item_id uuid,p_line_id uuid,p_code text,p_name text,p_component_type text,p_amount numeric)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.upsert_business_payroll_adjustment_internal(p_business_id,p_payroll_item_id,p_line_id,p_code,p_name,p_component_type,p_amount);$$;
create or replace function public.delete_business_payroll_adjustment(p_business_id uuid,p_line_id uuid)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.delete_business_payroll_adjustment_internal(p_business_id,p_line_id);$$;

revoke execute on function public.upsert_business_employee(uuid,uuid,text,text,uuid,uuid,text,text,text,text,date,date,text,text,numeric,text,text),
public.upsert_business_pay_component(uuid,uuid,text,text,text,text,numeric,numeric,boolean,boolean),
public.upsert_business_employee_component(uuid,uuid,uuid,uuid,numeric,numeric,boolean,date,date),
public.create_business_payroll_run(uuid,text,text,date,date,date,uuid,text),public.recalculate_business_payroll_run(uuid,uuid),
public.upsert_business_payroll_adjustment(uuid,uuid,uuid,text,text,text,numeric),public.delete_business_payroll_adjustment(uuid,uuid) from public,anon;
grant execute on function public.upsert_business_employee(uuid,uuid,text,text,uuid,uuid,text,text,text,text,date,date,text,text,numeric,text,text),
public.upsert_business_pay_component(uuid,uuid,text,text,text,text,numeric,numeric,boolean,boolean),
public.upsert_business_employee_component(uuid,uuid,uuid,uuid,numeric,numeric,boolean,date,date),
public.create_business_payroll_run(uuid,text,text,date,date,date,uuid,text),public.recalculate_business_payroll_run(uuid,uuid),
public.upsert_business_payroll_adjustment(uuid,uuid,uuid,text,text,text,numeric),public.delete_business_payroll_adjustment(uuid,uuid) to authenticated;
