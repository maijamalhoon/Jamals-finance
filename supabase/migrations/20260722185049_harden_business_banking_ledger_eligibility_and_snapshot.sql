create or replace function private.is_eligible_business_bank_ledger(
  p_business_id uuid,
  p_ledger_account_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select exists(
  select 1
  from public.business_chart_of_accounts account
  where account.business_id = p_business_id
    and account.id = p_ledger_account_id
    and account.is_active
    and account.account_type = 'asset'
    and account.normal_balance = 'debit'
    and account.allow_manual_posting
    and (
      account.system_key in ('bank','cash')
      or account.account_subtype in ('bank','cash','mobile_wallet','clearing','cash_equivalent')
    )
);
$$;

revoke all on function private.is_eligible_business_bank_ledger(uuid,uuid) from public;
grant execute on function private.is_eligible_business_bank_ledger(uuid,uuid) to authenticated;

create or replace function private.validate_business_bank_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_eligible_business_bank_ledger(new.business_id, new.ledger_account_id) then
    raise exception 'Bank accounts require an active, manually postable bank or cash-equivalent asset ledger.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists business_bank_accounts_ledger_validation on public.business_bank_accounts;
create trigger business_bank_accounts_ledger_validation
before insert or update of business_id, ledger_account_id on public.business_bank_accounts
for each row execute function private.validate_business_bank_account_ledger();

create or replace function private.initialize_business_bank_account_from_chart()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  business_currency text;
  business_start date;
  business_owner uuid;
begin
  if new.account_type <> 'asset' or new.system_key is null or new.system_key not in ('bank','cash') then
    return new;
  end if;

  select business.base_currency,
         coalesce((
           select min(period.starts_on)
           from public.business_fiscal_periods period
           where period.business_id = business.id and period.status = 'open'
         ), business.created_at::date),
         business.owner_user_id
  into business_currency, business_start, business_owner
  from public.businesses business
  where business.id = new.business_id and business.status = 'active';

  if business_currency is null then return new; end if;

  perform set_config('app.business_banking_action', 'initialize', true);
  insert into public.business_bank_accounts(
    business_id, ledger_account_id, name, institution_name, account_kind,
    currency, reconciliation_start_date, created_by, updated_by
  ) values (
    new.business_id, new.id, new.name,
    case when new.system_key = 'bank' then 'Primary bank' else 'Cash control' end,
    case when new.system_key = 'bank' then 'bank' else 'cash' end,
    business_currency, coalesce(business_start, current_date),
    coalesce(new.created_by, business_owner), coalesce(new.created_by, business_owner)
  )
  on conflict (business_id, ledger_account_id) do nothing;
  return new;
end;
$$;

select set_config('app.business_banking_action', 'config', true);
update public.business_bank_accounts bank
set reconciliation_start_date = fiscal.starts_on,
    updated_by = coalesce(bank.updated_by, business.owner_user_id)
from public.businesses business
join lateral (
  select min(period.starts_on) as starts_on
  from public.business_fiscal_periods period
  where period.business_id = business.id and period.status = 'open'
) fiscal on fiscal.starts_on is not null
where bank.business_id = business.id
  and not exists(
    select 1 from public.business_bank_reconciliations reconciliation
    where reconciliation.business_id = bank.business_id
      and reconciliation.bank_account_id = bank.id
      and reconciliation.status in ('completed','locked')
  );

alter function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer)
rename to get_business_banking_snapshot_raw_internal;

revoke all on function private.get_business_banking_snapshot_raw_internal(uuid,uuid,date,date,integer) from public, authenticated;

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
begin
  if auth.uid() is null or not private.can_view_business_banking(p_business_id) then
    raise exception 'Banking access required.' using errcode = '42501';
  end if;

  snapshot := private.get_business_banking_snapshot_raw_internal(
    p_business_id, p_bank_account_id, p_start_date, p_end_date, p_line_limit
  );

  select coalesce(jsonb_agg(
    account_item || jsonb_build_object(
      'unreconciled_lines', coalesce(nullif(account_item ->> 'unreconciled_lines', '')::integer, 0)
    )
  ), '[]'::jsonb)
  into normalized_accounts
  from jsonb_array_elements(coalesce(snapshot -> 'accounts', '[]'::jsonb)) account_item;

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
  return snapshot;
end;
$$;

revoke all on function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer) from public;
grant execute on function private.get_business_banking_snapshot_internal(uuid,uuid,date,date,integer) to authenticated;
