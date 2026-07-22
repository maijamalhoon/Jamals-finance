do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'private.prepare_business_journal_line()'::regprocedure
  ) into function_definition;
  function_definition := replace(
    function_definition,
    'select rounding_scale into rounding_scale from public.business_accounting_settings where business_id=new.business_id;',
    'select settings.rounding_scale into rounding_scale from public.business_accounting_settings settings where settings.business_id=new.business_id;'
  );
  execute function_definition;

  select pg_get_functiondef(
    'public.post_business_journal_entry(uuid,date,text,text,text,uuid,text,numeric,jsonb)'::regprocedure
  ) into function_definition;
  function_definition := replace(
    function_definition,
    'select accounting_basis into accounting_basis from public.business_accounting_settings where business_id=p_business_id;',
    'select settings.accounting_basis into accounting_basis from public.business_accounting_settings settings where settings.business_id=p_business_id;'
  );
  execute function_definition;

  select pg_get_functiondef(
    'private.create_business_supplier_bill_internal(uuid,uuid,date,date,text,text,numeric,text,jsonb,text)'::regprocedure
  ) into function_definition;
  function_definition := replace(
    function_definition,
    'select rounding_scale,accounting_basis into rounding_scale,accounting_basis from public.business_accounting_settings where business_id=p_business_id;',
    'select settings.rounding_scale, settings.accounting_basis into rounding_scale, accounting_basis from public.business_accounting_settings settings where settings.business_id=p_business_id;'
  );
  execute function_definition;

  select pg_get_functiondef(
    'private.record_business_supplier_payment_internal(uuid,uuid,date,numeric,uuid,text,text)'::regprocedure
  ) into function_definition;
  function_definition := replace(
    function_definition,
    'select rounding_scale,accounting_basis into rounding_scale,accounting_basis from public.business_accounting_settings where business_id=p_business_id;',
    'select settings.rounding_scale, settings.accounting_basis into rounding_scale, accounting_basis from public.business_accounting_settings settings where settings.business_id=p_business_id;'
  );
  execute function_definition;
end;
$$;