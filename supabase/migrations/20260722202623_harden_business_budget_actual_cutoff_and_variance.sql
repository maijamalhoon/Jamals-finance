do $$
declare
  function_sql text;
begin
  select pg_get_functiondef('private.create_business_budget_scenario_internal(uuid,text,text,date,date,date,jsonb,text)'::regprocedure)
  into function_sql;
  function_sql:=replace(
    function_sql,
    'if p_actuals_through is not null and (p_actuals_through<p_starts_on-1 or p_actuals_through>p_ends_on) then',
    'if p_actuals_through is not null and (p_actuals_through<p_starts_on-1 or p_actuals_through>least(p_ends_on,current_date)) then'
  );
  execute function_sql;

  select pg_get_functiondef('private.copy_business_budget_scenario_internal(uuid,uuid,text,numeric,text,date)'::regprocedure)
  into function_sql;
  if position('if normalized_type=''forecast'' and coalesce(p_actuals_through,source_row.actuals_through) is null then' in function_sql)=0 then
    raise exception 'Budget copy validation marker not found.';
  end if;
  function_sql:=replace(
    function_sql,
    'if normalized_type=''forecast'' and coalesce(p_actuals_through,source_row.actuals_through) is null then raise exception ''Forecast scenarios require an actuals-through date.'' using errcode=''22023''; end if;',
    'if normalized_type=''forecast'' and coalesce(p_actuals_through,source_row.actuals_through) is null then raise exception ''Forecast scenarios require an actuals-through date.'' using errcode=''22023''; end if;
  if coalesce(p_actuals_through,source_row.actuals_through) is not null and (
    coalesce(p_actuals_through,source_row.actuals_through)<source_row.starts_on-1
    or coalesce(p_actuals_through,source_row.actuals_through)>least(source_row.ends_on,current_date)
  ) then raise exception ''Actuals-through date falls outside the available actual period.'' using errcode=''22023''; end if;'
  );
  execute function_sql;

  select pg_get_functiondef('private.get_business_budgeting_snapshot_internal(uuid,uuid,uuid)'::regprocedure)
  into function_sql;
  if position('and account.account_type in (''revenue'',''expense'')' in function_sql)=0 then
    raise exception 'Budget snapshot actuals marker not found.';
  end if;
  function_sql:=replace(
    function_sql,
    'and account.account_type in (''revenue'',''expense'')
    group by line.account_id,date_trunc(''month'',entry.entry_date)',
    'and account.account_type in (''revenue'',''expense'')
      and entry.entry_date<=least(selected.ends_on,current_date)
    group by line.account_id,date_trunc(''month'',entry.entry_date)'
  );
  function_sql:=replace(
    function_sql,
    'case when account_type=''revenue'' then sum(actual_base-budget_base) else sum(budget_base-actual_base) end as favourable_variance_base,',
    'case when account_type=''revenue'' then
        sum(actual_base-budget_base) filter(where month_start<=date_trunc(''month'',least(coalesce(selected.actuals_through,current_date),current_date,selected.ends_on))::date)
      else
        sum(budget_base-actual_base) filter(where month_start<=date_trunc(''month'',least(coalesce(selected.actuals_through,current_date),current_date,selected.ends_on))::date)
      end as favourable_variance_base,'
  );
  function_sql:=replace(
    function_sql,
    '''actual_revenue'',coalesce((select sum(actual_revenue) from month_totals),0),',
    '''budget_to_date_revenue'',coalesce((select sum(budget_revenue) from month_totals where month_start<=date_trunc(''month'',least(coalesce(selected.actuals_through,current_date),current_date,selected.ends_on))::date),0),
      ''budget_to_date_expense'',coalesce((select sum(budget_expense) from month_totals where month_start<=date_trunc(''month'',least(coalesce(selected.actuals_through,current_date),current_date,selected.ends_on))::date),0),
      ''budget_to_date_net'',coalesce((select sum(budget_revenue)-sum(budget_expense) from month_totals where month_start<=date_trunc(''month'',least(coalesce(selected.actuals_through,current_date),current_date,selected.ends_on))::date),0),
      ''actual_revenue'',coalesce((select sum(actual_revenue) from month_totals),0),'
  );
  execute function_sql;
end;
$$;
