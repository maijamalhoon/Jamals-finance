alter table public.business_payroll_settings
  add column if not exists employer_payable_account_id uuid;

do $$
declare
  rec record;
  employer_payable_id uuid;
  chosen_code text;
begin
  for rec in
    select settings.business_id,
           coalesce(settings.updated_by, business.owner_user_id) as actor_id
    from public.business_payroll_settings settings
    join public.businesses business on business.id=settings.business_id
  loop
    select account.id into employer_payable_id
    from public.business_chart_of_accounts account
    where account.business_id=rec.business_id
      and account.system_key='employer_payroll_payable';

    if employer_payable_id is null then
      chosen_code := case
        when not exists (
          select 1 from public.business_chart_of_accounts account
          where account.business_id=rec.business_id and account.code='2230'
        ) then '2230'
        else 'PAY-EMP-LIAB'
      end;

      insert into public.business_chart_of_accounts(
        business_id,code,name,account_type,account_subtype,normal_balance,
        system_key,allow_manual_posting,created_by
      )
      values(
        rec.business_id,chosen_code,'Employer payroll payable','liability',
        'payroll_employer','credit','employer_payroll_payable',false,rec.actor_id
      )
      returning id into employer_payable_id;
    end if;

    perform set_config('app.business_payroll_action','settings_write',true);
    update public.business_payroll_settings
    set employer_payable_account_id=employer_payable_id,
        updated_by=coalesce(updated_by,rec.actor_id),
        updated_at=now()
    where business_id=rec.business_id;
  end loop;
end;
$$;

alter table public.business_payroll_settings
  alter column employer_payable_account_id set not null;

alter table public.business_payroll_settings
  drop constraint if exists business_payroll_settings_employer_payable_account_fkey;

alter table public.business_payroll_settings
  add constraint business_payroll_settings_employer_payable_account_fkey
  foreign key (business_id, employer_payable_account_id)
  references public.business_chart_of_accounts(business_id,id)
  on delete restrict;

create index if not exists business_payroll_settings_employer_payable_idx
  on public.business_payroll_settings(business_id,employer_payable_account_id);

create unique index if not exists business_payroll_journal_source_unique_idx
  on public.business_journal_entries(business_id,source_type,source_id)
  where source_id is not null
    and source_type in ('payroll_accrual','payroll_payment');

