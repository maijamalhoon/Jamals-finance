create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
select array[
  'team.view','team.manage','notifications.view','notifications.manage',
  'accounting.view','accounting.manage','banking.view','banking.manage','tax.view','tax.manage',
  'budget.view','budget.manage','budget.approve',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.can_view_business_budgeting(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1 from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager','viewer')
      or '*' = any(membership.permissions)
      or 'budget.view' = any(membership.permissions)
      or 'budget.manage' = any(membership.permissions)
      or 'budget.approve' = any(membership.permissions)
      or 'accounting.view' = any(membership.permissions)
      or 'accounting.manage' = any(membership.permissions)
      or 'reports.view' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_manage_business_budgeting(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1 from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager')
      or '*' = any(membership.permissions)
      or 'budget.manage' = any(membership.permissions)
      or 'budget.approve' = any(membership.permissions)
      or 'accounting.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_approve_business_budgeting(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1 from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin')
      or '*' = any(membership.permissions)
      or 'budget.approve' = any(membership.permissions)
    )
);
$$;

revoke all on function private.can_view_business_budgeting(uuid) from public;
revoke all on function private.can_manage_business_budgeting(uuid) from public;
revoke all on function private.can_approve_business_budgeting(uuid) from public;
grant execute on function private.can_view_business_budgeting(uuid) to authenticated;
grant execute on function private.can_manage_business_budgeting(uuid) to authenticated;
grant execute on function private.can_approve_business_budgeting(uuid) to authenticated;

create table if not exists public.business_budget_scenarios (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  scenario_type text not null default 'budget',
  version_number integer not null,
  starts_on date not null,
  ends_on date not null,
  actuals_through date,
  status text not null default 'draft',
  base_currency text not null,
  assumptions jsonb not null default '{}'::jsonb,
  notes text,
  source_scenario_id uuid,
  adjustment_percent numeric(9,4) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_budget_scenarios_business_id_id_key unique (business_id,id),
  constraint business_budget_scenarios_name_version_key unique (business_id,name,version_number),
  constraint business_budget_scenarios_source_fkey
    foreign key (business_id,source_scenario_id)
    references public.business_budget_scenarios(business_id,id)
    on delete restrict,
  constraint business_budget_scenarios_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint business_budget_scenarios_type_check check (scenario_type in ('budget','forecast')),
  constraint business_budget_scenarios_version_check check (version_number >= 1),
  constraint business_budget_scenarios_dates_check check (
    ends_on >= starts_on
    and starts_on = date_trunc('month',starts_on)::date
    and ends_on = (date_trunc('month',ends_on) + interval '1 month - 1 day')::date
    and ends_on <= starts_on + interval '35 months'
  ),
  constraint business_budget_scenarios_actuals_check check (
    actuals_through is null
    or (actuals_through >= starts_on - 1 and actuals_through <= ends_on)
  ),
  constraint business_budget_scenarios_status_check check (status in ('draft','submitted','approved','locked','archived')),
  constraint business_budget_scenarios_currency_check check (base_currency ~ '^[A-Z]{3}$'),
  constraint business_budget_scenarios_assumptions_check check (jsonb_typeof(assumptions)='object'),
  constraint business_budget_scenarios_notes_check check (notes is null or char_length(btrim(notes)) <= 2000),
  constraint business_budget_scenarios_adjustment_check check (adjustment_percent between -100 and 1000),
  constraint business_budget_scenarios_state_check check (
    (status='draft' and submitted_at is null and approved_at is null and locked_at is null and archived_at is null)
    or (status='submitted' and submitted_at is not null and approved_at is null and locked_at is null and archived_at is null)
    or (status='approved' and submitted_at is not null and approved_at is not null and locked_at is null and archived_at is null)
    or (status='locked' and submitted_at is not null and approved_at is not null and locked_at is not null and archived_at is null)
    or (status='archived' and archived_at is not null)
  )
);

create table if not exists public.business_budget_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  scenario_id uuid not null,
  account_id uuid not null,
  month_start date not null,
  amount_base numeric(24,6) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_budget_lines_scenario_fkey
    foreign key (business_id,scenario_id)
    references public.business_budget_scenarios(business_id,id)
    on delete cascade,
  constraint business_budget_lines_account_fkey
    foreign key (business_id,account_id)
    references public.business_chart_of_accounts(business_id,id)
    on delete restrict,
  constraint business_budget_lines_business_id_id_key unique (business_id,id),
  constraint business_budget_lines_unique_key unique (scenario_id,account_id,month_start),
  constraint business_budget_lines_month_check check (month_start=date_trunc('month',month_start)::date),
  constraint business_budget_lines_amount_check check (abs(amount_base) <= 999999999999999999::numeric),
  constraint business_budget_lines_notes_check check (notes is null or char_length(btrim(notes)) <= 500)
);

