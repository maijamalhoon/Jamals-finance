do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.import_finance_backup(jsonb)'::regprocedure)
  into function_definition;

  if position('target_user_id uuid := auth.uid()' in function_definition) > 0 then
    function_definition := replace(function_definition, 'target_user_id', 'v_target_user_id');
    function_definition := replace(function_definition, 'source_owner_id', 'v_source_owner_id');
    function_definition := replace(function_definition, 'backup_id', 'v_backup_id');
    function_definition := replace(function_definition, 'exported_at', 'v_exported_at');

    function_definition := replace(
      function_definition,
      'import.v_target_user_id',
      'import.target_user_id'
    );
    function_definition := replace(
      function_definition,
      'import.v_backup_id',
      'import.backup_id'
    );
    function_definition := replace(
      function_definition,
      E'insert into private.finance_data_imports (\n    v_target_user_id,\n    v_backup_id,\n    v_source_owner_id,\n    v_exported_at,',
      E'insert into private.finance_data_imports (\n    target_user_id,\n    backup_id,\n    source_owner_id,\n    exported_at,'
    );

    execute function_definition;
  end if;
end;
$migration$;