create or replace function private.ensure_business_payroll_foundation(
  p_business_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  salary_id uuid;
  payable_id uuid;
  deduction_id uuid;
  employer_cost_id uuid;
  employer_payable_id uuid;
  v_base_currency text;
  chosen_code text;
begin
  select business.base_currency into v_base_currency
  from public.businesses business
  where business.id=p_business_id and business.status='active';

  if v_base_currency is null then
    raise exception 'Active business not found.' using errcode='P0002';
  end if;

  select account.id into salary_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='salaries_wages';

  if salary_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,
      system_key,allow_manual_posting,created_by
    )
    values(
      p_business_id,'6100','Salaries and wages','expense','payroll','debit',
      'salaries_wages',true,p_actor_id
    )
    on conflict(business_id,code) do update
      set system_key='salaries_wages',updated_at=now()
    returning id into salary_id;
  end if;

  select account.id into payable_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='payroll_payable';

  if payable_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,
      system_key,allow_manual_posting,created_by
    )
    values(
      p_business_id,'2210','Payroll payable','liability','payroll','credit',
      'payroll_payable',false,p_actor_id
    )
    on conflict(business_id,code) do update set
      name=excluded.name,
      account_type=excluded.account_type,
      account_subtype=excluded.account_subtype,
      normal_balance=excluded.normal_balance,
      system_key=excluded.system_key,
      allow_manual_posting=excluded.allow_manual_posting,
      updated_at=now()
    returning id into payable_id;
  end if;

  select account.id into deduction_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.system_key='payroll_deductions_payable';

  if deduction_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,
      system_key,allow_manual_posting,created_by
    )
    values(
      p_business_id,'2220','Payroll deductions payable','liability',
      'payroll_deduction','credit','payroll_deductions_payable',false,p_actor_id
    )
    on conflict(business_id,code) do update set
      name=excluded.name,
      account_type=excluded.account_type,
      account_subtype=excluded.account_subtype,
      normal_balance=excluded.normal_balance,
      system_key=excluded.system_key,
      allow_manual_posting=excluded.allow_manual_posting,
      updated_at=now()
    returning id into deduction_id;
  end if;

  select account.id into employer_cost_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.system_key='employer_payroll_cost';

  if employer_cost_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,
      system_key,allow_manual_posting,created_by
    )
    values(
      p_business_id,'6110','Employer payroll costs','expense','payroll','debit',
      'employer_payroll_cost',true,p_actor_id
    )
    on conflict(business_id,code) do update set
      name=excluded.name,
      account_type=excluded.account_type,
      account_subtype=excluded.account_subtype,
      normal_balance=excluded.normal_balance,
      system_key=excluded.system_key,
      allow_manual_posting=excluded.allow_manual_posting,
      updated_at=now()
    returning id into employer_cost_id;
  end if;

  select account.id into employer_payable_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.system_key='employer_payroll_payable';

  if employer_payable_id is null then
    chosen_code := case
      when not exists (
        select 1 from public.business_chart_of_accounts account
        where account.business_id=p_business_id and account.code='2230'
      ) then '2230'
      else 'PAY-EMP-LIAB'
    end;

    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,
      system_key,allow_manual_posting,created_by
    )
    values(
      p_business_id,chosen_code,'Employer payroll payable','liability',
      'payroll_employer','credit','employer_payroll_payable',false,p_actor_id
    )
    returning id into employer_payable_id;
  end if;

  if salary_id is null or payable_id is null or deduction_id is null
     or employer_cost_id is null or employer_payable_id is null then
    raise exception 'Payroll accounting foundation could not be initialized.'
      using errcode='23503';
  end if;

  perform set_config('app.business_payroll_action','settings_write',true);

  insert into public.business_payroll_settings(
    business_id,
    salary_expense_account_id,
    payroll_payable_account_id,
    deduction_payable_account_id,
    employer_cost_account_id,
    employer_payable_account_id,
    updated_by
  )
  values(
    p_business_id,
    salary_id,
    payable_id,
    deduction_id,
    employer_cost_id,
    employer_payable_id,
    p_actor_id
  )
  on conflict(business_id) do update set
    salary_expense_account_id=excluded.salary_expense_account_id,
    payroll_payable_account_id=excluded.payroll_payable_account_id,
    deduction_payable_account_id=excluded.deduction_payable_account_id,
    employer_cost_account_id=excluded.employer_cost_account_id,
    employer_payable_account_id=excluded.employer_payable_account_id,
    updated_by=excluded.updated_by,
    updated_at=now();
end;
$function$;