create index if not exists business_budget_scenarios_business_status_idx
  on public.business_budget_scenarios(business_id,status,starts_on desc,created_at desc);
create index if not exists business_budget_scenarios_source_idx
  on public.business_budget_scenarios(business_id,source_scenario_id);
create index if not exists business_budget_scenarios_created_by_idx on public.business_budget_scenarios(created_by);
create index if not exists business_budget_scenarios_submitted_by_idx on public.business_budget_scenarios(submitted_by);
create index if not exists business_budget_scenarios_approved_by_idx on public.business_budget_scenarios(approved_by);
create index if not exists business_budget_scenarios_locked_by_idx on public.business_budget_scenarios(locked_by);
create index if not exists business_budget_scenarios_archived_by_idx on public.business_budget_scenarios(archived_by);
create index if not exists business_budget_lines_scenario_month_idx
  on public.business_budget_lines(business_id,scenario_id,month_start,account_id);
create index if not exists business_budget_lines_account_idx
  on public.business_budget_lines(business_id,account_id,month_start);
create index if not exists business_budget_lines_created_by_idx on public.business_budget_lines(created_by);
create index if not exists business_budget_lines_updated_by_idx on public.business_budget_lines(updated_by);

create or replace function private.enforce_business_budget_engine_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  action_name text := coalesce(current_setting('app.business_budget_action',true),'');
begin
  if current_user <> 'postgres' then
    raise exception 'Business budget records are managed by the budgeting engine.' using errcode='55000';
  end if;
  if tg_table_name='business_budget_scenarios' and action_name not in ('create','copy','transition','archive') then
    raise exception 'Unsupported business budget scenario write.' using errcode='55000';
  end if;
  if tg_table_name='business_budget_lines' and action_name not in ('line_upsert','copy') then
    raise exception 'Unsupported business budget line write.' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create trigger business_budget_scenarios_engine_guard
before insert or update or delete on public.business_budget_scenarios
for each row execute function private.enforce_business_budget_engine_write();
create trigger business_budget_lines_engine_guard
before insert or update or delete on public.business_budget_lines
for each row execute function private.enforce_business_budget_engine_write();

create trigger business_budget_scenarios_touch_updated_at
before update on public.business_budget_scenarios
for each row execute function private.set_business_workspace_updated_at();
create trigger business_budget_lines_touch_updated_at
before update on public.business_budget_lines
for each row execute function private.set_business_workspace_updated_at();

alter table public.business_budget_scenarios enable row level security;
alter table public.business_budget_lines enable row level security;

create policy business_budget_scenarios_select on public.business_budget_scenarios
for select to authenticated using (private.can_view_business_budgeting(business_id));
create policy business_budget_lines_select on public.business_budget_lines
for select to authenticated using (private.can_view_business_budgeting(business_id));

revoke all on public.business_budget_scenarios from public,anon,authenticated;
revoke all on public.business_budget_lines from public,anon,authenticated;
grant select on public.business_budget_scenarios to authenticated;
grant select on public.business_budget_lines to authenticated;

