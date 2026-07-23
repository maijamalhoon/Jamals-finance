do $$
declare
  function_sql text;
begin
  function_sql:=pg_get_functiondef(
    'private.get_business_payroll_snapshot_internal(uuid,integer)'::regprocedure
  );

  if position('account.active' in function_sql)=0 then
    return;
  end if;

  function_sql:=replace(function_sql,'account.active','account.is_active');
  execute function_sql;
end;
$$;
