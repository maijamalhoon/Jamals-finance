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
    and attribute.attidentity = ''
    and p_payload ? attribute.attname;

  if column_list is null or value_list is null then
    raise exception 'Backup row has no importable columns.' using errcode = '22023';
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

create or replace function private.restore_finance_backup_snapshot(
  p_backup jsonb,
  p_result jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_target_user_id uuid := auth.uid();
  v_source_owner_id uuid;
  v_profile jsonb := p_backup->'profileSnapshot';
  v_preferences jsonb := p_backup->'preferencesSnapshot';
  v_notifications jsonb;
  v_notification_states jsonb;
  v_state jsonb;
  v_source_name text;
  v_source_age integer;
  v_source_currency text;
  v_profile_rows integer := 0;
  v_preference_rows integer := 0;
  v_state_rows integer := 0;
begin
  if v_target_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_result) <> 'object' or p_result->>'ok' <> 'true' then
    raise exception 'Finance import result is invalid.' using errcode = '22023';
  end if;

  begin
    v_source_owner_id := (p_backup#>>'{source,ownerId}')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Backup identity is invalid.' using errcode = '22023';
  end;

  if jsonb_typeof(v_profile) = 'object' then
    v_source_name := coalesce(
      nullif(btrim(v_profile->>'full_name'), ''),
      nullif(btrim(v_profile#>>'{auth,displayName}'), '')
    );

    if coalesce(v_profile->>'age', '') ~ '^[0-9]{1,3}$' then
      v_source_age := (v_profile->>'age')::integer;
    end if;

    v_source_currency := upper(nullif(btrim(v_profile->>'preferred_currency'), ''));
    if v_source_currency is not null
      and not public.is_supported_financial_currency(v_source_currency)
    then
      v_source_currency := null;
    end if;

    update public.profiles profile
    set
      full_name = case
        when nullif(btrim(profile.full_name), '') is null and v_source_name is not null
          then v_source_name
        else profile.full_name
      end,
      age = coalesce(profile.age, v_source_age),
      preferred_currency = coalesce(profile.preferred_currency, v_source_currency),
      onboarding_completed = coalesce(profile.onboarding_completed, false)
        or coalesce(
          case
            when v_profile->>'onboarding_completed' in ('true', 'false')
              then (v_profile->>'onboarding_completed')::boolean
            else false
          end,
          false
        ),
      updated_at = now()
    where profile.id = v_target_user_id
      and (
        (nullif(btrim(profile.full_name), '') is null and v_source_name is not null)
        or (profile.age is null and v_source_age is not null)
        or (profile.preferred_currency is null and v_source_currency is not null)
        or (
          not coalesce(profile.onboarding_completed, false)
          and v_profile->>'onboarding_completed' = 'true'
        )
      );

    get diagnostics v_profile_rows = row_count;
  end if;

  if jsonb_typeof(v_preferences) = 'object' then
    v_notifications := v_preferences->'notifications';
    v_notification_states := v_preferences->'notificationStates';

    if jsonb_typeof(v_notifications) = 'object' then
      insert into public.notification_preferences (
        user_id,
        goal_alerts_enabled,
        payable_alerts_enabled,
        updated_at
      ) values (
        v_target_user_id,
        case
          when v_notifications->>'goal_alerts_enabled' in ('true', 'false')
            then (v_notifications->>'goal_alerts_enabled')::boolean
          else true
        end,
        case
          when v_notifications->>'payable_alerts_enabled' in ('true', 'false')
            then (v_notifications->>'payable_alerts_enabled')::boolean
          else true
        end,
        now()
      )
      on conflict (user_id) do nothing;

      get diagnostics v_preference_rows = row_count;
    end if;

    if v_source_owner_id = v_target_user_id
      and jsonb_typeof(v_notification_states) = 'array'
    then
      for v_state in
        select value
        from jsonb_array_elements(v_notification_states)
      loop
        if jsonb_typeof(v_state) <> 'object'
          or nullif(btrim(v_state->>'notification_id'), '') is null
          or char_length(v_state->>'notification_id') > 240
        then
          continue;
        end if;

        insert into public.notification_states (
          user_id,
          notification_id,
          read_at,
          dismissed_at,
          snoozed_until,
          updated_at
        ) values (
          v_target_user_id,
          v_state->>'notification_id',
          nullif(v_state->>'read_at', '')::timestamptz,
          nullif(v_state->>'dismissed_at', '')::timestamptz,
          nullif(v_state->>'snoozed_until', '')::timestamptz,
          coalesce(nullif(v_state->>'updated_at', '')::timestamptz, now())
        )
        on conflict (user_id, notification_id) do update
        set
          read_at = coalesce(
            public.notification_states.read_at,
            excluded.read_at
          ),
          dismissed_at = coalesce(
            public.notification_states.dismissed_at,
            excluded.dismissed_at
          ),
          snoozed_until = coalesce(
            public.notification_states.snoozed_until,
            excluded.snoozed_until
          ),
          updated_at = greatest(
            public.notification_states.updated_at,
            excluded.updated_at
          );

        v_state_rows := v_state_rows + 1;
      end loop;
    end if;
  end if;

  return p_result || jsonb_build_object(
    'restored',
    jsonb_build_object(
      'profile', v_profile_rows,
      'notificationPreferences', v_preference_rows,
      'notificationStates', v_state_rows
    )
  );
end;
$$;

revoke all on function private.restore_finance_backup_snapshot(jsonb, jsonb)
  from public, anon;
grant execute on function private.restore_finance_backup_snapshot(jsonb, jsonb)
  to authenticated, service_role;

create or replace function public.import_finance_backup(p_backup jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog, private
as $$
declare
  v_result jsonb;
begin
  v_result := private.import_finance_backup_internal(p_backup);
  return private.restore_finance_backup_snapshot(p_backup, v_result);
end;
$$;

revoke execute on function public.import_finance_backup(jsonb) from public, anon;
grant execute on function public.import_finance_backup(jsonb)
  to authenticated, service_role;

comment on function private.insert_finance_backup_row(regclass, jsonb) is
  'Imports only columns present in a backup row so newer schema defaults remain safe for older backups.';

comment on function private.restore_finance_backup_snapshot(jsonb, jsonb) is
  'Additively restores safe personal profile and notification preferences without overwriting target-account settings.';

comment on function public.import_finance_backup(jsonb) is
  'Atomically merges complete personal finance data and safe account preferences into the authenticated user.';
