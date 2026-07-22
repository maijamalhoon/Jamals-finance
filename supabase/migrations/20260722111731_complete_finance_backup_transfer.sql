create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists private.finance_data_imports (
  target_user_id uuid not null references auth.users(id) on delete cascade,
  backup_id uuid not null,
  source_owner_id uuid not null,
  exported_at timestamptz,
  imported_at timestamptz not null default now(),
  added_counts jsonb not null default '{}'::jsonb,
  skipped_counts jsonb not null default '{}'::jsonb,
  primary key (target_user_id, backup_id)
);

create index if not exists finance_data_imports_source_lookup_idx
  on private.finance_data_imports (target_user_id, source_owner_id, imported_at desc);

revoke all on table private.finance_data_imports from public, anon, authenticated;
grant select, insert, update, delete on table private.finance_data_imports to service_role;

create or replace function private.finance_import_uuid(
  p_target_user_id uuid,
  p_source_owner_id uuid,
  p_source_table text,
  p_source_record_id uuid
)
returns uuid
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when p_target_user_id = p_source_owner_id then p_source_record_id
    else (
      with digest as (
        select md5(
          p_target_user_id::text || '|' ||
          p_source_owner_id::text || '|' ||
          p_source_table || '|' ||
          p_source_record_id::text
        ) as value
      )
      select (
        substr(value, 1, 8) || '-' ||
        substr(value, 9, 4) || '-' ||
        substr(value, 13, 4) || '-' ||
        substr(value, 17, 4) || '-' ||
        substr(value, 21, 12)
      )::uuid
      from digest
    )
  end;
$$;

