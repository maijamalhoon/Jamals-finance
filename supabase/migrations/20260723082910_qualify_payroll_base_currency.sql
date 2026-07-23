create or replace function private.ensure_business_payroll_foundation(p_business_id uuid,p_actor_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare salary_id uuid;payable_id uuid;deduction_id uuid;employer_id uuid;v_base_currency text;
begin
  select business.base_currency into v_base_currency
  from public.businesses business
  where business.id=p_business_id and business.status='active';
  if v_base_currency is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  select account.id into salary_id from public.business_chart_of_accounts account where account.business_id=p_business_id and account.system_key='salaries_wages';
  if salary_id is null then
    insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
    values(p_business_id,'6100','Salaries and wages','expense','payroll','debit','salaries_wages',true,p_actor_id)
    on conflict(business_id,code) do update set system_key='salaries_wages',updated_at=now()
    returning id into salary_id;
  end if;
  insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
  values(p_business_id,'2210','Payroll payable','liability','payroll','credit','payroll_payable',false,p_actor_id)
  on conflict(business_id,code) do update set name=excluded.name,account_type=excluded.account_type,account_subtype=excluded.account_subtype,normal_balance=excluded.normal_balance,system_key=excluded.system_key,allow_manual_posting=excluded.allow_manual_posting,updated_at=now();
  select account.id into payable_id from public.business_chart_of_accounts account where account.business_id=p_business_id and account.system_key='payroll_payable';
  insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
  values(p_business_id,'2220','Payroll deductions payable','liability','payroll_deduction','credit','payroll_deductions_payable',false,p_actor_id)
  on conflict(business_id,code) do update set name=excluded.name,account_type=excluded.account_type,account_subtype=excluded.account_subtype,normal_balance=excluded.normal_balance,system_key=excluded.system_key,allow_manual_posting=excluded.allow_manual_posting,updated_at=now();
  select account.id into deduction_id from public.business_chart_of_accounts account where account.business_id=p_business_id and account.system_key='payroll_deductions_payable';
  insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
  values(p_business_id,'6110','Employer payroll costs','expense','payroll','debit','employer_payroll_cost',true,p_actor_id)
  on conflict(business_id,code) do update set name=excluded.name,account_type=excluded.account_type,account_subtype=excluded.account_subtype,normal_balance=excluded.normal_balance,system_key=excluded.system_key,allow_manual_posting=excluded.allow_manual_posting,updated_at=now();
  select account.id into employer_id from public.business_chart_of_accounts account where account.business_id=p_business_id and account.system_key='employer_payroll_cost';
  if salary_id is null or payable_id is null or deduction_id is null or employer_id is null then
    raise exception 'Payroll accounting foundation could not be initialized.' using errcode='23503';
  end if;
  perform set_config('app.business_payroll_action','settings_write',true);
  insert into public.business_payroll_settings(
    business_id,salary_expense_account_id,payroll_payable_account_id,deduction_payable_account_id,employer_cost_account_id,updated_by
  ) values(p_business_id,salary_id,payable_id,deduction_id,employer_id,p_actor_id)
  on conflict(business_id) do update set
    salary_expense_account_id=excluded.salary_expense_account_id,
    payroll_payable_account_id=excluded.payroll_payable_account_id,
    deduction_payable_account_id=excluded.deduction_payable_account_id,
    employer_cost_account_id=excluded.employer_cost_account_id,
    updated_by=excluded.updated_by;
end;$$;
