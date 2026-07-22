-- Resolve PL/pgSQL variable/column name collisions in inventory operation internals.
do $$
declare
  function_name text;
  function_definition text;
begin
  foreach function_name in array array[
    'create_business_warehouse_transfer_internal',
    'create_business_stock_adjustment_internal'
  ]
  loop
    select pg_get_functiondef(function_row.oid)
    into function_definition
    from pg_proc function_row
    join pg_namespace namespace_row on namespace_row.oid=function_row.pronamespace
    where namespace_row.nspname='private'
      and function_row.proname=function_name
    order by function_row.oid desc
    limit 1;

    if function_definition is null then
      raise exception 'Inventory operation function % is missing.', function_name;
    end if;

    if position('#variable_conflict use_variable' in function_definition)=0 then
      function_definition:=replace(
        function_definition,
        E'AS $function$\n',
        E'AS $function$\n#variable_conflict use_variable\n'
      );
      execute function_definition;
    end if;
  end loop;
end;
$$;
