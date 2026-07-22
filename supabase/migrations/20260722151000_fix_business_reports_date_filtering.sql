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
    'then coalesce(sum(line.credit_base - line.debit_base), 0)::numeric(24,6)
        else coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6)',
    'then coalesce(sum(case when entry.id is not null then line.credit_base - line.debit_base else 0 end), 0)::numeric(24,6)
        else coalesce(sum(case when entry.id is not null then line.debit_base - line.credit_base else 0 end), 0)::numeric(24,6)'
  );

  function_definition := replace(
    function_definition,
    'then coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6)
        else coalesce(sum(line.credit_base - line.debit_base), 0)::numeric(24,6)',
    'then coalesce(sum(case when entry.id is not null then line.debit_base - line.credit_base else 0 end), 0)::numeric(24,6)
        else coalesce(sum(case when entry.id is not null then line.credit_base - line.debit_base else 0 end), 0)::numeric(24,6)'
  );

  if function_definition = original_definition
     or length(function_definition) - length(replace(function_definition, 'case when entry.id is not null', '')) < 4 * length('case when entry.id is not null') then
    raise exception 'Report date-filter patch did not match the expected function body.';
  end if;

  execute function_definition;
end;
$migration$;