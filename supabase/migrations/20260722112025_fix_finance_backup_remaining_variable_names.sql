do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.import_finance_backup(jsonb)'::regprocedure)
  into function_definition;

  if position(E'\n target_id uuid;' in function_definition) > 0
    or position(E'\n  target_id uuid;' in function_definition) > 0
  then
    function_definition := replace(function_definition, 'target_id', 'v_target_id');
    function_definition := replace(function_definition, 'added_counts', 'v_added_counts');
    function_definition := replace(function_definition, 'skipped_counts', 'v_skipped_counts');

    function_definition := replace(function_definition, 'import.v_added_counts', 'import.added_counts');
    function_definition := replace(function_definition, 'import.v_skipped_counts', 'import.skipped_counts');
    function_definition := replace(function_definition, 'state.v_target_id', 'state.target_id');
    function_definition := replace(function_definition, 'v_target_id uuid PRIMARY KEY', 'target_id uuid PRIMARY KEY');
    function_definition := replace(function_definition, 'v_target_id uuid primary key', 'target_id uuid primary key');
    function_definition := replace(function_definition, 'ON CONFLICT (v_target_id)', 'ON CONFLICT (target_id)');
    function_definition := replace(function_definition, 'on conflict (v_target_id)', 'on conflict (target_id)');
    function_definition := replace(
      function_definition,
      E'INSERT INTO pg_temp.finance_import_account_state (v_target_id, desired_status, desired_archived_at, desired_balance, is_new)',
      E'INSERT INTO pg_temp.finance_import_account_state (target_id, desired_status, desired_archived_at, desired_balance, is_new)'
    );
    function_definition := replace(
      function_definition,
      E'insert into pg_temp.finance_import_account_state (\n        v_target_id,',
      E'insert into pg_temp.finance_import_account_state (\n        target_id,'
    );
    function_definition := replace(
      function_definition,
      E'insert into pg_temp.finance_import_account_state (\n      v_target_id,',
      E'insert into pg_temp.finance_import_account_state (\n      target_id,'
    );
    function_definition := replace(
      function_definition,
      E'INSERT INTO private.finance_data_imports (v_target_user_id, v_backup_id, v_source_owner_id, v_exported_at, v_added_counts, v_skipped_counts)',
      E'INSERT INTO private.finance_data_imports (target_user_id, backup_id, source_owner_id, exported_at, added_counts, skipped_counts)'
    );
    function_definition := replace(
      function_definition,
      E'insert into private.finance_data_imports (\n    target_user_id,\n    backup_id,\n    source_owner_id,\n    exported_at,\n    v_added_counts,\n    v_skipped_counts',
      E'insert into private.finance_data_imports (\n    target_user_id,\n    backup_id,\n    source_owner_id,\n    exported_at,\n    added_counts,\n    skipped_counts'
    );

    execute function_definition;
  end if;
end;
$migration$;
