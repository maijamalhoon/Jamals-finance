alter function public.import_finance_backup(jsonb) set schema private;
alter function private.import_finance_backup(jsonb) rename to import_finance_backup_internal;

revoke all on function private.import_finance_backup_internal(jsonb)
  from public, anon, authenticated;
grant execute on function private.import_finance_backup_internal(jsonb)
  to authenticated, service_role;

create or replace function public.import_finance_backup(p_backup jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, private
as $$
  select private.import_finance_backup_internal(p_backup);
$$;

revoke execute on function public.import_finance_backup(jsonb) from public, anon;
grant execute on function public.import_finance_backup(jsonb) to authenticated, service_role;

drop index if exists private.finance_data_imports_source_lookup_idx;
