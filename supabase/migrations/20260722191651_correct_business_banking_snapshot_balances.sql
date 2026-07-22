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
  snapshot jsonb;
  normalized_accounts jsonb;
  eligible_ledgers jsonb;
  selected_id uuid;
  authoritative_ledger_balance numeric(24,6) := 0;
begin
  if auth.uid() is null or not private.can_view_business_banking(p_business_id) then
    raise exception 'Banking access required.' using errcode = '42501';
  end if;

  snapshot := private.get_business_banking_snapshot_raw_internal(
    p_business_id, p_bank_account_id, p_start_date, p_end_date, p_line_limit
  );
  selected_id := nullif(snapshot ->> 'selected_bank_account_id', '')::uuid;

  select coalesce(jsonb_agg(
    account_item || jsonb_build_object(
      'unreconciled_lines', (
        select count(*)
        from (
          select statement_line.id
          from public.business_bank_statement_lines statement_line
          join public.business_bank_statement_imports statement_import
            on statement_import.business_id = statement_line.business_id
           and statement_import.id = statement_line.import_id
          left join public.business_bank_matches match
            on match.business_id = statement_line.business_id
           and match.statement_line_id = statement_line.id
          where statement_line.business_id = p_business_id
            and statement_line.bank_account_id = (account_item ->> 'id')::uuid
            and statement_import.status = 'draft'
            and statement_line.excluded_at is null
          group by statement_line.id, statement_line.amount_base
          having abs(abs(statement_line.amount_base) - coalesce(sum(match.amount_base), 0)) > 0.01
        ) unmatched
      )
    )
  ), '[]'::jsonb)
  into normalized_accounts
  from jsonb_array_elements(coalesce(snapshot -> 'accounts', '[]'::jsonb)) account_item;

  select coalesce((account_item ->> 'ledger_balance_base')::numeric, 0)
  into authoritative_ledger_balance
  from jsonb_array_elements(normalized_accounts) account_item
  where (account_item ->> 'id')::uuid = selected_id
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ledger.id,
    'code', ledger.code,
    'name', ledger.name,
    'system_key', ledger.system_key,
    'account_subtype', ledger.account_subtype
  ) order by ledger.code), '[]'::jsonb)
  into eligible_ledgers
  from public.business_chart_of_accounts ledger
  where ledger.business_id = p_business_id
    and private.is_eligible_business_bank_ledger(p_business_id, ledger.id)
    and not exists(
      select 1
      from public.business_bank_accounts bank
      where bank.business_id = p_business_id and bank.ledger_account_id = ledger.id
    );

  snapshot := jsonb_set(snapshot, '{accounts}', normalized_accounts, true);
  snapshot := jsonb_set(snapshot, '{available_ledger_accounts}', eligible_ledgers, true);
  snapshot := jsonb_set(
    snapshot,
    '{summary,ledger_balance_base}',
    to_jsonb(authoritative_ledger_balance),
    true
  );
  return snapshot;
end;
$$;

revoke all on function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer) from public;
grant execute on function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer) to authenticated;
