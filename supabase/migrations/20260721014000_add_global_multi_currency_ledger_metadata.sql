create or replace function public.is_supported_financial_currency(value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select upper(coalesce(value, '')) in ('PKR','USD','INR','EUR','GBP','JPY','CNY');
$$;

create or replace function public.normalized_amount_pkr(
  original_amount numeric,
  original_currency text,
  exchange_rate_to_pkr numeric
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
begin
  if original_amount is null or original_amount::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Financial amount is invalid.';
  end if;
  if not public.is_supported_financial_currency(original_currency) then
    raise exception 'Unsupported financial currency.';
  end if;
  if exchange_rate_to_pkr is null
    or exchange_rate_to_pkr <= 0
    or exchange_rate_to_pkr::text in ('NaN','Infinity','-Infinity')
  then
    raise exception 'Exchange rate must be greater than zero.';
  end if;
  return original_amount * exchange_rate_to_pkr;
end;
$$;

alter table public.profiles drop constraint if exists profiles_preferred_currency_check;
alter table public.profiles
  add constraint profiles_preferred_currency_check
  check (preferred_currency is null or public.is_supported_financial_currency(preferred_currency));

alter table public.accounts
  add column if not exists opening_balance_original numeric,
  add column if not exists opening_currency text,
  add column if not exists opening_exchange_rate_to_pkr numeric;

alter table public.transactions
  add column if not exists amount_original numeric,
  add column if not exists currency text,
  add column if not exists exchange_rate_to_pkr numeric;

alter table public.account_transfers
  add column if not exists amount_original numeric,
  add column if not exists currency text,
  add column if not exists exchange_rate_to_pkr numeric;

alter table public.goals
  add column if not exists target_amount_original numeric,
  add column if not exists currency text,
  add column if not exists exchange_rate_to_pkr numeric;

alter table public.goal_contributions
  add column if not exists amount_original numeric,
  add column if not exists currency text,
  add column if not exists exchange_rate_to_pkr numeric;

alter table public.liabilities
  add column if not exists original_value_input numeric,
  add column if not exists currency text,
  add column if not exists exchange_rate_to_pkr numeric;

alter table public.liability_payments
  add column if not exists amount_original numeric,
  add column if not exists currency text,
  add column if not exists exchange_rate_to_pkr numeric;

-- Backfill historical rows without firing balance-changing triggers.
set local session_replication_role = replica;

update public.accounts
set opening_balance_original = coalesce(opening_balance_original, balance, 0),
    opening_currency = coalesce(opening_currency, 'PKR'),
    opening_exchange_rate_to_pkr = coalesce(opening_exchange_rate_to_pkr, 1)
where opening_balance_original is null or opening_currency is null or opening_exchange_rate_to_pkr is null;

update public.transactions
set amount_original = coalesce(amount_original, amount),
    currency = coalesce(currency, 'PKR'),
    exchange_rate_to_pkr = coalesce(exchange_rate_to_pkr, 1)
where amount_original is null or currency is null or exchange_rate_to_pkr is null;

update public.account_transfers
set amount_original = coalesce(amount_original, amount),
    currency = coalesce(currency, 'PKR'),
    exchange_rate_to_pkr = coalesce(exchange_rate_to_pkr, 1)
where amount_original is null or currency is null or exchange_rate_to_pkr is null;

update public.goals
set target_amount_original = coalesce(target_amount_original, target_amount),
    currency = coalesce(currency, 'PKR'),
    exchange_rate_to_pkr = coalesce(exchange_rate_to_pkr, 1)
where target_amount_original is null or currency is null or exchange_rate_to_pkr is null;

update public.goal_contributions
set amount_original = coalesce(amount_original, amount),
    currency = coalesce(currency, 'PKR'),
    exchange_rate_to_pkr = coalesce(exchange_rate_to_pkr, 1)
where amount_original is null or currency is null or exchange_rate_to_pkr is null;

update public.liabilities
set original_value_input = coalesce(original_value_input, original_value),
    currency = coalesce(currency, 'PKR'),
    exchange_rate_to_pkr = coalesce(exchange_rate_to_pkr, 1)
where original_value_input is null or currency is null or exchange_rate_to_pkr is null;

update public.liability_payments
set amount_original = coalesce(amount_original, amount),
    currency = coalesce(currency, 'PKR'),
    exchange_rate_to_pkr = coalesce(exchange_rate_to_pkr, 1)
where amount_original is null or currency is null or exchange_rate_to_pkr is null;

set local session_replication_role = origin;

alter table public.accounts
  alter column opening_balance_original set default 0,
  alter column opening_balance_original set not null,
  alter column opening_currency set default 'PKR',
  alter column opening_currency set not null,
  alter column opening_exchange_rate_to_pkr set default 1,
  alter column opening_exchange_rate_to_pkr set not null;

alter table public.transactions
  alter column amount_original set not null,
  alter column currency set default 'PKR',
  alter column currency set not null,
  alter column exchange_rate_to_pkr set default 1,
  alter column exchange_rate_to_pkr set not null;

alter table public.account_transfers
  alter column amount_original set not null,
  alter column currency set default 'PKR',
  alter column currency set not null,
  alter column exchange_rate_to_pkr set default 1,
  alter column exchange_rate_to_pkr set not null;

alter table public.goals
  alter column target_amount_original set not null,
  alter column currency set default 'PKR',
  alter column currency set not null,
  alter column exchange_rate_to_pkr set default 1,
  alter column exchange_rate_to_pkr set not null;

alter table public.goal_contributions
  alter column amount_original set not null,
  alter column currency set default 'PKR',
  alter column currency set not null,
  alter column exchange_rate_to_pkr set default 1,
  alter column exchange_rate_to_pkr set not null;

alter table public.liabilities
  alter column original_value_input set not null,
  alter column currency set default 'PKR',
  alter column currency set not null,
  alter column exchange_rate_to_pkr set default 1,
  alter column exchange_rate_to_pkr set not null;

alter table public.liability_payments
  alter column amount_original set not null,
  alter column currency set default 'PKR',
  alter column currency set not null,
  alter column exchange_rate_to_pkr set default 1,
  alter column exchange_rate_to_pkr set not null;

alter table public.accounts drop constraint if exists accounts_opening_currency_check;
alter table public.accounts add constraint accounts_opening_currency_check
  check (public.is_supported_financial_currency(opening_currency));
alter table public.accounts drop constraint if exists accounts_opening_exchange_rate_check;
alter table public.accounts add constraint accounts_opening_exchange_rate_check
  check (opening_exchange_rate_to_pkr > 0);

alter table public.transactions drop constraint if exists transactions_currency_check;
alter table public.transactions add constraint transactions_currency_check
  check (public.is_supported_financial_currency(currency));
alter table public.transactions drop constraint if exists transactions_exchange_rate_check;
alter table public.transactions add constraint transactions_exchange_rate_check
  check (exchange_rate_to_pkr > 0);

alter table public.account_transfers drop constraint if exists account_transfers_currency_check;
alter table public.account_transfers add constraint account_transfers_currency_check
  check (public.is_supported_financial_currency(currency));
alter table public.account_transfers drop constraint if exists account_transfers_exchange_rate_check;
alter table public.account_transfers add constraint account_transfers_exchange_rate_check
  check (exchange_rate_to_pkr > 0);

alter table public.goals drop constraint if exists goals_currency_check;
alter table public.goals add constraint goals_currency_check
  check (public.is_supported_financial_currency(currency));
alter table public.goals drop constraint if exists goals_exchange_rate_check;
alter table public.goals add constraint goals_exchange_rate_check
  check (exchange_rate_to_pkr > 0);

alter table public.goal_contributions drop constraint if exists goal_contributions_currency_check;
alter table public.goal_contributions add constraint goal_contributions_currency_check
  check (public.is_supported_financial_currency(currency));
alter table public.goal_contributions drop constraint if exists goal_contributions_exchange_rate_check;
alter table public.goal_contributions add constraint goal_contributions_exchange_rate_check
  check (exchange_rate_to_pkr > 0);

alter table public.liabilities drop constraint if exists liabilities_currency_check;
alter table public.liabilities add constraint liabilities_currency_check
  check (public.is_supported_financial_currency(currency));
alter table public.liabilities drop constraint if exists liabilities_exchange_rate_check;
alter table public.liabilities add constraint liabilities_exchange_rate_check
  check (exchange_rate_to_pkr > 0);

alter table public.liability_payments drop constraint if exists liability_payments_currency_check;
alter table public.liability_payments add constraint liability_payments_currency_check
  check (public.is_supported_financial_currency(currency));
alter table public.liability_payments drop constraint if exists liability_payments_exchange_rate_check;
alter table public.liability_payments add constraint liability_payments_exchange_rate_check
  check (exchange_rate_to_pkr > 0);

alter table public.investment_withdrawals drop constraint if exists investment_withdrawals_purchase_currency_check;
alter table public.investment_withdrawals add constraint investment_withdrawals_purchase_currency_check
  check (public.is_supported_financial_currency(purchase_currency));
alter table public.investment_withdrawals drop constraint if exists investment_withdrawals_withdrawal_currency_check;
alter table public.investment_withdrawals add constraint investment_withdrawals_withdrawal_currency_check
  check (public.is_supported_financial_currency(withdrawal_currency));

alter table public.investments drop constraint if exists investments_purchase_currency_check;
alter table public.investments add constraint investments_purchase_currency_check
  check (purchase_currency is null or public.is_supported_financial_currency(purchase_currency));
alter table public.investments drop constraint if exists investments_current_price_currency_check;
alter table public.investments add constraint investments_current_price_currency_check
  check (current_price_currency is null or public.is_supported_financial_currency(current_price_currency));
alter table public.investments drop constraint if exists investments_price_currency_check;
alter table public.investments add constraint investments_price_currency_check
  check (price_currency is null or public.is_supported_financial_currency(price_currency));

create or replace function private.normalize_transaction_currency_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.amount_original is null then
      new.amount_original := new.amount;
      new.currency := 'PKR';
      new.exchange_rate_to_pkr := 1;
    else
      new.currency := upper(coalesce(new.currency, 'PKR'));
      new.exchange_rate_to_pkr := coalesce(new.exchange_rate_to_pkr, 1);
      new.amount := public.normalized_amount_pkr(new.amount_original, new.currency, new.exchange_rate_to_pkr);
    end if;
    return new;
  end if;

  if new.amount_original is distinct from old.amount_original
    or new.currency is distinct from old.currency
    or new.exchange_rate_to_pkr is distinct from old.exchange_rate_to_pkr
  then
    new.currency := upper(coalesce(new.currency, 'PKR'));
    new.exchange_rate_to_pkr := coalesce(new.exchange_rate_to_pkr, 1);
    new.amount := public.normalized_amount_pkr(new.amount_original, new.currency, new.exchange_rate_to_pkr);
  elsif new.amount is distinct from old.amount then
    new.amount_original := new.amount;
    new.currency := 'PKR';
    new.exchange_rate_to_pkr := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_normalize_currency_metadata on public.transactions;
create trigger transactions_normalize_currency_metadata
before insert or update of amount, amount_original, currency, exchange_rate_to_pkr
on public.transactions
for each row execute function private.normalize_transaction_currency_metadata();

create or replace function private.normalize_transfer_currency_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.amount_original is null then
      new.amount_original := new.amount;
      new.currency := 'PKR';
      new.exchange_rate_to_pkr := 1;
    else
      new.currency := upper(coalesce(new.currency, 'PKR'));
      new.exchange_rate_to_pkr := coalesce(new.exchange_rate_to_pkr, 1);
      new.amount := public.normalized_amount_pkr(new.amount_original, new.currency, new.exchange_rate_to_pkr);
    end if;
    return new;
  end if;

  if new.amount_original is distinct from old.amount_original
    or new.currency is distinct from old.currency
    or new.exchange_rate_to_pkr is distinct from old.exchange_rate_to_pkr
  then
    new.currency := upper(coalesce(new.currency, 'PKR'));
    new.exchange_rate_to_pkr := coalesce(new.exchange_rate_to_pkr, 1);
    new.amount := public.normalized_amount_pkr(new.amount_original, new.currency, new.exchange_rate_to_pkr);
  elsif new.amount is distinct from old.amount then
    new.amount_original := new.amount;
    new.currency := 'PKR';
    new.exchange_rate_to_pkr := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists account_transfers_normalize_currency_metadata on public.account_transfers;
create trigger account_transfers_normalize_currency_metadata
before insert or update of amount, amount_original, currency, exchange_rate_to_pkr
on public.account_transfers
for each row execute function private.normalize_transfer_currency_metadata();

create or replace function private.normalize_goal_currency_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.target_amount_original is null then
      new.target_amount_original := new.target_amount;
      new.currency := 'PKR';
      new.exchange_rate_to_pkr := 1;
    else
      new.currency := upper(coalesce(new.currency, 'PKR'));
      new.exchange_rate_to_pkr := coalesce(new.exchange_rate_to_pkr, 1);
      new.target_amount := public.normalized_amount_pkr(new.target_amount_original, new.currency, new.exchange_rate_to_pkr);
    end if;
    return new;
  end if;

  if new.target_amount_original is distinct from old.target_amount_original
    or new.currency is distinct from old.currency
    or new.exchange_rate_to_pkr is distinct from old.exchange_rate_to_pkr
  then
    new.currency := upper(coalesce(new.currency, 'PKR'));
    new.exchange_rate_to_pkr := coalesce(new.exchange_rate_to_pkr, 1);
    new.target_amount := public.normalized_amount_pkr(new.target_amount_original, new.currency, new.exchange_rate_to_pkr);
  elsif new.target_amount is distinct from old.target_amount then
    new.target_amount_original := new.target_amount;
    new.currency := 'PKR';
    new.exchange_rate_to_pkr := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists goals_normalize_currency_metadata on public.goals;
create trigger goals_normalize_currency_metadata
before insert or update of target_amount, target_amount_original, currency, exchange_rate_to_pkr
on public.goals
for each row execute function private.normalize_goal_currency_metadata();

comment on column public.transactions.amount is
  'Canonical PKR ledger amount used for balances, totals, analytics, and reports.';
comment on column public.transactions.amount_original is
  'Exact user-entered amount before conversion.';
comment on column public.transactions.currency is
  'ISO currency of amount_original.';
comment on column public.transactions.exchange_rate_to_pkr is
  'Locked PKR units per one unit of currency for this record.';
comment on column public.account_transfers.amount is
  'Canonical PKR transfer amount; source and destination deltas always match.';
comment on column public.goals.target_amount is
  'Canonical PKR target used for progress calculations.';
comment on column public.liabilities.original_value is
  'Canonical PKR liability principal.';
