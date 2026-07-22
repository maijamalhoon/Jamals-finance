create or replace function private.upsert_business_bank_account_internal(
  p_business_id uuid,
  p_bank_account_id uuid,
  p_ledger_account_id uuid,
  p_name text,
  p_institution_name text default null,
  p_account_kind text default 'bank',
  p_account_number_masked text default null,
  p_currency text default null,
  p_reconciliation_start_date date default current_date,
  p_opening_balance_transaction numeric default 0,
  p_opening_exchange_rate numeric default 1,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  business_currency text;
  normalized_currency text;
  normalized_kind text := lower(btrim(coalesce(p_account_kind, 'bank')));
  account_row public.business_chart_of_accounts%rowtype;
  existing_row public.business_bank_accounts%rowtype;
  saved_id uuid;
  opening_base numeric(24,6);
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  if p_ledger_account_id is null then raise exception 'Ledger account is required.' using errcode = '22004'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Bank account name must contain 2 to 120 characters.' using errcode = '22023';
  end if;
  if normalized_kind not in ('bank','cash','mobile_wallet','clearing') then
    raise exception 'Unsupported bank account kind.' using errcode = '22023';
  end if;
  if p_reconciliation_start_date is null then
    raise exception 'Reconciliation start date is required.' using errcode = '22004';
  end if;
  if p_opening_exchange_rate is null or p_opening_exchange_rate <= 0 then
    raise exception 'Opening exchange rate must be greater than zero.' using errcode = '22023';
  end if;

  select business.base_currency into business_currency
  from public.businesses business
  where business.id = p_business_id and business.status = 'active';
  if business_currency is null then raise exception 'Active business not found.' using errcode = 'P0002'; end if;

  normalized_currency := upper(btrim(coalesce(p_currency, business_currency)));
  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported bank account currency.' using errcode = '22023';
  end if;
  if normalized_currency = business_currency and p_opening_exchange_rate <> 1 then
    raise exception 'Base-currency bank accounts must use an opening exchange rate of 1.' using errcode = '22023';
  end if;
  opening_base := round(coalesce(p_opening_balance_transaction, 0) * p_opening_exchange_rate, 6);

  select account.* into account_row
  from public.business_chart_of_accounts account
  where account.id = p_ledger_account_id
    and account.business_id = p_business_id
    and account.is_active
  for update;
  if not found then raise exception 'Ledger account not found.' using errcode = 'P0002'; end if;
  if account_row.account_type <> 'asset' or account_row.normal_balance <> 'debit' then
    raise exception 'Banking requires an active debit-normal asset ledger account.' using errcode = '23514';
  end if;

  if p_bank_account_id is not null then
    select bank.* into existing_row
    from public.business_bank_accounts bank
    where bank.id = p_bank_account_id and bank.business_id = p_business_id
    for update;
    if not found then raise exception 'Bank account not found.' using errcode = 'P0002'; end if;

    if exists(
      select 1 from public.business_bank_reconciliations reconciliation
      where reconciliation.business_id = p_business_id
        and reconciliation.bank_account_id = existing_row.id
        and reconciliation.status in ('completed','locked')
    ) and (
      p_ledger_account_id <> existing_row.ledger_account_id
      or normalized_currency <> existing_row.currency
      or p_reconciliation_start_date <> existing_row.reconciliation_start_date
      or opening_base <> existing_row.opening_balance_base
      or coalesce(p_opening_balance_transaction, 0) <> existing_row.opening_balance_transaction
    ) then
      raise exception 'Ledger, currency, opening balance, and start date are locked after reconciliation.' using errcode = '55000';
    end if;
  end if;

  perform set_config('app.business_banking_action', 'config', true);
  if p_bank_account_id is null then
    insert into public.business_bank_accounts(
      business_id, ledger_account_id, name, institution_name, account_kind,
      account_number_masked, currency, reconciliation_start_date,
      opening_balance_transaction, opening_balance_base, is_active, created_by, updated_by
    ) values (
      p_business_id, p_ledger_account_id, btrim(p_name), nullif(btrim(coalesce(p_institution_name, '')), ''),
      normalized_kind, nullif(btrim(coalesce(p_account_number_masked, '')), ''), normalized_currency,
      p_reconciliation_start_date, coalesce(p_opening_balance_transaction, 0), opening_base,
      coalesce(p_is_active, true), user_id, user_id
    ) returning id into saved_id;
  else
    update public.business_bank_accounts bank
    set ledger_account_id = p_ledger_account_id,
        name = btrim(p_name),
        institution_name = nullif(btrim(coalesce(p_institution_name, '')), ''),
        account_kind = normalized_kind,
        account_number_masked = nullif(btrim(coalesce(p_account_number_masked, '')), ''),
        currency = normalized_currency,
        reconciliation_start_date = p_reconciliation_start_date,
        opening_balance_transaction = coalesce(p_opening_balance_transaction, 0),
        opening_balance_base = opening_base,
        is_active = coalesce(p_is_active, true),
        updated_by = user_id
    where bank.id = p_bank_account_id and bank.business_id = p_business_id
    returning id into saved_id;
  end if;

  return jsonb_build_object('bank_account_id', saved_id, 'currency', normalized_currency, 'opening_balance_base', opening_base);
end;
$$;

create or replace function private.import_business_bank_statement_internal(
  p_business_id uuid,
  p_bank_account_id uuid,
  p_file_name text,
  p_file_hash text,
  p_period_start date,
  p_period_end date,
  p_opening_balance_transaction numeric,
  p_closing_balance_transaction numeric,
  p_opening_exchange_rate numeric default 1,
  p_closing_exchange_rate numeric default 1,
  p_default_exchange_rate numeric default 1,
  p_lines jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  bank public.business_bank_accounts%rowtype;
  business_currency text;
  import_id uuid;
  reconciliation_id uuid;
  item jsonb;
  ordinal bigint;
  line_date date;
  posted_on date;
  line_description text;
  line_reference text;
  line_external_id text;
  line_amount numeric(24,6);
  line_rate numeric(24,10);
  line_base numeric(24,6);
  running_balance numeric(24,6);
  transaction_sum numeric(24,6) := 0;
  imported_count integer := 0;
  opening_base numeric(24,6);
  closing_base numeric(24,6);
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'A valid statement period is required.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_file_name, ''))) not between 1 and 255 then
    raise exception 'Statement file name is required.' using errcode = '22023';
  end if;
  if lower(btrim(coalesce(p_file_hash, ''))) !~ '^[a-f0-9]{64}$' then
    raise exception 'Statement file hash is invalid.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 1 or jsonb_array_length(p_lines) > 5000 then
    raise exception 'A statement import requires 1 to 5000 lines.' using errcode = '22023';
  end if;
  if p_opening_exchange_rate is null or p_opening_exchange_rate <= 0
     or p_closing_exchange_rate is null or p_closing_exchange_rate <= 0
     or p_default_exchange_rate is null or p_default_exchange_rate <= 0 then
    raise exception 'Statement exchange rates must be greater than zero.' using errcode = '22023';
  end if;

  select bank_account.* into bank
  from public.business_bank_accounts bank_account
  where bank_account.id = p_bank_account_id
    and bank_account.business_id = p_business_id
    and bank_account.is_active
  for update;
  if not found then raise exception 'Active bank account not found.' using errcode = 'P0002'; end if;

  select business.base_currency into business_currency
  from public.businesses business
  where business.id = p_business_id and business.status = 'active';
  if business_currency is null then raise exception 'Active business not found.' using errcode = 'P0002'; end if;
  if bank.currency = business_currency
     and (p_opening_exchange_rate <> 1 or p_closing_exchange_rate <> 1 or p_default_exchange_rate <> 1) then
    raise exception 'Base-currency statements must use exchange rates of 1.' using errcode = '22023';
  end if;

  opening_base := round(coalesce(p_opening_balance_transaction, 0) * p_opening_exchange_rate, 6);
  closing_base := round(coalesce(p_closing_balance_transaction, 0) * p_closing_exchange_rate, 6);

  perform set_config('app.business_banking_action', 'import', true);
  insert into public.business_bank_statement_imports(
    business_id, bank_account_id, file_name, file_hash, period_start, period_end, currency,
    opening_balance_transaction, closing_balance_transaction, opening_balance_base, closing_balance_base,
    line_count, status, imported_by
  ) values (
    p_business_id, bank.id, btrim(p_file_name), lower(btrim(p_file_hash)), p_period_start, p_period_end, bank.currency,
    coalesce(p_opening_balance_transaction, 0), coalesce(p_closing_balance_transaction, 0), opening_base, closing_base,
    0, 'draft', user_id
  ) returning id into import_id;

  for item, ordinal in
    select value, ordinality
    from jsonb_array_elements(p_lines) with ordinality
  loop
    begin
      line_date := (item ->> 'transaction_date')::date;
      posted_on := case when nullif(item ->> 'posted_date', '') is null then null else (item ->> 'posted_date')::date end;
      line_description := btrim(coalesce(item ->> 'description', ''));
      line_reference := nullif(btrim(coalesce(item ->> 'reference', '')), '');
      line_external_id := nullif(btrim(coalesce(item ->> 'external_id', '')), '');
      line_amount := (item ->> 'amount')::numeric;
      line_rate := coalesce(nullif(item ->> 'exchange_rate', '')::numeric, p_default_exchange_rate);
      running_balance := case when nullif(item ->> 'running_balance', '') is null then null else (item ->> 'running_balance')::numeric end;
    exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
      raise exception 'Statement line % contains an invalid date or amount.', ordinal using errcode = '22023';
    end;

    if line_date < p_period_start or line_date > p_period_end then
      raise exception 'Statement line % falls outside the selected period.', ordinal using errcode = '22008';
    end if;
    if posted_on is not null and (posted_on < p_period_start - 7 or posted_on > p_period_end + 7) then
      raise exception 'Statement line % has an invalid posted date.', ordinal using errcode = '22008';
    end if;
    if char_length(line_description) not between 1 and 500 then
      raise exception 'Statement line % requires a description.', ordinal using errcode = '22023';
    end if;
    if line_amount = 0 or line_rate <= 0 then
      raise exception 'Statement line % requires a non-zero amount and positive exchange rate.', ordinal using errcode = '22023';
    end if;
    if bank.currency = business_currency and line_rate <> 1 then
      raise exception 'Base-currency statement line % must use an exchange rate of 1.', ordinal using errcode = '22023';
    end if;

    line_base := round(line_amount * line_rate, 6);
    insert into public.business_bank_statement_lines(
      business_id, import_id, bank_account_id, line_number, transaction_date, posted_date,
      description, reference, external_id, amount_transaction, exchange_rate_to_base, amount_base,
      running_balance_transaction, raw_data
    ) values (
      p_business_id, import_id, bank.id, ordinal::integer, line_date, posted_on,
      line_description, line_reference, line_external_id, line_amount, line_rate, line_base,
      running_balance, case when jsonb_typeof(item -> 'raw_data') = 'object' then item -> 'raw_data' else item end
    );
    transaction_sum := transaction_sum + line_amount;
    imported_count := imported_count + 1;
  end loop;

  if abs(round(coalesce(p_opening_balance_transaction, 0) + transaction_sum - coalesce(p_closing_balance_transaction, 0), 2)) > 0.01 then
    raise exception 'Statement arithmetic does not reconcile: opening balance plus transactions must equal closing balance.' using errcode = '23514';
  end if;

  update public.business_bank_statement_imports statement_import
  set line_count = imported_count
  where statement_import.id = import_id and statement_import.business_id = p_business_id;

  insert into public.business_bank_reconciliations(
    business_id, bank_account_id, statement_import_id, period_start, period_end, status,
    statement_opening_base, statement_closing_base, created_by
  ) values (
    p_business_id, bank.id, import_id, p_period_start, p_period_end, 'draft', opening_base, closing_base, user_id
  ) returning id into reconciliation_id;

  return jsonb_build_object(
    'statement_import_id', import_id,
    'reconciliation_id', reconciliation_id,
    'line_count', imported_count,
    'transaction_sum', transaction_sum,
    'closing_balance_base', closing_base
  );
exception when unique_violation then
  raise exception 'This statement file or one of its external transaction IDs was already imported.' using errcode = '23505';
end;
$$;

create or replace function private.match_business_bank_statement_line_internal(
  p_business_id uuid,
  p_statement_line_id uuid,
  p_journal_line_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  statement_line public.business_bank_statement_lines%rowtype;
  statement_import public.business_bank_statement_imports%rowtype;
  reconciliation public.business_bank_reconciliations%rowtype;
  bank public.business_bank_accounts%rowtype;
  journal_amount numeric(24,6);
  journal_signed numeric(24,6);
  matched_total numeric(24,6);
  remaining numeric(24,6);
  match_id uuid;
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;

  select line.* into statement_line
  from public.business_bank_statement_lines line
  where line.id = p_statement_line_id and line.business_id = p_business_id
  for update;
  if not found then raise exception 'Statement line not found.' using errcode = 'P0002'; end if;
  if statement_line.excluded_at is not null then raise exception 'Excluded statement lines cannot be matched.' using errcode = '55000'; end if;

  select imported.* into statement_import
  from public.business_bank_statement_imports imported
  where imported.id = statement_line.import_id and imported.business_id = p_business_id
  for update;
  select rec.* into reconciliation
  from public.business_bank_reconciliations rec
  where rec.statement_import_id = statement_line.import_id and rec.business_id = p_business_id
  for update;
  if statement_import.status <> 'draft' or reconciliation.status <> 'draft' then
    raise exception 'Only draft reconciliations can be edited.' using errcode = '55000';
  end if;

  select bank_account.* into bank
  from public.business_bank_accounts bank_account
  where bank_account.id = statement_line.bank_account_id and bank_account.business_id = p_business_id;

  select case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end,
         journal_line.debit_base - journal_line.credit_base
  into journal_amount, journal_signed
  from public.business_journal_lines journal_line
  join public.business_journal_entries journal_entry
    on journal_entry.business_id = journal_line.business_id and journal_entry.id = journal_line.journal_entry_id
  where journal_line.id = p_journal_line_id
    and journal_line.business_id = p_business_id
    and journal_line.account_id = bank.ledger_account_id
    and journal_entry.status in ('posted','reversed')
  for update of journal_line;
  if journal_amount is null then raise exception 'Eligible bank ledger line not found.' using errcode = 'P0002'; end if;
  if sign(journal_signed) <> sign(statement_line.amount_base) then
    raise exception 'Statement and ledger movement directions do not match.' using errcode = '23514';
  end if;

  select coalesce(sum(match.amount_base), 0) into matched_total
  from public.business_bank_matches match
  where match.business_id = p_business_id and match.statement_line_id = statement_line.id;
  remaining := round(abs(statement_line.amount_base) - matched_total, 6);
  if remaining <= 0 then raise exception 'Statement line is already fully matched.' using errcode = '55000'; end if;
  if journal_amount > remaining + 0.000001 then
    raise exception 'Ledger amount exceeds the remaining statement amount.' using errcode = '23514';
  end if;

  perform set_config('app.business_banking_action', 'match', true);
  insert into public.business_bank_matches(business_id, statement_line_id, journal_line_id, amount_base, created_by)
  values(p_business_id, statement_line.id, p_journal_line_id, journal_amount, user_id)
  returning id into match_id;

  return jsonb_build_object(
    'match_id', match_id,
    'statement_line_id', statement_line.id,
    'matched_base', matched_total + journal_amount,
    'remaining_base', greatest(round(remaining - journal_amount, 6), 0)
  );
exception when unique_violation then
  raise exception 'This ledger line is already reconciled.' using errcode = '23505';
end;
$$;

create or replace function private.unmatch_business_bank_statement_line_internal(
  p_business_id uuid,
  p_match_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  match_row public.business_bank_matches%rowtype;
  rec_status text;
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  select match.* into match_row
  from public.business_bank_matches match
  where match.id = p_match_id and match.business_id = p_business_id
  for update;
  if not found then raise exception 'Bank match not found.' using errcode = 'P0002'; end if;

  select reconciliation.status into rec_status
  from public.business_bank_statement_lines line
  join public.business_bank_reconciliations reconciliation
    on reconciliation.business_id = line.business_id and reconciliation.statement_import_id = line.import_id
  where line.id = match_row.statement_line_id and line.business_id = p_business_id
  for update of reconciliation;
  if rec_status <> 'draft' then raise exception 'Completed reconciliation matches are immutable.' using errcode = '55000'; end if;

  perform set_config('app.business_banking_action', 'unmatch', true);
  delete from public.business_bank_matches match
  where match.id = p_match_id and match.business_id = p_business_id;
  return true;
end;
$$;

create or replace function private.set_business_bank_statement_line_excluded_internal(
  p_business_id uuid,
  p_statement_line_id uuid,
  p_excluded boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  line_row public.business_bank_statement_lines%rowtype;
  rec_status text;
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  select line.* into line_row
  from public.business_bank_statement_lines line
  where line.id = p_statement_line_id and line.business_id = p_business_id
  for update;
  if not found then raise exception 'Statement line not found.' using errcode = 'P0002'; end if;

  select reconciliation.status into rec_status
  from public.business_bank_reconciliations reconciliation
  where reconciliation.business_id = p_business_id and reconciliation.statement_import_id = line_row.import_id
  for update;
  if rec_status <> 'draft' then raise exception 'Only draft reconciliations can be edited.' using errcode = '55000'; end if;
  if exists(select 1 from public.business_bank_matches match where match.business_id = p_business_id and match.statement_line_id = line_row.id) then
    raise exception 'Remove existing matches before excluding this line.' using errcode = '55000';
  end if;
  if coalesce(p_excluded, false) and (normalized_reason is null or char_length(normalized_reason) not between 2 and 300) then
    raise exception 'An exclusion reason is required.' using errcode = '22023';
  end if;

  perform set_config('app.business_banking_action', case when coalesce(p_excluded, false) then 'exclude' else 'restore' end, true);
  update public.business_bank_statement_lines line
  set excluded_at = case when coalesce(p_excluded, false) then now() else null end,
      excluded_by = case when coalesce(p_excluded, false) then user_id else null end,
      exclusion_reason = case when coalesce(p_excluded, false) then normalized_reason else null end
  where line.id = line_row.id and line.business_id = p_business_id;

  return jsonb_build_object('statement_line_id', line_row.id, 'excluded', coalesce(p_excluded, false));
end;
$$;

create or replace function private.auto_match_business_bank_statement_internal(
  p_business_id uuid,
  p_statement_import_id uuid,
  p_date_tolerance_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  imported public.business_bank_statement_imports%rowtype;
  rec_status text;
  bank public.business_bank_accounts%rowtype;
  line_record record;
  candidate_record record;
  candidate_count integer;
  matched_count integer := 0;
  remaining numeric(24,6);
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  if p_date_tolerance_days < 0 or p_date_tolerance_days > 45 then
    raise exception 'Auto-match tolerance must be between 0 and 45 days.' using errcode = '22023';
  end if;

  select statement_import.* into imported
  from public.business_bank_statement_imports statement_import
  where statement_import.id = p_statement_import_id and statement_import.business_id = p_business_id
  for update;
  if not found then raise exception 'Statement import not found.' using errcode = 'P0002'; end if;
  select reconciliation.status into rec_status
  from public.business_bank_reconciliations reconciliation
  where reconciliation.business_id = p_business_id and reconciliation.statement_import_id = imported.id
  for update;
  if imported.status <> 'draft' or rec_status <> 'draft' then
    raise exception 'Only draft reconciliations can be auto-matched.' using errcode = '55000';
  end if;
  select bank_account.* into bank from public.business_bank_accounts bank_account
  where bank_account.id = imported.bank_account_id and bank_account.business_id = p_business_id;

  for line_record in
    select line.id, line.transaction_date, line.amount_base,
           abs(line.amount_base) - coalesce(sum(match.amount_base), 0) as remaining_base
    from public.business_bank_statement_lines line
    left join public.business_bank_matches match
      on match.business_id = line.business_id and match.statement_line_id = line.id
    where line.business_id = p_business_id and line.import_id = imported.id and line.excluded_at is null
    group by line.id, line.transaction_date, line.amount_base
    having abs(line.amount_base) - coalesce(sum(match.amount_base), 0) > 0.000001
    order by line.transaction_date, line.id
  loop
    remaining := round(line_record.remaining_base, 6);
    select count(*), min(candidate.journal_line_id), min(candidate.amount_base), min(candidate.signed_base)
    into candidate_count, candidate_record.journal_line_id, candidate_record.amount_base, candidate_record.signed_base
    from (
      select journal_line.id as journal_line_id,
             case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end as amount_base,
             journal_line.debit_base - journal_line.credit_base as signed_base
      from public.business_journal_lines journal_line
      join public.business_journal_entries journal_entry
        on journal_entry.business_id = journal_line.business_id and journal_entry.id = journal_line.journal_entry_id
      where journal_line.business_id = p_business_id
        and journal_line.account_id = bank.ledger_account_id
        and journal_entry.status in ('posted','reversed')
        and abs(journal_entry.entry_date - line_record.transaction_date) <= p_date_tolerance_days
        and sign(journal_line.debit_base - journal_line.credit_base) = sign(line_record.amount_base)
        and abs((case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end) - remaining) <= 0.000001
        and not exists(
          select 1 from public.business_bank_matches existing_match
          where existing_match.business_id = p_business_id and existing_match.journal_line_id = journal_line.id
        )
      limit 2
    ) candidate;

    if candidate_count = 1 then
      perform set_config('app.business_banking_action', 'auto_match', true);
      insert into public.business_bank_matches(business_id, statement_line_id, journal_line_id, amount_base, created_by)
      values(p_business_id, line_record.id, candidate_record.journal_line_id, candidate_record.amount_base, user_id);
      matched_count := matched_count + 1;
    end if;
  end loop;

  return jsonb_build_object('statement_import_id', imported.id, 'matched_count', matched_count);
end;
$$;

create or replace function private.void_business_bank_statement_import_internal(
  p_business_id uuid,
  p_statement_import_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  imported public.business_bank_statement_imports%rowtype;
  rec_status text;
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  if normalized_reason is null or char_length(normalized_reason) not between 2 and 500 then
    raise exception 'A void reason is required.' using errcode = '22023';
  end if;
  select statement_import.* into imported
  from public.business_bank_statement_imports statement_import
  where statement_import.id = p_statement_import_id and statement_import.business_id = p_business_id
  for update;
  if not found then raise exception 'Statement import not found.' using errcode = 'P0002'; end if;
  select reconciliation.status into rec_status
  from public.business_bank_reconciliations reconciliation
  where reconciliation.business_id = p_business_id and reconciliation.statement_import_id = imported.id
  for update;
  if imported.status <> 'draft' or rec_status <> 'draft' then
    raise exception 'Only draft statement imports can be voided.' using errcode = '55000';
  end if;

  perform set_config('app.business_banking_action', 'unmatch', true);
  delete from public.business_bank_matches match
  using public.business_bank_statement_lines line
  where match.business_id = p_business_id
    and line.business_id = match.business_id
    and line.id = match.statement_line_id
    and line.import_id = imported.id;

  perform set_config('app.business_banking_action', 'void', true);
  update public.business_bank_statement_imports statement_import
  set status = 'void', voided_by = user_id, voided_at = now(), void_reason = normalized_reason
  where statement_import.id = imported.id and statement_import.business_id = p_business_id;
  return true;
end;
$$;

create or replace function private.complete_business_bank_reconciliation_internal(
  p_business_id uuid,
  p_reconciliation_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  reconciliation public.business_bank_reconciliations%rowtype;
  imported public.business_bank_statement_imports%rowtype;
  bank public.business_bank_accounts%rowtype;
  ledger_balance numeric(24,6);
  outstanding_debits numeric(24,6);
  outstanding_credits numeric(24,6);
  adjusted_statement numeric(24,6);
  difference numeric(24,6);
  incomplete_count integer;
  normalized_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  select rec.* into reconciliation
  from public.business_bank_reconciliations rec
  where rec.id = p_reconciliation_id and rec.business_id = p_business_id
  for update;
  if not found then raise exception 'Bank reconciliation not found.' using errcode = 'P0002'; end if;
  if reconciliation.status <> 'draft' then raise exception 'Only draft reconciliations can be completed.' using errcode = '55000'; end if;

  select statement_import.* into imported
  from public.business_bank_statement_imports statement_import
  where statement_import.id = reconciliation.statement_import_id and statement_import.business_id = p_business_id
  for update;
  if imported.status <> 'draft' then raise exception 'Statement import is not available for reconciliation.' using errcode = '55000'; end if;
  select bank_account.* into bank
  from public.business_bank_accounts bank_account
  where bank_account.id = reconciliation.bank_account_id and bank_account.business_id = p_business_id
  for update;

  if exists(
    select 1 from public.business_bank_reconciliations other
    where other.business_id = p_business_id
      and other.bank_account_id = bank.id
      and other.id <> reconciliation.id
      and other.status in ('completed','locked')
      and daterange(other.period_start, other.period_end, '[]') && daterange(reconciliation.period_start, reconciliation.period_end, '[]')
  ) then
    raise exception 'This statement period overlaps an existing completed reconciliation.' using errcode = '23P01';
  end if;

  select count(*) into incomplete_count
  from (
    select line.id
    from public.business_bank_statement_lines line
    left join public.business_bank_matches match
      on match.business_id = line.business_id and match.statement_line_id = line.id
    where line.business_id = p_business_id
      and line.import_id = imported.id
      and line.excluded_at is null
    group by line.id, line.amount_base
    having abs(abs(line.amount_base) - coalesce(sum(match.amount_base), 0)) > 0.01
  ) incomplete;
  if incomplete_count > 0 then
    raise exception '% statement lines are not fully matched.', incomplete_count using errcode = '55000';
  end if;

  select round(bank.opening_balance_base + coalesce(sum(journal_line.debit_base - journal_line.credit_base), 0), 6)
  into ledger_balance
  from public.business_journal_lines journal_line
  join public.business_journal_entries journal_entry
    on journal_entry.business_id = journal_line.business_id and journal_entry.id = journal_line.journal_entry_id
  where journal_line.business_id = p_business_id
    and journal_line.account_id = bank.ledger_account_id
    and journal_entry.status in ('posted','reversed')
    and journal_entry.entry_date between bank.reconciliation_start_date and reconciliation.period_end;

  select coalesce(sum(journal_line.debit_base), 0), coalesce(sum(journal_line.credit_base), 0)
  into outstanding_debits, outstanding_credits
  from public.business_journal_lines journal_line
  join public.business_journal_entries journal_entry
    on journal_entry.business_id = journal_line.business_id and journal_entry.id = journal_line.journal_entry_id
  where journal_line.business_id = p_business_id
    and journal_line.account_id = bank.ledger_account_id
    and journal_entry.status in ('posted','reversed')
    and journal_entry.entry_date between bank.reconciliation_start_date and reconciliation.period_end
    and not exists(
      select 1 from public.business_bank_matches match
      where match.business_id = p_business_id and match.journal_line_id = journal_line.id
    );

  adjusted_statement := round(imported.closing_balance_base + outstanding_debits - outstanding_credits, 6);
  difference := round(ledger_balance - adjusted_statement, 6);
  if abs(difference) > 0.01 then
    raise exception 'Reconciliation difference is %. Match or review outstanding ledger items first.', difference using errcode = '23514';
  end if;

  perform set_config('app.business_banking_action', 'complete', true);
  update public.business_bank_reconciliations rec
  set status = 'completed',
      ledger_balance_base = ledger_balance,
      outstanding_debits_base = outstanding_debits,
      outstanding_credits_base = outstanding_credits,
      adjusted_statement_balance_base = adjusted_statement,
      difference_base = difference,
      notes = normalized_notes,
      completed_by = user_id,
      completed_at = now(),
      locked_by = null,
      locked_at = null,
      reopened_by = null,
      reopened_at = null
  where rec.id = reconciliation.id and rec.business_id = p_business_id;

  update public.business_bank_statement_imports statement_import
  set status = 'reconciled', reconciled_by = user_id, reconciled_at = now(),
      voided_by = null, voided_at = null, void_reason = null
  where statement_import.id = imported.id and statement_import.business_id = p_business_id;

  return jsonb_build_object(
    'reconciliation_id', reconciliation.id,
    'status', 'completed',
    'ledger_balance_base', ledger_balance,
    'statement_closing_base', imported.closing_balance_base,
    'outstanding_debits_base', outstanding_debits,
    'outstanding_credits_base', outstanding_credits,
    'adjusted_statement_balance_base', adjusted_statement,
    'difference_base', difference
  );
end;
$$;

create or replace function private.reopen_business_bank_reconciliation_internal(
  p_business_id uuid,
  p_reconciliation_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  reconciliation public.business_bank_reconciliations%rowtype;
  normalized_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  select rec.* into reconciliation
  from public.business_bank_reconciliations rec
  where rec.id = p_reconciliation_id and rec.business_id = p_business_id
  for update;
  if not found then raise exception 'Bank reconciliation not found.' using errcode = 'P0002'; end if;
  if reconciliation.status <> 'completed' then
    raise exception 'Only completed, unlocked reconciliations can be reopened.' using errcode = '55000';
  end if;
  if exists(
    select 1 from public.business_bank_reconciliations later
    where later.business_id = p_business_id
      and later.bank_account_id = reconciliation.bank_account_id
      and later.status in ('completed','locked')
      and later.period_end > reconciliation.period_end
  ) then
    raise exception 'A later completed reconciliation exists.' using errcode = '55000';
  end if;

  perform set_config('app.business_banking_action', 'reopen', true);
  update public.business_bank_reconciliations rec
  set status = 'draft',
      ledger_balance_base = null,
      outstanding_debits_base = null,
      outstanding_credits_base = null,
      adjusted_statement_balance_base = null,
      difference_base = null,
      notes = normalized_notes,
      completed_by = null,
      completed_at = null,
      locked_by = null,
      locked_at = null,
      reopened_by = user_id,
      reopened_at = now()
  where rec.id = reconciliation.id and rec.business_id = p_business_id;

  update public.business_bank_statement_imports statement_import
  set status = 'draft', reconciled_by = null, reconciled_at = null
  where statement_import.id = reconciliation.statement_import_id and statement_import.business_id = p_business_id;

  return jsonb_build_object('reconciliation_id', reconciliation.id, 'status', 'draft');
end;
$$;

create or replace function private.lock_business_bank_reconciliation_internal(
  p_business_id uuid,
  p_reconciliation_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  reconciliation public.business_bank_reconciliations%rowtype;
  normalized_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if user_id is null or not private.can_manage_business_banking(p_business_id) then
    raise exception 'Banking management permission required.' using errcode = '42501';
  end if;
  select rec.* into reconciliation
  from public.business_bank_reconciliations rec
  where rec.id = p_reconciliation_id and rec.business_id = p_business_id
  for update;
  if not found then raise exception 'Bank reconciliation not found.' using errcode = 'P0002'; end if;
  if reconciliation.status <> 'completed' then
    raise exception 'Only completed reconciliations can be locked.' using errcode = '55000';
  end if;

  perform set_config('app.business_banking_action', 'lock', true);
  update public.business_bank_reconciliations rec
  set status = 'locked',
      notes = coalesce(normalized_notes, rec.notes),
      locked_by = user_id,
      locked_at = now()
  where rec.id = reconciliation.id and rec.business_id = p_business_id;

  update public.business_bank_statement_imports statement_import
  set status = 'reconciled'
  where statement_import.id = reconciliation.statement_import_id and statement_import.business_id = p_business_id;

  return jsonb_build_object('reconciliation_id', reconciliation.id, 'status', 'locked');
end;
$$;

create or replace function private.get_business_bank_match_candidates_internal(
  p_business_id uuid,
  p_statement_line_id uuid,
  p_limit integer default 8
)
returns table(
  journal_line_id uuid,
  journal_entry_id uuid,
  entry_date date,
  reference text,
  description text,
  source_type text,
  amount_base numeric,
  amount_difference_base numeric,
  date_difference_days integer,
  exact_amount boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  statement_line public.business_bank_statement_lines%rowtype;
  bank_account public.business_bank_accounts%rowtype;
  remaining numeric(24,6);
begin
  if auth.uid() is null or not private.can_view_business_banking(p_business_id) then
    raise exception 'Banking access required.' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 25 then raise exception 'Candidate limit must be between 1 and 25.' using errcode = '22023'; end if;

  select line.* into statement_line
  from public.business_bank_statement_lines line
  where line.id = p_statement_line_id and line.business_id = p_business_id;
  if not found then raise exception 'Statement line not found.' using errcode = 'P0002'; end if;
  select bank.* into bank_account
  from public.business_bank_accounts bank
  where bank.id = statement_line.bank_account_id and bank.business_id = p_business_id;

  select round(abs(statement_line.amount_base) - coalesce(sum(match.amount_base), 0), 6)
  into remaining
  from public.business_bank_matches match
  where match.business_id = p_business_id and match.statement_line_id = statement_line.id;
  remaining := coalesce(remaining, abs(statement_line.amount_base));

  return query
  select journal_line.id,
         journal_entry.id,
         journal_entry.entry_date,
         journal_entry.reference,
         coalesce(journal_line.description, journal_entry.description),
         journal_entry.source_type,
         (case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end)::numeric,
         abs((case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end) - remaining)::numeric,
         abs(journal_entry.entry_date - statement_line.transaction_date)::integer,
         abs((case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end) - remaining) <= 0.000001
  from public.business_journal_lines journal_line
  join public.business_journal_entries journal_entry
    on journal_entry.business_id = journal_line.business_id and journal_entry.id = journal_line.journal_entry_id
  where journal_line.business_id = p_business_id
    and journal_line.account_id = bank_account.ledger_account_id
    and journal_entry.status in ('posted','reversed')
    and sign(journal_line.debit_base - journal_line.credit_base) = sign(statement_line.amount_base)
    and not exists(
      select 1 from public.business_bank_matches existing_match
      where existing_match.business_id = p_business_id and existing_match.journal_line_id = journal_line.id
    )
    and (case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end) <= remaining + 0.000001
    and abs(journal_entry.entry_date - statement_line.transaction_date) <= 45
  order by
    abs((case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end) - remaining),
    abs(journal_entry.entry_date - statement_line.transaction_date),
    journal_entry.entry_date desc,
    journal_line.id
  limit p_limit;
end;
$$;

create or replace function private.get_business_banking_snapshot_internal(
  p_business_id uuid,
  p_bank_account_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_line_limit integer default 250
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  selected_id uuid;
  start_date date := coalesce(p_start_date, date_trunc('month', current_date)::date);
  end_date date := coalesce(p_end_date, current_date);
  business_currency text;
  result jsonb;
begin
  if auth.uid() is null or not private.can_view_business_banking(p_business_id) then
    raise exception 'Banking access required.' using errcode = '42501';
  end if;
  if end_date < start_date then raise exception 'Banking date range is invalid.' using errcode = '22023'; end if;
  if p_line_limit < 1 or p_line_limit > 1000 then raise exception 'Statement line limit must be between 1 and 1000.' using errcode = '22023'; end if;

  select business.base_currency into business_currency
  from public.businesses business
  where business.id = p_business_id and business.status = 'active';
  if business_currency is null then raise exception 'Active business not found.' using errcode = 'P0002'; end if;

  if p_bank_account_id is not null then
    select bank.id into selected_id
    from public.business_bank_accounts bank
    where bank.id = p_bank_account_id and bank.business_id = p_business_id and bank.is_active;
  end if;
  if selected_id is null then
    select bank.id into selected_id
    from public.business_bank_accounts bank
    where bank.business_id = p_business_id and bank.is_active
    order by case bank.account_kind when 'bank' then 0 when 'mobile_wallet' then 1 when 'cash' then 2 else 3 end, bank.name
    limit 1;
  end if;

  select jsonb_build_object(
    'business_id', p_business_id,
    'base_currency', business_currency,
    'can_manage', private.can_manage_business_banking(p_business_id),
    'start_date', start_date,
    'end_date', end_date,
    'selected_bank_account_id', selected_id,
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bank.id,
        'ledger_account_id', bank.ledger_account_id,
        'ledger_code', ledger.code,
        'ledger_name', ledger.name,
        'name', bank.name,
        'institution_name', bank.institution_name,
        'account_kind', bank.account_kind,
        'account_number_masked', bank.account_number_masked,
        'currency', bank.currency,
        'reconciliation_start_date', bank.reconciliation_start_date,
        'opening_balance_transaction', bank.opening_balance_transaction,
        'opening_balance_base', bank.opening_balance_base,
        'is_active', bank.is_active,
        'ledger_balance_base', round(bank.opening_balance_base + coalesce((
          select sum(line.debit_base - line.credit_base)
          from public.business_journal_lines line
          join public.business_journal_entries entry
            on entry.business_id = line.business_id and entry.id = line.journal_entry_id
          where line.business_id = bank.business_id and line.account_id = bank.ledger_account_id
            and entry.status in ('posted','reversed')
            and entry.entry_date between bank.reconciliation_start_date and end_date
        ), 0), 6),
        'latest_statement_balance_base', (
          select imported.closing_balance_base
          from public.business_bank_statement_imports imported
          where imported.business_id = bank.business_id and imported.bank_account_id = bank.id and imported.status <> 'void'
          order by imported.period_end desc, imported.created_at desc limit 1
        ),
        'unreconciled_lines', (
          select count(*)
          from public.business_bank_statement_lines statement_line
          join public.business_bank_statement_imports imported
            on imported.business_id = statement_line.business_id and imported.id = statement_line.import_id
          left join public.business_bank_matches match
            on match.business_id = statement_line.business_id and match.statement_line_id = statement_line.id
          where statement_line.business_id = bank.business_id and statement_line.bank_account_id = bank.id
            and imported.status = 'draft' and statement_line.excluded_at is null
          group by statement_line.bank_account_id
          having count(*) > 0
        )
      ) order by case bank.account_kind when 'bank' then 0 when 'mobile_wallet' then 1 when 'cash' then 2 else 3 end, bank.name)
      from public.business_bank_accounts bank
      join public.business_chart_of_accounts ledger
        on ledger.business_id = bank.business_id and ledger.id = bank.ledger_account_id
      where bank.business_id = p_business_id
    ), '[]'::jsonb),
    'available_ledger_accounts', coalesce((
      select jsonb_agg(jsonb_build_object('id', ledger.id, 'code', ledger.code, 'name', ledger.name, 'system_key', ledger.system_key) order by ledger.code)
      from public.business_chart_of_accounts ledger
      where ledger.business_id = p_business_id and ledger.is_active and ledger.account_type = 'asset' and ledger.normal_balance = 'debit'
        and not exists(
          select 1 from public.business_bank_accounts bank
          where bank.business_id = p_business_id and bank.ledger_account_id = ledger.id
        )
    ), '[]'::jsonb),
    'imports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', imported.id,
        'bank_account_id', imported.bank_account_id,
        'file_name', imported.file_name,
        'period_start', imported.period_start,
        'period_end', imported.period_end,
        'currency', imported.currency,
        'opening_balance_transaction', imported.opening_balance_transaction,
        'closing_balance_transaction', imported.closing_balance_transaction,
        'opening_balance_base', imported.opening_balance_base,
        'closing_balance_base', imported.closing_balance_base,
        'line_count', imported.line_count,
        'status', imported.status,
        'created_at', imported.created_at,
        'reconciliation_id', rec.id,
        'reconciliation_status', rec.status,
        'matched_lines', (
          select count(*) from (
            select line.id
            from public.business_bank_statement_lines line
            left join public.business_bank_matches match on match.business_id = line.business_id and match.statement_line_id = line.id
            where line.business_id = imported.business_id and line.import_id = imported.id and line.excluded_at is null
            group by line.id, line.amount_base
            having abs(abs(line.amount_base) - coalesce(sum(match.amount_base), 0)) <= 0.01
          ) matched
        ),
        'excluded_lines', (
          select count(*) from public.business_bank_statement_lines line
          where line.business_id = imported.business_id and line.import_id = imported.id and line.excluded_at is not null
        )
      ) order by imported.period_end desc, imported.created_at desc)
      from public.business_bank_statement_imports imported
      left join public.business_bank_reconciliations rec
        on rec.business_id = imported.business_id and rec.statement_import_id = imported.id
      where imported.business_id = p_business_id and imported.bank_account_id = selected_id
        and imported.period_end >= start_date and imported.period_start <= end_date
    ), '[]'::jsonb),
    'statement_lines', coalesce((
      select jsonb_agg(line_json order by transaction_date desc, line_number desc)
      from (
        select statement_line.transaction_date, statement_line.line_number,
          jsonb_build_object(
            'id', statement_line.id,
            'import_id', statement_line.import_id,
            'transaction_date', statement_line.transaction_date,
            'posted_date', statement_line.posted_date,
            'description', statement_line.description,
            'reference', statement_line.reference,
            'external_id', statement_line.external_id,
            'amount_transaction', statement_line.amount_transaction,
            'amount_base', statement_line.amount_base,
            'running_balance_transaction', statement_line.running_balance_transaction,
            'excluded', statement_line.excluded_at is not null,
            'exclusion_reason', statement_line.exclusion_reason,
            'matched_base', coalesce(sum(match.amount_base), 0),
            'remaining_base', greatest(round(abs(statement_line.amount_base) - coalesce(sum(match.amount_base), 0), 6), 0),
            'match_status', case
              when statement_line.excluded_at is not null then 'excluded'
              when abs(abs(statement_line.amount_base) - coalesce(sum(match.amount_base), 0)) <= 0.01 then 'matched'
              when coalesce(sum(match.amount_base), 0) > 0 then 'partial'
              else 'unmatched'
            end,
            'matches', coalesce(jsonb_agg(jsonb_build_object(
              'id', match.id,
              'journal_line_id', match.journal_line_id,
              'amount_base', match.amount_base,
              'entry_date', matched_entry.entry_date,
              'reference', matched_entry.reference,
              'description', coalesce(matched_line.description, matched_entry.description),
              'source_type', matched_entry.source_type
            ) order by matched_entry.entry_date, match.id) filter (where match.id is not null), '[]'::jsonb)
          ) as line_json
        from public.business_bank_statement_lines statement_line
        join public.business_bank_statement_imports imported
          on imported.business_id = statement_line.business_id and imported.id = statement_line.import_id
        left join public.business_bank_matches match
          on match.business_id = statement_line.business_id and match.statement_line_id = statement_line.id
        left join public.business_journal_lines matched_line
          on matched_line.business_id = match.business_id and matched_line.id = match.journal_line_id
        left join public.business_journal_entries matched_entry
          on matched_entry.business_id = matched_line.business_id and matched_entry.id = matched_line.journal_entry_id
        where statement_line.business_id = p_business_id and statement_line.bank_account_id = selected_id
          and statement_line.transaction_date between start_date and end_date and imported.status <> 'void'
        group by statement_line.id, statement_line.transaction_date, statement_line.line_number
        order by statement_line.transaction_date desc, statement_line.line_number desc
        limit p_line_limit
      ) lines
    ), '[]'::jsonb),
    'reconciliations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rec.id,
        'statement_import_id', rec.statement_import_id,
        'period_start', rec.period_start,
        'period_end', rec.period_end,
        'status', rec.status,
        'statement_opening_base', rec.statement_opening_base,
        'statement_closing_base', rec.statement_closing_base,
        'ledger_balance_base', rec.ledger_balance_base,
        'outstanding_debits_base', rec.outstanding_debits_base,
        'outstanding_credits_base', rec.outstanding_credits_base,
        'adjusted_statement_balance_base', rec.adjusted_statement_balance_base,
        'difference_base', rec.difference_base,
        'notes', rec.notes,
        'completed_at', rec.completed_at,
        'locked_at', rec.locked_at,
        'reopened_at', rec.reopened_at
      ) order by rec.period_end desc, rec.created_at desc)
      from public.business_bank_reconciliations rec
      join public.business_bank_statement_imports imported
        on imported.business_id = rec.business_id and imported.id = rec.statement_import_id
      where rec.business_id = p_business_id and rec.bank_account_id = selected_id
        and imported.status <> 'void' and rec.period_end >= start_date and rec.period_start <= end_date
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'ledger_balance_base', coalesce((
        select round(bank.opening_balance_base + coalesce(sum(line.debit_base - line.credit_base), 0), 6)
        from public.business_bank_accounts bank
        left join public.business_journal_lines line on line.business_id = bank.business_id and line.account_id = bank.ledger_account_id
        left join public.business_journal_entries entry on entry.business_id = line.business_id and entry.id = line.journal_entry_id
          and entry.status in ('posted','reversed') and entry.entry_date between bank.reconciliation_start_date and end_date
        where bank.business_id = p_business_id and bank.id = selected_id
        group by bank.id, bank.opening_balance_base
      ), 0),
      'latest_statement_balance_base', (
        select imported.closing_balance_base
        from public.business_bank_statement_imports imported
        where imported.business_id = p_business_id and imported.bank_account_id = selected_id and imported.status <> 'void'
        order by imported.period_end desc, imported.created_at desc limit 1
      ),
      'unmatched_statement_lines', (
        select count(*) from (
          select line.id
          from public.business_bank_statement_lines line
          join public.business_bank_statement_imports imported on imported.business_id = line.business_id and imported.id = line.import_id
          left join public.business_bank_matches match on match.business_id = line.business_id and match.statement_line_id = line.id
          where line.business_id = p_business_id and line.bank_account_id = selected_id
            and imported.status = 'draft' and line.excluded_at is null
          group by line.id, line.amount_base
          having abs(abs(line.amount_base) - coalesce(sum(match.amount_base), 0)) > 0.01
        ) unmatched
      ),
      'draft_imports', (
        select count(*) from public.business_bank_statement_imports imported
        where imported.business_id = p_business_id and imported.bank_account_id = selected_id and imported.status = 'draft'
      )
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.upsert_business_bank_account(
  p_business_id uuid,
  p_bank_account_id uuid,
  p_ledger_account_id uuid,
  p_name text,
  p_institution_name text default null,
  p_account_kind text default 'bank',
  p_account_number_masked text default null,
  p_currency text default null,
  p_reconciliation_start_date date default current_date,
  p_opening_balance_transaction numeric default 0,
  p_opening_exchange_rate numeric default 1,
  p_is_active boolean default true
)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.upsert_business_bank_account_internal(p_business_id,p_bank_account_id,p_ledger_account_id,p_name,p_institution_name,p_account_kind,p_account_number_masked,p_currency,p_reconciliation_start_date,p_opening_balance_transaction,p_opening_exchange_rate,p_is_active);$$;

create or replace function public.import_business_bank_statement(
  p_business_id uuid,p_bank_account_id uuid,p_file_name text,p_file_hash text,p_period_start date,p_period_end date,
  p_opening_balance_transaction numeric,p_closing_balance_transaction numeric,p_opening_exchange_rate numeric default 1,
  p_closing_exchange_rate numeric default 1,p_default_exchange_rate numeric default 1,p_lines jsonb default '[]'::jsonb
)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.import_business_bank_statement_internal(p_business_id,p_bank_account_id,p_file_name,p_file_hash,p_period_start,p_period_end,p_opening_balance_transaction,p_closing_balance_transaction,p_opening_exchange_rate,p_closing_exchange_rate,p_default_exchange_rate,p_lines);$$;

create or replace function public.match_business_bank_statement_line(p_business_id uuid,p_statement_line_id uuid,p_journal_line_id uuid)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.match_business_bank_statement_line_internal(p_business_id,p_statement_line_id,p_journal_line_id);$$;
create or replace function public.unmatch_business_bank_statement_line(p_business_id uuid,p_match_id uuid)
returns boolean language sql set search_path = pg_catalog, public, private
as $$select private.unmatch_business_bank_statement_line_internal(p_business_id,p_match_id);$$;
create or replace function public.set_business_bank_statement_line_excluded(p_business_id uuid,p_statement_line_id uuid,p_excluded boolean,p_reason text default null)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.set_business_bank_statement_line_excluded_internal(p_business_id,p_statement_line_id,p_excluded,p_reason);$$;
create or replace function public.auto_match_business_bank_statement(p_business_id uuid,p_statement_import_id uuid,p_date_tolerance_days integer default 7)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.auto_match_business_bank_statement_internal(p_business_id,p_statement_import_id,p_date_tolerance_days);$$;
create or replace function public.void_business_bank_statement_import(p_business_id uuid,p_statement_import_id uuid,p_reason text)
returns boolean language sql set search_path = pg_catalog, public, private
as $$select private.void_business_bank_statement_import_internal(p_business_id,p_statement_import_id,p_reason);$$;
create or replace function public.complete_business_bank_reconciliation(p_business_id uuid,p_reconciliation_id uuid,p_notes text default null)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.complete_business_bank_reconciliation_internal(p_business_id,p_reconciliation_id,p_notes);$$;
create or replace function public.reopen_business_bank_reconciliation(p_business_id uuid,p_reconciliation_id uuid,p_notes text default null)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.reopen_business_bank_reconciliation_internal(p_business_id,p_reconciliation_id,p_notes);$$;
create or replace function public.lock_business_bank_reconciliation(p_business_id uuid,p_reconciliation_id uuid,p_notes text default null)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$select private.lock_business_bank_reconciliation_internal(p_business_id,p_reconciliation_id,p_notes);$$;
create or replace function public.get_business_bank_match_candidates(p_business_id uuid,p_statement_line_id uuid,p_limit integer default 8)
returns table(journal_line_id uuid,journal_entry_id uuid,entry_date date,reference text,description text,source_type text,amount_base numeric,amount_difference_base numeric,date_difference_days integer,exact_amount boolean)
language sql stable set search_path = pg_catalog, public, private
as $$select * from private.get_business_bank_match_candidates_internal(p_business_id,p_statement_line_id,p_limit);$$;
create or replace function public.get_business_banking_snapshot(p_business_id uuid,p_bank_account_id uuid default null,p_start_date date default null,p_end_date date default null,p_line_limit integer default 250)
returns jsonb language sql stable set search_path = pg_catalog, public, private
as $$select private.get_business_banking_snapshot_internal(p_business_id,p_bank_account_id,p_start_date,p_end_date,p_line_limit);$$;

revoke all on function private.upsert_business_bank_account_internal(uuid,uuid,uuid,text,text,text,text,text,date,numeric,numeric,boolean) from public;
revoke all on function private.import_business_bank_statement_internal(uuid,uuid,text,text,date,date,numeric,numeric,numeric,numeric,numeric,jsonb) from public;
revoke all on function private.match_business_bank_statement_line_internal(uuid,uuid,uuid) from public;
revoke all on function private.unmatch_business_bank_statement_line_internal(uuid,uuid) from public;
revoke all on function private.set_business_bank_statement_line_excluded_internal(uuid,uuid,boolean,text) from public;
revoke all on function private.auto_match_business_bank_statement_internal(uuid,uuid,integer) from public;
revoke all on function private.void_business_bank_statement_import_internal(uuid,uuid,text) from public;
revoke all on function private.complete_business_bank_reconciliation_internal(uuid,uuid,text) from public;
revoke all on function private.reopen_business_bank_reconciliation_internal(uuid,uuid,text) from public;
revoke all on function private.lock_business_bank_reconciliation_internal(uuid,uuid,text) from public;
revoke all on function private.get_business_bank_match_candidates_internal(uuid,uuid,integer) from public;
revoke all on function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer) from public;

grant execute on function private.upsert_business_bank_account_internal(uuid,uuid,uuid,text,text,text,text,text,date,numeric,numeric,boolean) to authenticated;
grant execute on function private.import_business_bank_statement_internal(uuid,uuid,text,text,date,date,numeric,numeric,numeric,numeric,numeric,jsonb) to authenticated;
grant execute on function private.match_business_bank_statement_line_internal(uuid,uuid,uuid) to authenticated;
grant execute on function private.unmatch_business_bank_statement_line_internal(uuid,uuid) to authenticated;
grant execute on function private.set_business_bank_statement_line_excluded_internal(uuid,uuid,boolean,text) to authenticated;
grant execute on function private.auto_match_business_bank_statement_internal(uuid,uuid,integer) to authenticated;
grant execute on function private.void_business_bank_statement_import_internal(uuid,uuid,text) to authenticated;
grant execute on function private.complete_business_bank_reconciliation_internal(uuid,uuid,text) to authenticated;
grant execute on function private.reopen_business_bank_reconciliation_internal(uuid,uuid,text) to authenticated;
grant execute on function private.lock_business_bank_reconciliation_internal(uuid,uuid,text) to authenticated;
grant execute on function private.get_business_bank_match_candidates_internal(uuid,uuid,integer) to authenticated;
grant execute on function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer) to authenticated;

revoke all on function public.upsert_business_bank_account(uuid,uuid,uuid,text,text,text,text,text,date,numeric,numeric,boolean) from public, anon;
revoke all on function public.import_business_bank_statement(uuid,uuid,text,text,date,date,numeric,numeric,numeric,numeric,numeric,jsonb) from public, anon;
revoke all on function public.match_business_bank_statement_line(uuid,uuid,uuid) from public, anon;
revoke all on function public.unmatch_business_bank_statement_line(uuid,uuid) from public, anon;
revoke all on function public.set_business_bank_statement_line_excluded(uuid,uuid,boolean,text) from public, anon;
revoke all on function public.auto_match_business_bank_statement(uuid,uuid,integer) from public, anon;
revoke all on function public.void_business_bank_statement_import(uuid,uuid,text) from public, anon;
revoke all on function public.complete_business_bank_reconciliation(uuid,uuid,text) from public, anon;
revoke all on function public.reopen_business_bank_reconciliation(uuid,uuid,text) from public, anon;
revoke all on function public.lock_business_bank_reconciliation(uuid,uuid,text) from public, anon;
revoke all on function public.get_business_bank_match_candidates(uuid,uuid,integer) from public, anon;
revoke all on function public.get_business_banking_snapshot(uuid,uuid,date,date,integer) from public, anon;

grant execute on function public.upsert_business_bank_account(uuid,uuid,uuid,text,text,text,text,text,date,numeric,numeric,boolean) to authenticated;
grant execute on function public.import_business_bank_statement(uuid,uuid,text,text,date,date,numeric,numeric,numeric,numeric,numeric,jsonb) to authenticated;
grant execute on function public.match_business_bank_statement_line(uuid,uuid,uuid) to authenticated;
grant execute on function public.unmatch_business_bank_statement_line(uuid,uuid) to authenticated;
grant execute on function public.set_business_bank_statement_line_excluded(uuid,uuid,boolean,text) to authenticated;
grant execute on function public.auto_match_business_bank_statement(uuid,uuid,integer) to authenticated;
grant execute on function public.void_business_bank_statement_import(uuid,uuid,text) to authenticated;
grant execute on function public.complete_business_bank_reconciliation(uuid,uuid,text) to authenticated;
grant execute on function public.reopen_business_bank_reconciliation(uuid,uuid,text) to authenticated;
grant execute on function public.lock_business_bank_reconciliation(uuid,uuid,text) to authenticated;
grant execute on function public.get_business_bank_match_candidates(uuid,uuid,integer) to authenticated;
grant execute on function public.get_business_banking_snapshot(uuid,uuid,date,date,integer) to authenticated;