revoke execute on function private.finance_import_uuid(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function private.finance_import_uuid(uuid, uuid, text, uuid)
  to service_role;

create or replace function private.finance_import_row_exists(
  p_table regclass,
  p_target_user_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  row_exists boolean;
begin
  if p_table::oid <> all(array[
    'public.accounts'::regclass::oid,
    'public.categories'::regclass::oid,
    'public.transactions'::regclass::oid,
    'public.investments'::regclass::oid,
    'public.goals'::regclass::oid,
    'public.goal_contributions'::regclass::oid,
    'public.liabilities'::regclass::oid,
    'public.liability_payments'::regclass::oid,
    'public.account_transfers'::regclass::oid,
    'public.investment_withdrawals'::regclass::oid
  ]) then
    raise exception 'Unsupported finance backup table.' using errcode = '22023';
  end if;

  execute format(
    'select exists(select 1 from %s where id = $1 and user_id = $2)',
    p_table
  )
  into row_exists
  using p_target_id, p_target_user_id;

  return coalesce(row_exists, false);
end;
$$;

revoke execute on function private.finance_import_row_exists(regclass, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.finance_import_row_exists(regclass, uuid, uuid)
  to service_role;

create or replace function private.resolve_finance_import_reference(
  p_target_user_id uuid,
  p_source_owner_id uuid,
  p_source_table text,
  p_source_record_id text,
  p_required boolean default true
)
returns uuid
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  source_id uuid;
  target_id uuid;
  target_table regclass;
begin
  if nullif(btrim(coalesce(p_source_record_id, '')), '') is null then
    return null;
  end if;

  begin
    source_id := p_source_record_id::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Backup contains an invalid % reference.', p_source_table
        using errcode = '22023';
  end;

  target_table := case p_source_table
    when 'accounts' then 'public.accounts'::regclass
    when 'categories' then 'public.categories'::regclass
    when 'transactions' then 'public.transactions'::regclass
    when 'investments' then 'public.investments'::regclass
    when 'goals' then 'public.goals'::regclass
    when 'goal_contributions' then 'public.goal_contributions'::regclass
    when 'liabilities' then 'public.liabilities'::regclass
    when 'liability_payments' then 'public.liability_payments'::regclass
    when 'account_transfers' then 'public.account_transfers'::regclass
    when 'investment_withdrawals' then 'public.investment_withdrawals'::regclass
    else null
  end;

  if target_table is null then
    raise exception 'Unsupported finance backup reference.' using errcode = '22023';
  end if;

  target_id := private.finance_import_uuid(
    p_target_user_id,
    p_source_owner_id,
    p_source_table,
    source_id
  );

  if private.finance_import_row_exists(target_table, p_target_user_id, target_id) then
    return target_id;
  end if;

  if p_required then
    raise exception 'Backup relation is incomplete for %.', p_source_table
      using errcode = '23503';
  end if;

  return null;
end;
$$;

revoke execute on function private.resolve_finance_import_reference(uuid, uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function private.resolve_finance_import_reference(uuid, uuid, text, text, boolean)
  to service_role;

create or replace function private.insert_finance_backup_row(
  p_table regclass,
  p_payload jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  column_list text;
  value_list text;
  inserted_id uuid;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Backup row must be a JSON object.' using errcode = '22023';
  end if;

  if p_table::oid <> all(array[
    'public.accounts'::regclass::oid,
    'public.categories'::regclass::oid,
    'public.transactions'::regclass::oid,
    'public.investments'::regclass::oid,
    'public.goals'::regclass::oid,
    'public.goal_contributions'::regclass::oid,
    'public.liabilities'::regclass::oid,
    'public.liability_payments'::regclass::oid,
    'public.account_transfers'::regclass::oid,
    'public.investment_withdrawals'::regclass::oid
  ]) then
    raise exception 'Unsupported finance backup table.' using errcode = '22023';
  end if;

  select
    string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum),
    string_agg(
      format(
        '(pg_catalog.jsonb_populate_record(null::%s, $1)).%I',
        p_table,
        attribute.attname
      ),
      ', ' order by attribute.attnum
    )
  into column_list, value_list
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = p_table
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attgenerated = ''
    and attribute.attidentity = '';

  if column_list is null or value_list is null then
    raise exception 'Backup table has no importable columns.' using errcode = '55000';
  end if;

  execute format(
    'insert into %s (%s) select %s returning id',
    p_table,
    column_list,
    value_list
  )
  into inserted_id
  using p_payload;

  return inserted_id;
end;
$$;

revoke execute on function private.insert_finance_backup_row(regclass, jsonb)
  from public, anon, authenticated;
grant execute on function private.insert_finance_backup_row(regclass, jsonb)
  to service_role;

create or replace function public.export_finance_backup()
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  generated_at timestamptz := now();
  backup_id uuid := gen_random_uuid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'format', 'jamals-finance-backup',
    'version', 1,
    'backupId', backup_id,
    'exportedAt', generated_at,
    'source', jsonb_build_object(
      'ownerId', current_user_id,
      'app', 'jamals-finance'
    ),
    'profileSnapshot', (
      select to_jsonb(profile)
      from public.profiles profile
      where profile.id = current_user_id
    ),
    'preferencesSnapshot', jsonb_build_object(
      'notifications', (
        select to_jsonb(preference)
        from public.notification_preferences preference
        where preference.user_id = current_user_id
      ),
      'notificationStates', coalesce((
        select jsonb_agg(to_jsonb(state) order by state.notification_id)
        from public.notification_states state
        where state.user_id = current_user_id
      ), '[]'::jsonb)
    ),
    'data', jsonb_build_object(
      'accounts', coalesce((
        select jsonb_agg(to_jsonb(account) order by account.created_at nulls first, account.id)
        from public.accounts account
        where account.user_id = current_user_id
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(to_jsonb(category) order by category.created_at nulls first, category.id)
        from public.categories category
        where category.user_id = current_user_id
      ), '[]'::jsonb),
      'investments', coalesce((
        select jsonb_agg(to_jsonb(investment) order by investment.created_at nulls first, investment.id)
        from public.investments investment
        where investment.user_id = current_user_id
      ), '[]'::jsonb),
      'goals', coalesce((
        select jsonb_agg(to_jsonb(goal) order by goal.created_at nulls first, goal.id)
        from public.goals goal
        where goal.user_id = current_user_id
      ), '[]'::jsonb),
      'liabilities', coalesce((
        select jsonb_agg(to_jsonb(liability) order by liability.created_at nulls first, liability.id)
        from public.liabilities liability
        where liability.user_id = current_user_id
      ), '[]'::jsonb),
      'goalContributions', coalesce((
        select jsonb_agg(to_jsonb(contribution) order by contribution.created_at, contribution.id)
        from public.goal_contributions contribution
        where contribution.user_id = current_user_id
      ), '[]'::jsonb),
      'transactions', coalesce((
        select jsonb_agg(to_jsonb(transaction) order by transaction.created_at nulls first, transaction.id)
        from public.transactions transaction
        where transaction.user_id = current_user_id
      ), '[]'::jsonb),
      'accountTransfers', coalesce((
        select jsonb_agg(to_jsonb(transfer) order by transfer.created_at, transfer.id)
        from public.account_transfers transfer
        where transfer.user_id = current_user_id
      ), '[]'::jsonb),
      'liabilityPayments', coalesce((
        select jsonb_agg(to_jsonb(payment) order by payment.created_at nulls first, payment.id)
        from public.liability_payments payment
        where payment.user_id = current_user_id
      ), '[]'::jsonb),
      'investmentWithdrawals', coalesce((
        select jsonb_agg(to_jsonb(withdrawal) order by withdrawal.created_at, withdrawal.id)
        from public.investment_withdrawals withdrawal
        where withdrawal.user_id = current_user_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.export_finance_backup() from public, anon;
grant execute on function public.export_finance_backup() to authenticated, service_role;

create or replace function public.import_finance_backup(p_backup jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_target_user_id uuid := auth.uid();
  v_source_owner_id uuid;
  v_backup_id uuid;
  v_exported_at timestamptz;
  backup_data jsonb;
  backup_key text;
  backup_size integer;
  total_records integer := 0;

  backup_row jsonb;
  source_id uuid;
  v_target_id uuid;
  reference_id uuid;
  parent_id uuid;
  source_reference text;
  row_payload jsonb;

  account_status text;
  account_archived_at timestamptz;
  account_opening_balance numeric;
  account_final_balance numeric;

  category_progress integer;
  category_remaining integer;

  added_accounts integer := 0;
  added_categories integer := 0;
  added_investments integer := 0;
  added_goals integer := 0;
  added_liabilities integer := 0;
  added_goal_contributions integer := 0;
  added_transactions integer := 0;
  added_account_transfers integer := 0;
  added_liability_payments integer := 0;
  added_investment_withdrawals integer := 0;

  skipped_accounts integer := 0;
  skipped_categories integer := 0;
  skipped_investments integer := 0;
  skipped_goals integer := 0;
  skipped_liabilities integer := 0;
  skipped_goal_contributions integer := 0;
  skipped_transactions integer := 0;
  skipped_account_transfers integer := 0;
  skipped_liability_payments integer := 0;
  skipped_investment_withdrawals integer := 0;

  v_added_counts jsonb;
  v_skipped_counts jsonb;
  existing_v_added_counts jsonb;
  existing_v_skipped_counts jsonb;
begin
  if v_target_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'This backup file is invalid.' using errcode = '22023';
  end if;

  backup_size := pg_column_size(p_backup);
  if backup_size > 25 * 1024 * 1024 then
    raise exception 'This backup file is too large.' using errcode = '54000';
  end if;

  if p_backup->>'format' <> 'jamals-finance-backup' then
    raise exception 'This is not a Jamal''s Finance backup.' using errcode = '22023';
  end if;

  if coalesce(p_backup->>'version', '') !~ '^[0-9]+$'
    or (p_backup->>'version')::integer <> 1
  then
    raise exception 'This backup version is not supported.' using errcode = '22023';
  end if;

  begin
    v_backup_id := (p_backup->>'backupId')::uuid;
    v_source_owner_id := (p_backup#>>'{source,ownerId}')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Backup identity is invalid.' using errcode = '22023';
  end;

  begin
    v_exported_at := nullif(p_backup->>'exportedAt', '')::timestamptz;
  exception
    when invalid_datetime_format then
      raise exception 'Backup export date is invalid.' using errcode = '22023';
  end;

  backup_data := p_backup->'data';
  if backup_data is null or jsonb_typeof(backup_data) <> 'object' then
    raise exception 'Backup data is missing.' using errcode = '22023';
  end if;

  foreach backup_key in array array[
    'accounts',
    'categories',
    'investments',
    'goals',
    'liabilities',
    'goalContributions',
    'transactions',
    'accountTransfers',
    'liabilityPayments',
    'investmentWithdrawals'
  ] loop
    if jsonb_typeof(backup_data->backup_key) <> 'array' then
      raise exception 'Backup section % is invalid.', backup_key using errcode = '22023';
    end if;
    total_records := total_records + jsonb_array_length(backup_data->backup_key);
  end loop;

  if total_records > 100000 then
    raise exception 'This backup contains too many records.' using errcode = '54000';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_target_user_id::text || ':' || v_source_owner_id::text, 0)
  );

  select import.added_counts, import.skipped_counts
  into existing_v_added_counts, existing_v_skipped_counts
  from private.finance_data_imports import
  where import.target_user_id = v_target_user_id
    and import.backup_id = v_backup_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'alreadyImported', true,
      'backupId', v_backup_id,
      'added', coalesce(existing_v_added_counts, '{}'::jsonb),
      'skipped', coalesce(existing_v_skipped_counts, '{}'::jsonb),
      'totalAdded', 0
    );
  end if;

  create temporary table finance_import_account_state (
    target_id uuid primary key,
    desired_status text not null,
    desired_archived_at timestamptz,
    desired_balance numeric,
    is_new boolean not null
  ) on commit drop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'accounts')
  loop
    if jsonb_typeof(backup_row) <> 'object' then
      raise exception 'Backup contains an invalid account row.' using errcode = '22023';
    end if;

    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(
      v_target_user_id,
      v_source_owner_id,
      'accounts',
      source_id
    );

    if private.finance_import_row_exists('public.accounts'::regclass, v_target_user_id, v_target_id) then
      insert into pg_temp.finance_import_account_state (
        target_id,
        desired_status,
        desired_archived_at,
        desired_balance,
        is_new
      )
      select account.id, account.status, account.archived_at, account.balance, false
      from public.accounts account
      where account.id = v_target_id and account.user_id = v_target_user_id
      on conflict (target_id) do nothing;

      skipped_accounts := skipped_accounts + 1;
      continue;
    end if;

    account_status := case
      when backup_row->>'status' = 'archived' then 'archived'
      else 'active'
    end;
    account_archived_at := nullif(backup_row->>'archived_at', '')::timestamptz;
    account_final_balance := coalesce(nullif(backup_row->>'balance', '')::numeric, 0);

    if backup_row ? 'opening_balance_original' then
      account_opening_balance :=
        coalesce(nullif(backup_row->>'opening_balance_original', '')::numeric, 0)
        * coalesce(nullif(backup_row->>'opening_exchange_rate_to_pkr', '')::numeric, 1);
    else
      account_opening_balance := account_final_balance;
    end if;

    if account_final_balance::text in ('NaN', 'Infinity', '-Infinity')
      or account_opening_balance::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Backup contains an invalid account balance.' using errcode = '22023';
    end if;

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'balance', account_opening_balance,
      'status', 'active',
      'archived_at', null
    );

    perform private.insert_finance_backup_row('public.accounts'::regclass, row_payload);

    insert into pg_temp.finance_import_account_state (
      target_id,
      desired_status,
      desired_archived_at,
      desired_balance,
      is_new
    ) values (
      v_target_id,
      account_status,
      account_archived_at,
      account_final_balance,
      true
    );

    added_accounts := added_accounts + 1;
  end loop;

  update public.accounts account
  set status = 'active', archived_at = null
  from pg_temp.finance_import_account_state state
  where account.id = state.target_id
    and account.user_id = v_target_user_id;

  loop
    category_progress := 0;
    category_remaining := 0;

    for backup_row in
      select value from jsonb_array_elements(backup_data->'categories')
    loop
      if jsonb_typeof(backup_row) <> 'object' then
        raise exception 'Backup contains an invalid category row.' using errcode = '22023';
      end if;

      source_id := (backup_row->>'id')::uuid;
      v_target_id := private.finance_import_uuid(
        v_target_user_id,
        v_source_owner_id,
        'categories',
        source_id
      );

      if private.finance_import_row_exists('public.categories'::regclass, v_target_user_id, v_target_id) then
        continue;
      end if;

      category_remaining := category_remaining + 1;
      source_reference := nullif(backup_row->>'parent_id', '');
      parent_id := private.resolve_finance_import_reference(
        v_target_user_id,
        v_source_owner_id,
        'categories',
        source_reference,
        false
      );

      if source_reference is not null and parent_id is null then
        continue;
      end if;

      row_payload := backup_row || jsonb_build_object(
        'id', v_target_id,
        'user_id', v_target_user_id,
        'parent_id', parent_id
      );

      perform private.insert_finance_backup_row('public.categories'::regclass, row_payload);
      added_categories := added_categories + 1;
      category_progress := category_progress + 1;
    end loop;

    exit when category_remaining = 0;

    if category_progress = 0 then
      raise exception 'Backup contains unresolved category relationships.' using errcode = '23503';
    end if;
  end loop;

  skipped_categories := jsonb_array_length(backup_data->'categories') - added_categories;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'investments')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(v_target_user_id, v_source_owner_id, 'investments', source_id);

    if private.finance_import_row_exists('public.investments'::regclass, v_target_user_id, v_target_id) then
      skipped_investments := skipped_investments + 1;
      continue;
    end if;

    row_payload := backup_row || jsonb_build_object('id', v_target_id, 'user_id', v_target_user_id);
    perform private.insert_finance_backup_row('public.investments'::regclass, row_payload);
    added_investments := added_investments + 1;
  end loop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'goals')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(v_target_user_id, v_source_owner_id, 'goals', source_id);

    if private.finance_import_row_exists('public.goals'::regclass, v_target_user_id, v_target_id) then
      skipped_goals := skipped_goals + 1;
      continue;
    end if;

    reference_id := private.resolve_finance_import_reference(
      v_target_user_id,
      v_source_owner_id,
      'accounts',
      backup_row->>'account_id',
      true
    );

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'account_id', reference_id
    );
    perform private.insert_finance_backup_row('public.goals'::regclass, row_payload);
    added_goals := added_goals + 1;
  end loop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'liabilities')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(v_target_user_id, v_source_owner_id, 'liabilities', source_id);

    if private.finance_import_row_exists('public.liabilities'::regclass, v_target_user_id, v_target_id) then
      skipped_liabilities := skipped_liabilities + 1;
      continue;
    end if;

    reference_id := private.resolve_finance_import_reference(
      v_target_user_id,
      v_source_owner_id,
      'accounts',
      backup_row->>'account_id',
      true
    );

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'account_id', reference_id
    );

    if exists (
      select 1
      from jsonb_array_elements(backup_data->'liabilityPayments') payment
      where payment->>'liability_id' = source_id::text
    ) then
      row_payload := row_payload || jsonb_build_object('paid_amount', 0);
    end if;

    perform private.insert_finance_backup_row('public.liabilities'::regclass, row_payload);
    added_liabilities := added_liabilities + 1;
  end loop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'goalContributions')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(
      v_target_user_id,
      v_source_owner_id,
      'goal_contributions',
      source_id
    );

    if private.finance_import_row_exists('public.goal_contributions'::regclass, v_target_user_id, v_target_id) then
      skipped_goal_contributions := skipped_goal_contributions + 1;
      continue;
    end if;

    parent_id := private.resolve_finance_import_reference(
      v_target_user_id,
      v_source_owner_id,
      'goals',
      backup_row->>'goal_id',
      true
    );
    reference_id := private.resolve_finance_import_reference(
      v_target_user_id,
      v_source_owner_id,
      'accounts',
      backup_row->>'account_id',
      true
    );

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'goal_id', parent_id,
      'account_id', reference_id
    );
    perform private.insert_finance_backup_row('public.goal_contributions'::regclass, row_payload);
    added_goal_contributions := added_goal_contributions + 1;
  end loop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'accountTransfers')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(
      v_target_user_id,
      v_source_owner_id,
      'account_transfers',
      source_id
    );

    if private.finance_import_row_exists('public.account_transfers'::regclass, v_target_user_id, v_target_id) then
      skipped_account_transfers := skipped_account_transfers + 1;
      continue;
    end if;

    parent_id := private.resolve_finance_import_reference(
      v_target_user_id,
      v_source_owner_id,
      'accounts',
      backup_row->>'from_account_id',
      true
    );
    reference_id := private.resolve_finance_import_reference(
      v_target_user_id,
      v_source_owner_id,
      'accounts',
      backup_row->>'to_account_id',
      true
    );

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'from_account_id', parent_id,
      'to_account_id', reference_id
    );
    perform private.insert_finance_backup_row('public.account_transfers'::regclass, row_payload);
    added_account_transfers := added_account_transfers + 1;
  end loop;

  for backup_row in
    select value
    from jsonb_array_elements(backup_data->'transactions')
    where coalesce(value->>'type', '') <> 'refund'
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(v_target_user_id, v_source_owner_id, 'transactions', source_id);

    if private.finance_import_row_exists('public.transactions'::regclass, v_target_user_id, v_target_id) then
      skipped_transactions := skipped_transactions + 1;
      continue;
    end if;

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'account_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'accounts', backup_row->>'account_id', true
      ),
      'category_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'categories', backup_row->>'category_id', true
      ),
      'investment_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'investments', backup_row->>'investment_id', true
      ),
      'goal_contribution_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'goal_contributions', backup_row->>'goal_contribution_id', true
      ),
      'refund_of_transaction_id', null
    );

    perform private.insert_finance_backup_row('public.transactions'::regclass, row_payload);
    added_transactions := added_transactions + 1;
  end loop;

  for backup_row in
    select value
    from jsonb_array_elements(backup_data->'transactions')
    where value->>'type' = 'refund'
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(v_target_user_id, v_source_owner_id, 'transactions', source_id);

    if private.finance_import_row_exists('public.transactions'::regclass, v_target_user_id, v_target_id) then
      skipped_transactions := skipped_transactions + 1;
      continue;
    end if;

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'account_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'accounts', backup_row->>'account_id', true
      ),
      'category_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'categories', backup_row->>'category_id', true
      ),
      'investment_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'investments', backup_row->>'investment_id', true
      ),
      'goal_contribution_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'goal_contributions', backup_row->>'goal_contribution_id', true
      ),
      'refund_of_transaction_id', private.resolve_finance_import_reference(
        v_target_user_id,
        v_source_owner_id,
        'transactions',
        backup_row->>'refund_of_transaction_id',
        backup_row->>'deleted_at' is null
      )
    );

    perform private.insert_finance_backup_row('public.transactions'::regclass, row_payload);
    added_transactions := added_transactions + 1;
  end loop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'liabilityPayments')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(
      v_target_user_id,
      v_source_owner_id,
      'liability_payments',
      source_id
    );

    if private.finance_import_row_exists('public.liability_payments'::regclass, v_target_user_id, v_target_id) then
      skipped_liability_payments := skipped_liability_payments + 1;
      continue;
    end if;

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'liability_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'liabilities', backup_row->>'liability_id', true
      ),
      'account_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'accounts', backup_row->>'account_id', true
      ),
      'transaction_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'transactions', backup_row->>'transaction_id', true
      )
    );

    perform private.insert_finance_backup_row('public.liability_payments'::regclass, row_payload);
    added_liability_payments := added_liability_payments + 1;
  end loop;

  for backup_row in
    select value from jsonb_array_elements(backup_data->'investmentWithdrawals')
  loop
    source_id := (backup_row->>'id')::uuid;
    v_target_id := private.finance_import_uuid(
      v_target_user_id,
      v_source_owner_id,
      'investment_withdrawals',
      source_id
    );

    if private.finance_import_row_exists('public.investment_withdrawals'::regclass, v_target_user_id, v_target_id) then
      skipped_investment_withdrawals := skipped_investment_withdrawals + 1;
      continue;
    end if;

    source_reference := backup_row->>'investment_id';
    if nullif(source_reference, '') is null then
      raise exception 'Backup withdrawal is missing its investment identity.' using errcode = '23503';
    end if;

    parent_id := private.finance_import_uuid(
      v_target_user_id,
      v_source_owner_id,
      'investments',
      source_reference::uuid
    );

    row_payload := backup_row || jsonb_build_object(
      'id', v_target_id,
      'user_id', v_target_user_id,
      'investment_id', parent_id,
      'source_account_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'accounts', backup_row->>'source_account_id', true
      ),
      'destination_account_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'accounts', backup_row->>'destination_account_id', true
      ),
      'source_transaction_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'transactions', backup_row->>'source_transaction_id', true
      ),
      'pnl_transaction_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'transactions', backup_row->>'pnl_transaction_id', true
      ),
      'account_transfer_id', private.resolve_finance_import_reference(
        v_target_user_id, v_source_owner_id, 'account_transfers', backup_row->>'account_transfer_id', true
      )
    );

    perform private.insert_finance_backup_row('public.investment_withdrawals'::regclass, row_payload);
    added_investment_withdrawals := added_investment_withdrawals + 1;
  end loop;

  update public.accounts account
  set
    balance = case when state.is_new then state.desired_balance else account.balance end,
    status = state.desired_status,
    archived_at = state.desired_archived_at
  from pg_temp.finance_import_account_state state
  where account.id = state.target_id
    and account.user_id = v_target_user_id;

  v_added_counts := jsonb_build_object(
    'accounts', added_accounts,
    'categories', added_categories,
    'investments', added_investments,
    'goals', added_goals,
    'liabilities', added_liabilities,
    'goalContributions', added_goal_contributions,
    'transactions', added_transactions,
    'accountTransfers', added_account_transfers,
    'liabilityPayments', added_liability_payments,
    'investmentWithdrawals', added_investment_withdrawals
  );

  v_skipped_counts := jsonb_build_object(
    'accounts', skipped_accounts,
    'categories', skipped_categories,
    'investments', skipped_investments,
    'goals', skipped_goals,
    'liabilities', skipped_liabilities,
    'goalContributions', skipped_goal_contributions,
    'transactions', skipped_transactions,
    'accountTransfers', skipped_account_transfers,
    'liabilityPayments', skipped_liability_payments,
    'investmentWithdrawals', skipped_investment_withdrawals
  );

  insert into private.finance_data_imports (
    target_user_id,
    backup_id,
    source_owner_id,
    exported_at,
    added_counts,
    skipped_counts
  ) values (
    v_target_user_id,
    v_backup_id,
    v_source_owner_id,
    v_exported_at,
    v_added_counts,
    v_skipped_counts
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyImported', false,
    'backupId', v_backup_id,
    'added', v_added_counts,
    'skipped', v_skipped_counts,
    'totalAdded',
      added_accounts +
      added_categories +
      added_investments +
      added_goals +
      added_liabilities +
      added_goal_contributions +
      added_transactions +
      added_account_transfers +
      added_liability_payments +
      added_investment_withdrawals
  );
end;
$$;

revoke execute on function public.import_finance_backup(jsonb) from public, anon;
grant execute on function public.import_finance_backup(jsonb) to authenticated, service_role;