create or replace function private.post_business_payroll_journal_internal(
  p_business_id uuid,
  p_run_id uuid,
  p_entry_date date,
  p_source_type text,
  p_reference text,
  p_description text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  actor_id uuid:=auth.uid();
  base_currency text;
  fiscal_period_id uuid;
  journal_id uuid;
  line_item jsonb;
  line_no smallint:=0;
  account_id uuid;
  debit_amount numeric(24,6);
  credit_amount numeric(24,6);
  account_count integer;
  restore_ids uuid[]:='{}'::uuid[];
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if p_source_type not in ('payroll_accrual','payroll_payment') then
    raise exception 'Unsupported payroll journal source.' using errcode='22023';
  end if;

  if p_entry_date is null then
    raise exception 'Payroll journal date is required.' using errcode='22004';
  end if;

  if jsonb_typeof(p_lines)<>'array'
     or jsonb_array_length(p_lines)<2
     or jsonb_array_length(p_lines)>10 then
    raise exception 'Payroll journals require 2 to 10 lines.' using errcode='22023';
  end if;

  select business.base_currency into base_currency
  from public.businesses business
  where business.id=p_business_id and business.status='active';

  if base_currency is null then
    raise exception 'Active business not found.' using errcode='P0002';
  end if;

  select period.id into fiscal_period_id
  from public.business_fiscal_periods period
  where period.business_id=p_business_id
    and period.status='open'
    and p_entry_date between period.starts_on and period.ends_on
  order by period.starts_on desc
  limit 1
  for update;

  if fiscal_period_id is null then
    raise exception 'No open fiscal period contains the payroll journal date.'
      using errcode='22008';
  end if;

  select count(distinct account.id)::integer,
         coalesce(array_agg(account.id) filter(where not account.allow_manual_posting),'{}'::uuid[])
  into account_count,restore_ids
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.is_active
    and account.id in (
      select (value->>'account_id')::uuid
      from jsonb_array_elements(p_lines)
    );

  if account_count <> (
    select count(distinct (value->>'account_id')::uuid)
    from jsonb_array_elements(p_lines)
  ) then
    raise exception 'Payroll journal contains an inactive or invalid account.'
      using errcode='23514';
  end if;

  perform 1
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.id in (
      select (value->>'account_id')::uuid
      from jsonb_array_elements(p_lines)
    )
  for update;

  if cardinality(restore_ids)>0 then
    update public.business_chart_of_accounts
    set allow_manual_posting=true
    where business_id=p_business_id and id=any(restore_ids);
  end if;

  insert into public.business_journal_entries(
    business_id,entry_date,fiscal_period_id,source_type,source_id,
    reference,description,status,transaction_currency,exchange_rate,created_by
  )
  values(
    p_business_id,p_entry_date,fiscal_period_id,'manual',p_run_id,
    nullif(btrim(coalesce(p_reference,'')),''),
    btrim(p_description),'draft',base_currency,1,actor_id
  )
  returning id into journal_id;

  for line_item in select value from jsonb_array_elements(p_lines)
  loop
    line_no:=line_no+1;
    begin
      account_id:=(line_item->>'account_id')::uuid;
      debit_amount:=coalesce(nullif(line_item->>'debit','')::numeric,0);
      credit_amount:=coalesce(nullif(line_item->>'credit','')::numeric,0);
    exception when invalid_text_representation then
      raise exception 'Payroll journal lines contain invalid account or amount values.'
        using errcode='22023';
    end;

    insert into public.business_journal_lines(
      business_id,journal_entry_id,line_number,account_id,description,
      debit_transaction,credit_transaction
    )
    values(
      p_business_id,journal_id,line_no,account_id,
      nullif(btrim(coalesce(line_item->>'description','')),''),
      debit_amount,credit_amount
    );
  end loop;

  update public.business_journal_entries
  set source_type=p_source_type
  where business_id=p_business_id and id=journal_id and status='draft';

  if cardinality(restore_ids)>0 then
    update public.business_chart_of_accounts
    set allow_manual_posting=false
    where business_id=p_business_id and id=any(restore_ids);
  end if;

  update public.business_journal_entries
  set status='posted'
  where business_id=p_business_id and id=journal_id;

  return journal_id;
end;
$function$;

create or replace function private.post_business_payroll_run_internal(
  p_business_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  actor_id uuid:=auth.uid();
  payroll_run public.business_payroll_runs%rowtype;
  settings public.business_payroll_settings%rowtype;
  approval_status text;
  lines jsonb:='[]'::jsonb;
  journal_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if not private.can_process_business_payroll(p_business_id) then
    raise exception 'Payroll processing permission required.' using errcode='42501';
  end if;

  select * into payroll_run
  from public.business_payroll_runs run
  where run.business_id=p_business_id and run.id=p_run_id
  for update;

  if not found then
    raise exception 'Payroll run not found.' using errcode='P0002';
  end if;

  perform private.validate_business_payroll_branch(
    p_business_id,payroll_run.branch_id,actor_id,true
  );

  if payroll_run.status<>'approved' then
    raise exception 'Only an approved payroll run can be posted.'
      using errcode='55000';
  end if;

  if payroll_run.payroll_journal_entry_id is not null then
    raise exception 'Payroll run is already posted.' using errcode='55000';
  end if;

  if payroll_run.employee_count<=0 or payroll_run.gross_total<=0 then
    raise exception 'Payroll run has no calculated payroll to post.'
      using errcode='22023';
  end if;

  select request.status into approval_status
  from public.business_approval_requests request
  where request.business_id=p_business_id
    and request.id=payroll_run.approval_request_id;

  if approval_status<>'approved' then
    raise exception 'Payroll approval is not complete.' using errcode='55000';
  end if;

  perform private.ensure_business_payroll_foundation(p_business_id,actor_id);

  select * into settings
  from public.business_payroll_settings payroll_settings
  where payroll_settings.business_id=p_business_id;

  if settings.business_id is null then
    raise exception 'Payroll settings are missing.' using errcode='23503';
  end if;

  lines:=lines||jsonb_build_array(jsonb_build_object(
    'account_id',settings.salary_expense_account_id,
    'description','Gross salaries and wages',
    'debit',payroll_run.gross_total,
    'credit',0
  ));

  if payroll_run.employer_cost_total>0 then
    lines:=lines||jsonb_build_array(
      jsonb_build_object(
        'account_id',settings.employer_cost_account_id,
        'description','Employer payroll costs',
        'debit',payroll_run.employer_cost_total,
        'credit',0
      ),
      jsonb_build_object(
        'account_id',settings.employer_payable_account_id,
        'description','Employer payroll contributions payable',
        'debit',0,
        'credit',payroll_run.employer_cost_total
      )
    );
  end if;

  if payroll_run.deduction_total>0 then
    lines:=lines||jsonb_build_array(jsonb_build_object(
      'account_id',settings.deduction_payable_account_id,
      'description','Employee payroll deductions payable',
      'debit',0,
      'credit',payroll_run.deduction_total
    ));
  end if;

  if payroll_run.net_total>0 then
    lines:=lines||jsonb_build_array(jsonb_build_object(
      'account_id',settings.payroll_payable_account_id,
      'description','Net payroll payable',
      'debit',0,
      'credit',payroll_run.net_total
    ));
  end if;

  journal_id:=private.post_business_payroll_journal_internal(
    p_business_id,
    payroll_run.id,
    payroll_run.period_end,
    'payroll_accrual',
    'PAY-'||lpad(payroll_run.run_no::text,8,'0'),
    'Payroll accrual for '||payroll_run.name,
    lines
  );

  perform set_config('app.business_payroll_action','run_write',true);

  update public.business_payroll_runs
  set status='posted',
      payroll_journal_entry_id=journal_id,
      posted_by=actor_id,
      posted_at=now(),
      updated_at=now()
  where business_id=p_business_id and id=payroll_run.id;

  perform private.write_business_payroll_audit(
    p_business_id,null,payroll_run.id,'payroll_posted',
    jsonb_build_object(
      'journal_entry_id',journal_id,
      'gross_total',payroll_run.gross_total,
      'deduction_total',payroll_run.deduction_total,
      'net_total',payroll_run.net_total,
      'employer_cost_total',payroll_run.employer_cost_total
    )
  );

  return jsonb_build_object(
    'payroll_run_id',payroll_run.id,
    'status','posted',
    'journal_entry_id',journal_id
  );
end;
$function$;

create or replace function private.pay_business_payroll_run_internal(
  p_business_id uuid,
  p_run_id uuid,
  p_payment_account_id uuid,
  p_payment_date date,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  actor_id uuid:=auth.uid();
  payroll_run public.business_payroll_runs%rowtype;
  settings public.business_payroll_settings%rowtype;
  payment_account public.business_chart_of_accounts%rowtype;
  linked_bank_currency text;
  lines jsonb;
  journal_id uuid;
  payment_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if not private.can_pay_business_payroll(p_business_id) then
    raise exception 'Payroll payment permission required.' using errcode='42501';
  end if;

  select * into payroll_run
  from public.business_payroll_runs run
  where run.business_id=p_business_id and run.id=p_run_id
  for update;

  if not found then
    raise exception 'Payroll run not found.' using errcode='P0002';
  end if;

  perform private.validate_business_payroll_branch(
    p_business_id,payroll_run.branch_id,actor_id,true
  );

  if payroll_run.status<>'posted' then
    raise exception 'Only a posted payroll run can be paid.'
      using errcode='55000';
  end if;

  if payroll_run.payment_journal_entry_id is not null then
    raise exception 'Payroll run is already paid.' using errcode='55000';
  end if;

  if payroll_run.net_total<=0 then
    raise exception 'This payroll run has no net cash payroll to pay.'
      using errcode='22023';
  end if;

  if p_payment_date is null or p_payment_date<payroll_run.period_end then
    raise exception 'Payment date cannot be before the payroll period end.'
      using errcode='22008';
  end if;

  select * into payment_account
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id
    and account.id=p_payment_account_id
    and account.is_active
    and account.account_type='asset'
    and (
      account.system_key in ('cash','bank')
      or account.account_subtype in ('cash','bank')
      or exists(
        select 1
        from public.business_bank_accounts bank_account
        where bank_account.business_id=account.business_id
          and bank_account.ledger_account_id=account.id
          and bank_account.is_active
      )
    )
  for update;

  if not found then
    raise exception 'Active cash or bank payment account not found.'
      using errcode='P0002';
  end if;

  select bank_account.currency into linked_bank_currency
  from public.business_bank_accounts bank_account
  where bank_account.business_id=p_business_id
    and bank_account.ledger_account_id=p_payment_account_id
    and bank_account.is_active
  order by bank_account.created_at
  limit 1;

  if linked_bank_currency is not null
     and linked_bank_currency<>payroll_run.currency then
    raise exception 'Payroll and payment account currencies must match.'
      using errcode='22023';
  end if;

  select * into settings
  from public.business_payroll_settings payroll_settings
  where payroll_settings.business_id=p_business_id;

  if settings.business_id is null then
    raise exception 'Payroll settings are missing.' using errcode='23503';
  end if;

  lines:=jsonb_build_array(
    jsonb_build_object(
      'account_id',settings.payroll_payable_account_id,
      'description','Settle net payroll payable',
      'debit',payroll_run.net_total,
      'credit',0
    ),
    jsonb_build_object(
      'account_id',payment_account.id,
      'description','Payroll payment',
      'debit',0,
      'credit',payroll_run.net_total
    )
  );

  journal_id:=private.post_business_payroll_journal_internal(
    p_business_id,
    payroll_run.id,
    p_payment_date,
    'payroll_payment',
    nullif(btrim(coalesce(p_reference,'')),''),
    'Payroll payment for '||payroll_run.name,
    lines
  );

  perform set_config('app.business_payroll_action','payment_write',true);

  insert into public.business_payroll_payments(
    business_id,payroll_run_id,payment_account_id,journal_entry_id,
    payment_date,amount,reference,paid_by
  )
  values(
    p_business_id,payroll_run.id,payment_account.id,journal_id,
    p_payment_date,payroll_run.net_total,
    nullif(btrim(coalesce(p_reference,'')),''),
    actor_id
  )
  returning id into payment_id;

  perform set_config('app.business_payroll_action','run_write',true);

  update public.business_payroll_runs
  set status='paid',
      payment_journal_entry_id=journal_id,
      paid_by=actor_id,
      paid_at=now(),
      updated_at=now()
  where business_id=p_business_id and id=payroll_run.id;

  perform private.write_business_payroll_audit(
    p_business_id,null,payroll_run.id,'payroll_paid',
    jsonb_build_object(
      'payment_id',payment_id,
      'journal_entry_id',journal_id,
      'payment_account_id',payment_account.id,
      'payment_date',p_payment_date,
      'amount',payroll_run.net_total,
      'reference',nullif(btrim(coalesce(p_reference,'')),'')
    )
  );

  return jsonb_build_object(
    'payroll_run_id',payroll_run.id,
    'status','paid',
    'payment_id',payment_id,
    'journal_entry_id',journal_id,
    'amount',payroll_run.net_total
  );
end;
$function$;

create or replace function public.post_business_payroll_run(
  p_business_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog','public','private'
as $function$
begin
  return private.post_business_payroll_run_internal(p_business_id,p_run_id);
end;
$function$;

create or replace function public.pay_business_payroll_run(
  p_business_id uuid,
  p_run_id uuid,
  p_payment_account_id uuid,
  p_payment_date date,
  p_reference text default null
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog','public','private'
as $function$
begin
  return private.pay_business_payroll_run_internal(
    p_business_id,p_run_id,p_payment_account_id,p_payment_date,p_reference
  );
end;
$function$;

revoke all on function private.post_business_payroll_journal_internal(
  uuid,uuid,date,text,text,text,jsonb
) from public,anon,authenticated;
revoke all on function private.post_business_payroll_run_internal(
  uuid,uuid
) from public,anon,authenticated,service_role;
grant execute on function private.post_business_payroll_run_internal(
  uuid,uuid
) to authenticated,service_role;

revoke all on function private.pay_business_payroll_run_internal(
  uuid,uuid,uuid,date,text
) from public,anon,authenticated,service_role;
grant execute on function private.pay_business_payroll_run_internal(
  uuid,uuid,uuid,date,text
) to authenticated,service_role;

revoke all on function public.post_business_payroll_run(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.post_business_payroll_run(uuid,uuid)
  to authenticated,service_role;

revoke all on function public.pay_business_payroll_run(uuid,uuid,uuid,date,text)
  from public,anon,authenticated,service_role;
grant execute on function public.pay_business_payroll_run(uuid,uuid,uuid,date,text)
  to authenticated,service_role;
