do $migration$
declare
  function_definition text;
  original_definition text;
begin
  select pg_get_functiondef('public.get_business_reports_snapshot(uuid,date,date,date)'::regprocedure)
  into function_definition;
  original_definition := function_definition;

  function_definition := replace(
    function_definition,
    'entry.source_type,
      entry.reference,',
    'entry.source_type,
      entry.source_id,
      entry.reference,'
  );

  function_definition := replace(
    function_definition,
    'entry.source_type,
      entry.reference,
      entry.description',
    'entry.source_type,
      entry.source_id,
      entry.reference,
      entry.description'
  );

  function_definition := replace(
    function_definition,
    'when activity.source_type in (''sales_payment'', ''supplier_payment'') then ''operating''',
    'when activity.source_type = ''sales_payment'' then ''operating''
        when activity.source_type = ''supplier_payment'' and exists (
          select 1
          from public.business_supplier_payments supplier_payment
          join public.business_supplier_bill_lines bill_line
            on bill_line.business_id = supplier_payment.business_id
           and bill_line.bill_id = supplier_payment.bill_id
          join public.business_chart_of_accounts allocation_account
            on allocation_account.business_id = bill_line.business_id
           and allocation_account.id = bill_line.allocation_account_id
          where supplier_payment.business_id = p_business_id
            and supplier_payment.id = activity.source_id
            and (
              allocation_account.system_key = ''fixed_assets''
              or allocation_account.account_subtype = ''fixed_asset''
            )
        ) then ''investing''
        when activity.source_type = ''supplier_payment'' then ''operating'''
  );

  if function_definition = original_definition
     or position('supplier_payment.id = activity.source_id' in function_definition) = 0 then
    raise exception 'Fixed-asset cash-flow classification patch did not match the expected report function.';
  end if;

  execute function_definition;
end;
$migration$;