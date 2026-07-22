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
  candidate_journal_line_id uuid;
  candidate_amount_base numeric(24,6);
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

  select bank_account.* into bank
  from public.business_bank_accounts bank_account
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
    select count(*),
           (array_agg(candidate.journal_line_id order by candidate.journal_line_id))[1],
           (array_agg(candidate.amount_base order by candidate.journal_line_id))[1]
    into candidate_count, candidate_journal_line_id, candidate_amount_base
    from (
      select journal_line.id as journal_line_id,
             case when journal_line.debit_base > 0 then journal_line.debit_base else journal_line.credit_base end as amount_base
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
      values(p_business_id, line_record.id, candidate_journal_line_id, candidate_amount_base, user_id);
      matched_count := matched_count + 1;
    end if;
  end loop;

  return jsonb_build_object('statement_import_id', imported.id, 'matched_count', matched_count);
end;
$$;