create or replace function private.create_business_budget_scenario_internal(
  p_business_id uuid,
  p_name text,
  p_scenario_type text,
  p_starts_on date,
  p_ends_on date,
  p_actuals_through date default null,
  p_assumptions jsonb default '{}'::jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  user_id uuid := auth.uid();
  business_currency text;
  normalized_name text := btrim(coalesce(p_name,''));
  normalized_type text := lower(btrim(coalesce(p_scenario_type,'budget')));
  next_version integer;
  scenario_id uuid;
begin
  if user_id is null or not private.can_manage_business_budgeting(p_business_id) then
    raise exception 'Budget management permission required.' using errcode='42501';
  end if;
  if char_length(normalized_name) not between 2 and 120 then raise exception 'Scenario name must contain 2 to 120 characters.' using errcode='22023'; end if;
  if normalized_type not in ('budget','forecast') then raise exception 'Unsupported scenario type.' using errcode='22023'; end if;
  if p_starts_on is null or p_ends_on is null or p_starts_on<>date_trunc('month',p_starts_on)::date
     or p_ends_on<>(date_trunc('month',p_ends_on)+interval '1 month - 1 day')::date
     or p_ends_on<p_starts_on or p_ends_on>p_starts_on+interval '35 months' then
    raise exception 'Scenario requires complete monthly boundaries covering no more than 36 months.' using errcode='22023';
  end if;
  if normalized_type='forecast' and p_actuals_through is null then
    raise exception 'Forecast scenarios require an actuals-through date.' using errcode='22023';
  end if;
  if p_actuals_through is not null and (p_actuals_through<p_starts_on-1 or p_actuals_through>p_ends_on) then
    raise exception 'Actuals-through date falls outside the scenario range.' using errcode='22023';
  end if;
  if coalesce(jsonb_typeof(p_assumptions),'null')<>'object' then raise exception 'Scenario assumptions must be a JSON object.' using errcode='22023'; end if;

  select business.base_currency into business_currency
  from public.businesses business where business.id=p_business_id and business.status='active';
  if business_currency is null then raise exception 'Active business not found.' using errcode='P0002'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text||':'||lower(normalized_name),0));
  select coalesce(max(scenario.version_number),0)+1 into next_version
  from public.business_budget_scenarios scenario
  where scenario.business_id=p_business_id and lower(scenario.name)=lower(normalized_name);

  perform set_config('app.business_budget_action','create',true);
  insert into public.business_budget_scenarios(
    business_id,name,scenario_type,version_number,starts_on,ends_on,actuals_through,status,
    base_currency,assumptions,notes,created_by
  ) values(
    p_business_id,normalized_name,normalized_type,next_version,p_starts_on,p_ends_on,p_actuals_through,'draft',
    business_currency,coalesce(p_assumptions,'{}'::jsonb),nullif(btrim(coalesce(p_notes,'')),''),user_id
  ) returning id into scenario_id;

  return jsonb_build_object('scenario_id',scenario_id,'version_number',next_version,'status','draft');
end;
$$;

