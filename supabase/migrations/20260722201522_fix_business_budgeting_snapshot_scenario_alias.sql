do $$
declare
  function_sql text;
begin
  select pg_get_functiondef('private.get_business_budgeting_snapshot_internal(uuid,uuid,uuid)'::regprocedure)
  into function_sql;
  if position(' from scenarios),' in function_sql)=0 then
    raise exception 'Expected budgeting snapshot alias marker was not found.';
  end if;
  function_sql:=replace(function_sql,' from scenarios),',' from scenarios scenario),');
  execute function_sql;
end;
$$;