create or replace function private.upsert_business_budget_lines_internal(
  p_business_id uuid,
  p_scenario_id uuid,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  user_id uuid := auth.uid();
  scenario public.business_budget_scenarios%rowtype;
  item jsonb;
  ordinal bigint;
  line_account_id uuid;
  line_month date;
  line_amount numeric(24,6);
  line_notes text;
  saved_count integer:=0;
begin
  if user_id is null or not private.can_manage_business_budgeting(p_business_id) then
    raise exception 'Budget management permission required.' using errcode='42501';
  end if;
  select budget.* into scenario from public.business_budget_scenarios budget
  where budget.id=p_scenario_id and budget.business_id=p_business_id for update;
  if not found then raise exception 'Budget scenario not found.' using errcode='P0002'; end if;
  if scenario.status<>'draft' then raise exception 'Only draft budget scenarios can be edited.' using errcode='55000'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>1500 then
    raise exception 'Budget update requires 1 to 1500 lines.' using errcode='22023';
  end if;

  for item,ordinal in select value,ordinality from jsonb_array_elements(p_lines) with ordinality loop
    begin
      line_account_id:=(item->>'account_id')::uuid;
      line_month:=(item->>'month_start')::date;
      line_amount:=coalesce((item->>'amount_base')::numeric,0);
      line_notes:=nullif(btrim(coalesce(item->>'notes','')),'');
    exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
      raise exception 'Budget line % contains an invalid account, month, or amount.',ordinal using errcode='22023';
    end;
    if line_month<>date_trunc('month',line_month)::date or line_month<scenario.starts_on or line_month>scenario.ends_on then
      raise exception 'Budget line % month falls outside the scenario.',ordinal using errcode='22008';
    end if;
    if abs(line_amount)>999999999999999999::numeric then raise exception 'Budget line % amount is too large.',ordinal using errcode='22003'; end if;
    if line_notes is not null and char_length(line_notes)>500 then raise exception 'Budget line % note is too long.',ordinal using errcode='22023'; end if;
    if not exists(
      select 1 from public.business_chart_of_accounts account
      where account.id=line_account_id and account.business_id=p_business_id and account.is_active
        and account.account_type in ('revenue','expense')
    ) then raise exception 'Budget line % requires an active revenue or expense account.',ordinal using errcode='23514'; end if;

    perform set_config('app.business_budget_action','line_upsert',true);
    if abs(line_amount)<=0.000001 and line_notes is null then
      delete from public.business_budget_lines line
      where line.business_id=p_business_id and line.scenario_id=scenario.id
        and line.account_id=line_account_id and line.month_start=line_month;
    else
      insert into public.business_budget_lines(
        business_id,scenario_id,account_id,month_start,amount_base,notes,created_by,updated_by
      ) values(p_business_id,scenario.id,line_account_id,line_month,round(line_amount,6),line_notes,user_id,user_id)
      on conflict(scenario_id,account_id,month_start) do update
      set amount_base=excluded.amount_base,notes=excluded.notes,updated_by=user_id;
    end if;
    saved_count:=saved_count+1;
  end loop;
  return jsonb_build_object('scenario_id',scenario.id,'processed_lines',saved_count);
end;
$$;

create or replace function private.copy_business_budget_scenario_internal(
  p_business_id uuid,
  p_source_scenario_id uuid,
  p_name text default null,
  p_adjustment_percent numeric default 0,
  p_scenario_type text default null,
  p_actuals_through date default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  user_id uuid:=auth.uid();
  source_row public.business_budget_scenarios%rowtype;
  normalized_name text;
  normalized_type text;
  next_version integer;
  new_id uuid;
begin
  if user_id is null or not private.can_manage_business_budgeting(p_business_id) then raise exception 'Budget management permission required.' using errcode='42501'; end if;
  if p_adjustment_percent is null or p_adjustment_percent<-100 or p_adjustment_percent>1000 then raise exception 'Adjustment must be between -100 and 1000 percent.' using errcode='22023'; end if;
  select scenario.* into source_row from public.business_budget_scenarios scenario
  where scenario.id=p_source_scenario_id and scenario.business_id=p_business_id;
  if not found then raise exception 'Source scenario not found.' using errcode='P0002'; end if;
  normalized_name:=btrim(coalesce(nullif(p_name,''),source_row.name));
  normalized_type:=lower(btrim(coalesce(nullif(p_scenario_type,''),source_row.scenario_type)));
  if normalized_type not in ('budget','forecast') then raise exception 'Unsupported scenario type.' using errcode='22023'; end if;
  if normalized_type='forecast' and coalesce(p_actuals_through,source_row.actuals_through) is null then raise exception 'Forecast scenarios require an actuals-through date.' using errcode='22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text||':'||lower(normalized_name),0));
  select coalesce(max(scenario.version_number),0)+1 into next_version
  from public.business_budget_scenarios scenario
  where scenario.business_id=p_business_id and lower(scenario.name)=lower(normalized_name);

  perform set_config('app.business_budget_action','copy',true);
  insert into public.business_budget_scenarios(
    business_id,name,scenario_type,version_number,starts_on,ends_on,actuals_through,status,base_currency,
    assumptions,notes,source_scenario_id,adjustment_percent,created_by
  ) values(
    p_business_id,normalized_name,normalized_type,next_version,source_row.starts_on,source_row.ends_on,
    case when normalized_type='forecast' then coalesce(p_actuals_through,source_row.actuals_through) else p_actuals_through end,
    'draft',source_row.base_currency,source_row.assumptions,source_row.notes,source_row.id,p_adjustment_percent,user_id
  ) returning id into new_id;

  insert into public.business_budget_lines(
    business_id,scenario_id,account_id,month_start,amount_base,notes,created_by,updated_by
  )
  select line.business_id,new_id,line.account_id,line.month_start,
         round(line.amount_base*(1+p_adjustment_percent/100),6),line.notes,user_id,user_id
  from public.business_budget_lines line
  where line.business_id=p_business_id and line.scenario_id=source_row.id;

  return jsonb_build_object('scenario_id',new_id,'version_number',next_version,'status','draft');
end;
$$;

create or replace function private.transition_business_budget_scenario_internal(
  p_business_id uuid,
  p_scenario_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  user_id uuid:=auth.uid();
  scenario public.business_budget_scenarios%rowtype;
  action_name text:=lower(btrim(coalesce(p_action,'')));
  normalized_notes text:=nullif(btrim(coalesce(p_notes,'')),'');
  line_count integer;
begin
  if user_id is null or not private.can_view_business_budgeting(p_business_id) then raise exception 'Budgeting access required.' using errcode='42501'; end if;
  select budget.* into scenario from public.business_budget_scenarios budget
  where budget.id=p_scenario_id and budget.business_id=p_business_id for update;
  if not found then raise exception 'Budget scenario not found.' using errcode='P0002'; end if;
  select count(*) into line_count from public.business_budget_lines line
  where line.business_id=p_business_id and line.scenario_id=scenario.id;

  if action_name='submit' then
    if not private.can_manage_business_budgeting(p_business_id) then raise exception 'Budget management permission required.' using errcode='42501'; end if;
    if scenario.status<>'draft' then raise exception 'Only draft scenarios can be submitted.' using errcode='55000'; end if;
    if line_count=0 then raise exception 'A scenario requires at least one budget line before submission.' using errcode='55000'; end if;
    perform set_config('app.business_budget_action','transition',true);
    update public.business_budget_scenarios set status='submitted',submitted_by=user_id,submitted_at=now(),notes=coalesce(normalized_notes,notes)
    where id=scenario.id and business_id=p_business_id;
  elsif action_name='return_to_draft' then
    if not private.can_manage_business_budgeting(p_business_id) then raise exception 'Budget management permission required.' using errcode='42501'; end if;
    if scenario.status not in ('submitted','approved') then raise exception 'Only submitted or approved scenarios can return to draft.' using errcode='55000'; end if;
    if scenario.status='approved' and not private.can_approve_business_budgeting(p_business_id) then raise exception 'Budget approval permission required.' using errcode='42501'; end if;
    perform set_config('app.business_budget_action','transition',true);
    update public.business_budget_scenarios set status='draft',submitted_by=null,submitted_at=null,approved_by=null,approved_at=null,locked_by=null,locked_at=null,notes=coalesce(normalized_notes,notes)
    where id=scenario.id and business_id=p_business_id;
  elsif action_name='approve' then
    if not private.can_approve_business_budgeting(p_business_id) then raise exception 'Budget approval permission required.' using errcode='42501'; end if;
    if scenario.status<>'submitted' then raise exception 'Only submitted scenarios can be approved.' using errcode='55000'; end if;
    perform set_config('app.business_budget_action','transition',true);
    update public.business_budget_scenarios set status='approved',approved_by=user_id,approved_at=now(),notes=coalesce(normalized_notes,notes)
    where id=scenario.id and business_id=p_business_id;
  elsif action_name='lock' then
    if not private.can_approve_business_budgeting(p_business_id) then raise exception 'Budget approval permission required.' using errcode='42501'; end if;
    if scenario.status<>'approved' then raise exception 'Only approved scenarios can be locked.' using errcode='55000'; end if;
    perform set_config('app.business_budget_action','transition',true);
    update public.business_budget_scenarios set status='locked',locked_by=user_id,locked_at=now(),notes=coalesce(normalized_notes,notes)
    where id=scenario.id and business_id=p_business_id;
  elsif action_name='archive' then
    if not private.can_approve_business_budgeting(p_business_id) then raise exception 'Budget approval permission required.' using errcode='42501'; end if;
    if scenario.status='locked' and exists(
      select 1 from public.business_budget_scenarios newer
      where newer.business_id=p_business_id and newer.id<>scenario.id and newer.status='locked'
        and daterange(newer.starts_on,newer.ends_on,'[]') && daterange(scenario.starts_on,scenario.ends_on,'[]')
    ) is false then
      raise exception 'Create and lock a replacement baseline before archiving the only locked scenario.' using errcode='55000';
    end if;
    perform set_config('app.business_budget_action','archive',true);
    update public.business_budget_scenarios set status='archived',archived_by=user_id,archived_at=now(),notes=coalesce(normalized_notes,notes)
    where id=scenario.id and business_id=p_business_id;
  else
    raise exception 'Unsupported budget transition.' using errcode='22023';
  end if;
  return jsonb_build_object('scenario_id',scenario.id,'action',action_name,'status',(select status from public.business_budget_scenarios where id=scenario.id));
end;
$$;

create or replace function private.get_business_budgeting_snapshot_internal(
  p_business_id uuid,
  p_scenario_id uuid default null,
  p_comparison_scenario_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare
  selected_id uuid;
  selected public.business_budget_scenarios%rowtype;
  business_currency text;
  snapshot jsonb;
  liquid_cash numeric(24,6):=0;
  future_expense_total numeric(24,6):=0;
  future_months integer:=0;
  runway numeric;
begin
  if auth.uid() is null or not private.can_view_business_budgeting(p_business_id) then raise exception 'Budgeting access required.' using errcode='42501'; end if;
  select business.base_currency into business_currency from public.businesses business where business.id=p_business_id and business.status='active';
  if business_currency is null then raise exception 'Active business not found.' using errcode='P0002'; end if;

  if p_scenario_id is not null then
    select scenario.id into selected_id from public.business_budget_scenarios scenario
    where scenario.id=p_scenario_id and scenario.business_id=p_business_id and scenario.status<>'archived';
  end if;
  if selected_id is null then
    select scenario.id into selected_id from public.business_budget_scenarios scenario
    where scenario.business_id=p_business_id and scenario.status<>'archived'
    order by case scenario.status when 'locked' then 0 when 'approved' then 1 when 'submitted' then 2 else 3 end,
             scenario.starts_on desc,scenario.created_at desc limit 1;
  end if;
  if selected_id is not null then select scenario.* into selected from public.business_budget_scenarios scenario where scenario.id=selected_id; end if;

  if selected_id is not null then
    select coalesce(sum(bank.opening_balance_base + coalesce(movement.net_movement,0)),0)
    into liquid_cash
    from public.business_bank_accounts bank
    left join lateral(
      select sum(line.debit_base-line.credit_base) as net_movement
      from public.business_journal_lines line
      join public.business_journal_entries entry on entry.business_id=line.business_id and entry.id=line.journal_entry_id
      where line.business_id=bank.business_id and line.account_id=bank.ledger_account_id
        and entry.status in ('posted','reversed') and entry.entry_date between bank.reconciliation_start_date and least(current_date,selected.ends_on)
    ) movement on true
    where bank.business_id=p_business_id and bank.is_active and bank.account_kind in ('bank','cash','mobile_wallet');

    select coalesce(sum(line.amount_base),0),count(distinct line.month_start)
    into future_expense_total,future_months
    from public.business_budget_lines line
    join public.business_chart_of_accounts account on account.business_id=line.business_id and account.id=line.account_id
    where line.business_id=p_business_id and line.scenario_id=selected.id and account.account_type='expense'
      and line.month_start>date_trunc('month',coalesce(selected.actuals_through,current_date))::date;
    runway:=case when future_months>0 and future_expense_total>0 then round(liquid_cash/(future_expense_total/future_months),2) else null end;
  end if;

  with scenarios as(
    select scenario.* from public.business_budget_scenarios scenario where scenario.business_id=p_business_id
  ), months as(
    select generate_series(selected.starts_on,selected.ends_on,interval '1 month')::date as month_start
    where selected_id is not null
  ), accounts as(
    select account.id,account.code,account.name,account.account_type,account.normal_balance
    from public.business_chart_of_accounts account
    where account.business_id=p_business_id and account.is_active and account.account_type in ('revenue','expense')
  ), actuals as(
    select line.account_id,date_trunc('month',entry.entry_date)::date as month_start,
           round(sum(case when account.normal_balance='debit' then line.debit_base-line.credit_base else line.credit_base-line.debit_base end),6) as actual_base
    from public.business_journal_lines line
    join public.business_journal_entries entry on entry.business_id=line.business_id and entry.id=line.journal_entry_id
    join public.business_chart_of_accounts account on account.business_id=line.business_id and account.id=line.account_id
    where line.business_id=p_business_id and entry.status in ('posted','reversed')
      and selected_id is not null and entry.entry_date between selected.starts_on and selected.ends_on
      and account.account_type in ('revenue','expense')
    group by line.account_id,date_trunc('month',entry.entry_date)
  ), budget as(
    select line.account_id,line.month_start,line.amount_base,line.notes
    from public.business_budget_lines line where line.business_id=p_business_id and line.scenario_id=selected_id
  ), comparison as(
    select line.account_id,line.month_start,line.amount_base
    from public.business_budget_lines line where line.business_id=p_business_id and line.scenario_id=p_comparison_scenario_id
  ), matrix as(
    select account.id as account_id,account.code,account.name,account.account_type,account.normal_balance,month.month_start,
           coalesce(budget.amount_base,0) as budget_base,coalesce(actuals.actual_base,0) as actual_base,
           coalesce(comparison.amount_base,0) as comparison_base,budget.notes,
           case when selected.scenario_type='forecast' and selected.actuals_through is not null
                     and month.month_start<=date_trunc('month',selected.actuals_through)::date
                then coalesce(actuals.actual_base,0) else coalesce(budget.amount_base,0) end as projected_base
    from accounts account cross join months month
    left join budget on budget.account_id=account.id and budget.month_start=month.month_start
    left join actuals on actuals.account_id=account.id and actuals.month_start=month.month_start
    left join comparison on comparison.account_id=account.id and comparison.month_start=month.month_start
  ), month_totals as(
    select month_start,
      sum(budget_base) filter(where account_type='revenue') as budget_revenue,
      sum(budget_base) filter(where account_type='expense') as budget_expense,
      sum(actual_base) filter(where account_type='revenue') as actual_revenue,
      sum(actual_base) filter(where account_type='expense') as actual_expense,
      sum(projected_base) filter(where account_type='revenue') as projected_revenue,
      sum(projected_base) filter(where account_type='expense') as projected_expense,
      sum(comparison_base) filter(where account_type='revenue') as comparison_revenue,
      sum(comparison_base) filter(where account_type='expense') as comparison_expense
    from matrix group by month_start
  ), account_totals as(
    select account_id,code,name,account_type,normal_balance,
      sum(budget_base) as budget_base,sum(actual_base) as actual_base,sum(projected_base) as projected_base,
      sum(comparison_base) as comparison_base,
      case when account_type='revenue' then sum(actual_base-budget_base) else sum(budget_base-actual_base) end as favourable_variance_base,
      jsonb_agg(jsonb_build_object(
        'month_start',month_start,'budget_base',budget_base,'actual_base',actual_base,'projected_base',projected_base,
        'comparison_base',comparison_base,'notes',notes
      ) order by month_start) as months
    from matrix group by account_id,code,name,account_type,normal_balance
  )
  select jsonb_build_object(
    'business_id',p_business_id,'base_currency',business_currency,
    'can_manage',private.can_manage_business_budgeting(p_business_id),
    'can_approve',private.can_approve_business_budgeting(p_business_id),
    'selected_scenario_id',selected_id,
    'comparison_scenario_id',p_comparison_scenario_id,
    'scenarios',coalesce((select jsonb_agg(jsonb_build_object(
      'id',scenario.id,'name',scenario.name,'scenario_type',scenario.scenario_type,'version_number',scenario.version_number,
      'starts_on',scenario.starts_on,'ends_on',scenario.ends_on,'actuals_through',scenario.actuals_through,'status',scenario.status,
      'assumptions',scenario.assumptions,'notes',scenario.notes,'source_scenario_id',scenario.source_scenario_id,
      'adjustment_percent',scenario.adjustment_percent,'created_at',scenario.created_at,'submitted_at',scenario.submitted_at,
      'approved_at',scenario.approved_at,'locked_at',scenario.locked_at
    ) order by case scenario.status when 'locked' then 0 when 'approved' then 1 when 'submitted' then 2 when 'draft' then 3 else 4 end,scenario.starts_on desc,scenario.created_at desc) from scenarios),'[]'::jsonb),
    'months',coalesce((select jsonb_agg(jsonb_build_object(
      'month_start',month_start,
      'budget_revenue',coalesce(budget_revenue,0),'budget_expense',coalesce(budget_expense,0),'budget_net',coalesce(budget_revenue,0)-coalesce(budget_expense,0),
      'actual_revenue',coalesce(actual_revenue,0),'actual_expense',coalesce(actual_expense,0),'actual_net',coalesce(actual_revenue,0)-coalesce(actual_expense,0),
      'projected_revenue',coalesce(projected_revenue,0),'projected_expense',coalesce(projected_expense,0),'projected_net',coalesce(projected_revenue,0)-coalesce(projected_expense,0),
      'comparison_revenue',coalesce(comparison_revenue,0),'comparison_expense',coalesce(comparison_expense,0),'comparison_net',coalesce(comparison_revenue,0)-coalesce(comparison_expense,0)
    ) order by month_start) from month_totals),'[]'::jsonb),
    'accounts',coalesce((select jsonb_agg(jsonb_build_object(
      'account_id',account_id,'code',code,'name',name,'account_type',account_type,'normal_balance',normal_balance,
      'budget_base',coalesce(budget_base,0),'actual_base',coalesce(actual_base,0),'projected_base',coalesce(projected_base,0),
      'comparison_base',coalesce(comparison_base,0),'favourable_variance_base',coalesce(favourable_variance_base,0),'months',months
    ) order by case account_type when 'revenue' then 0 else 1 end,code) from account_totals),'[]'::jsonb),
    'summary',jsonb_build_object(
      'budget_revenue',coalesce((select sum(budget_revenue) from month_totals),0),
      'budget_expense',coalesce((select sum(budget_expense) from month_totals),0),
      'budget_net',coalesce((select sum(budget_revenue)-sum(budget_expense) from month_totals),0),
      'actual_revenue',coalesce((select sum(actual_revenue) from month_totals),0),
      'actual_expense',coalesce((select sum(actual_expense) from month_totals),0),
      'actual_net',coalesce((select sum(actual_revenue)-sum(actual_expense) from month_totals),0),
      'projected_revenue',coalesce((select sum(projected_revenue) from month_totals),0),
      'projected_expense',coalesce((select sum(projected_expense) from month_totals),0),
      'projected_net',coalesce((select sum(projected_revenue)-sum(projected_expense) from month_totals),0),
      'liquid_cash_base',liquid_cash,'projected_expense_runway_months',runway
    )
  ) into snapshot;
  return snapshot;
end;
$$;

create or replace function public.create_business_budget_scenario(
  p_business_id uuid,p_name text,p_scenario_type text,p_starts_on date,p_ends_on date,
  p_actuals_through date default null,p_assumptions jsonb default '{}'::jsonb,p_notes text default null
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.create_business_budget_scenario_internal(p_business_id,p_name,p_scenario_type,p_starts_on,p_ends_on,p_actuals_through,p_assumptions,p_notes);$$;
create or replace function public.upsert_business_budget_lines(p_business_id uuid,p_scenario_id uuid,p_lines jsonb)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.upsert_business_budget_lines_internal(p_business_id,p_scenario_id,p_lines);$$;
create or replace function public.copy_business_budget_scenario(
  p_business_id uuid,p_source_scenario_id uuid,p_name text default null,p_adjustment_percent numeric default 0,
  p_scenario_type text default null,p_actuals_through date default null
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.copy_business_budget_scenario_internal(p_business_id,p_source_scenario_id,p_name,p_adjustment_percent,p_scenario_type,p_actuals_through);$$;
create or replace function public.transition_business_budget_scenario(p_business_id uuid,p_scenario_id uuid,p_action text,p_notes text default null)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.transition_business_budget_scenario_internal(p_business_id,p_scenario_id,p_action,p_notes);$$;
create or replace function public.get_business_budgeting_snapshot(p_business_id uuid,p_scenario_id uuid default null,p_comparison_scenario_id uuid default null)
returns jsonb language sql stable set search_path=pg_catalog,public,private
as $$select private.get_business_budgeting_snapshot_internal(p_business_id,p_scenario_id,p_comparison_scenario_id);$$;

revoke all on function private.create_business_budget_scenario_internal(uuid,text,text,date,date,date,jsonb,text) from public;
revoke all on function private.upsert_business_budget_lines_internal(uuid,uuid,jsonb) from public;
revoke all on function private.copy_business_budget_scenario_internal(uuid,uuid,text,numeric,text,date) from public;
revoke all on function private.transition_business_budget_scenario_internal(uuid,uuid,text,text) from public;
revoke all on function private.get_business_budgeting_snapshot_internal(uuid,uuid,uuid) from public;
grant execute on function private.create_business_budget_scenario_internal(uuid,text,text,date,date,date,jsonb,text) to authenticated;
grant execute on function private.upsert_business_budget_lines_internal(uuid,uuid,jsonb) to authenticated;
grant execute on function private.copy_business_budget_scenario_internal(uuid,uuid,text,numeric,text,date) to authenticated;
grant execute on function private.transition_business_budget_scenario_internal(uuid,uuid,text,text) to authenticated;
grant execute on function private.get_business_budgeting_snapshot_internal(uuid,uuid,uuid) to authenticated;

revoke all on function public.create_business_budget_scenario(uuid,text,text,date,date,date,jsonb,text) from public,anon;
revoke all on function public.upsert_business_budget_lines(uuid,uuid,jsonb) from public,anon;
revoke all on function public.copy_business_budget_scenario(uuid,uuid,text,numeric,text,date) from public,anon;
revoke all on function public.transition_business_budget_scenario(uuid,uuid,text,text) from public,anon;
revoke all on function public.get_business_budgeting_snapshot(uuid,uuid,uuid) from public,anon;
grant execute on function public.create_business_budget_scenario(uuid,text,text,date,date,date,jsonb,text) to authenticated;
grant execute on function public.upsert_business_budget_lines(uuid,uuid,jsonb) to authenticated;
grant execute on function public.copy_business_budget_scenario(uuid,uuid,text,numeric,text,date) to authenticated;
grant execute on function public.transition_business_budget_scenario(uuid,uuid,text,text) to authenticated;
grant execute on function public.get_business_budgeting_snapshot(uuid,uuid,uuid) to authenticated;
