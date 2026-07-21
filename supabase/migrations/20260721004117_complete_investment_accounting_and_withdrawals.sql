alter table public.investments
  add column if not exists purchase_exchange_rate numeric;

update public.investments
set purchase_exchange_rate = case
  when upper(coalesce(purchase_currency, 'PKR')) = 'USD'
    and purchase_price_original is not null
    and purchase_price_original > 0
    and purchase_price > 0
  then purchase_price / purchase_price_original
  else 1
end
where purchase_exchange_rate is null
   or purchase_exchange_rate <= 0;

alter table public.investments
  alter column purchase_exchange_rate set default 1,
  alter column purchase_exchange_rate set not null;

alter table public.investments
  drop constraint if exists investments_purchase_exchange_rate_check;

alter table public.investments
  add constraint investments_purchase_exchange_rate_check
  check (purchase_exchange_rate > 0);

create or replace function public.normalize_investment_purchase_accounting()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  normalized_currency text;
  derived_rate numeric;
begin
  normalized_currency := upper(
    coalesce(nullif(btrim(coalesce(new.purchase_currency, '')), ''), 'PKR')
  );

  if normalized_currency not in ('PKR', 'USD') then
    raise exception 'Investment purchase currency must be PKR or USD.';
  end if;

  if new.purchase_price is null
    or new.purchase_price <= 0
    or new.purchase_price::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Investment buy price must be greater than 0.';
  end if;

  if normalized_currency = 'USD' then
    if new.purchase_price_original is null
      or new.purchase_price_original <= 0
      or new.purchase_price_original::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Original USD investment buy price is required.';
    end if;

    if tg_op = 'UPDATE'
      and upper(coalesce(old.purchase_currency, 'PKR')) = 'USD'
      and old.purchase_exchange_rate is not null
      and old.purchase_exchange_rate > 0
    then
      derived_rate := old.purchase_exchange_rate;
    else
      derived_rate := new.purchase_price / new.purchase_price_original;
    end if;

    if derived_rate is null
      or derived_rate <= 0
      or derived_rate::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'USD to PKR purchase rate could not be calculated safely.';
    end if;

    new.purchase_currency := 'USD';
    new.purchase_exchange_rate := derived_rate;
    new.purchase_price := new.purchase_price_original * derived_rate;
  else
    new.purchase_currency := 'PKR';
    new.purchase_exchange_rate := 1;
    new.purchase_price_original := coalesce(new.purchase_price_original, new.purchase_price);
    new.purchase_price := new.purchase_price_original;
  end if;

  if new.purchase_price <= 0
    or new.purchase_price::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Normalized investment buy price could not be calculated safely.';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_investment_purchase_accounting on public.investments;
create trigger normalize_investment_purchase_accounting
before insert or update of purchase_price, purchase_price_original, purchase_currency
on public.investments
for each row
execute function public.normalize_investment_purchase_accounting();

create or replace function public.normalize_linked_investment_transaction_amount()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  normalized_amount numeric;
begin
  if new.deleted_at is not null
    or new.type <> 'investment'
    or new.investment_id is null
  then
    return new;
  end if;

  select investment.quantity * investment.purchase_price
    into normalized_amount
  from public.investments investment
  where investment.id = new.investment_id
    and investment.user_id = new.user_id;

  if normalized_amount is null
    or normalized_amount <= 0
    or normalized_amount::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Linked investment transaction amount could not be calculated safely.';
  end if;

  new.amount := normalized_amount;
  return new;
end;
$$;

drop trigger if exists normalize_linked_investment_transaction_amount on public.transactions;
create trigger normalize_linked_investment_transaction_amount
before insert or update of amount, type, investment_id, deleted_at
on public.transactions
for each row
execute function public.normalize_linked_investment_transaction_amount();

create table if not exists public.investment_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null,
  investment_name text not null,
  investment_type text not null,
  asset_id text,
  symbol text,
  image_url text,
  source_account_id uuid references public.accounts(id) on delete set null,
  destination_account_id uuid references public.accounts(id) on delete set null,
  source_transaction_id uuid references public.transactions(id) on delete set null,
  account_transfer_id uuid references public.account_transfers(id) on delete set null,
  pnl_transaction_id uuid references public.transactions(id) on delete set null,
  quantity numeric not null check (quantity > 0),
  remaining_quantity numeric not null check (remaining_quantity >= 0),
  purchase_price_pkr numeric not null check (purchase_price_pkr > 0),
  purchase_price_original numeric,
  purchase_currency text not null check (purchase_currency in ('PKR', 'USD')),
  purchase_exchange_rate numeric not null check (purchase_exchange_rate > 0),
  withdrawal_price_pkr numeric not null check (withdrawal_price_pkr >= 0),
  withdrawal_price_original numeric not null check (withdrawal_price_original >= 0),
  withdrawal_currency text not null check (withdrawal_currency in ('PKR', 'USD')),
  withdrawal_exchange_rate numeric not null check (withdrawal_exchange_rate > 0),
  cost_basis_pkr numeric not null check (cost_basis_pkr >= 0),
  proceeds_pkr numeric not null check (proceeds_pkr >= 0),
  realized_pnl_pkr numeric not null,
  withdrawn_at date not null,
  created_at timestamptz not null default now()
);

create index if not exists investment_withdrawals_user_date_idx
  on public.investment_withdrawals(user_id, withdrawn_at desc, created_at desc);

alter table public.investment_withdrawals enable row level security;

drop policy if exists investment_withdrawals_owner_select
  on public.investment_withdrawals;
create policy investment_withdrawals_owner_select
  on public.investment_withdrawals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.investment_withdrawals from anon, authenticated;
grant select on table public.investment_withdrawals to authenticated;
grant all on table public.investment_withdrawals to service_role;

create or replace function public.withdraw_investment(
  p_investment_id uuid,
  p_quantity numeric,
  p_withdrawal_price_original numeric,
  p_withdrawal_currency text,
  p_withdrawal_exchange_rate numeric,
  p_destination_account_id uuid,
  p_withdrawn_at date
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  current_user_id uuid := auth.uid();
  investment_row public.investments%rowtype;
  purchase_transaction public.transactions%rowtype;
  normalized_withdrawal_currency text;
  effective_withdrawal_rate numeric;
  withdrawal_price_pkr numeric;
  cost_basis_pkr numeric;
  proceeds_pkr numeric;
  realized_pnl_pkr numeric;
  remaining_quantity numeric;
  pnl_category_id uuid;
  pnl_transaction_id uuid;
  account_transfer_id uuid;
  withdrawal_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before withdrawing this investment.';
  end if;

  if p_investment_id is null then
    raise exception 'Choose an investment to withdraw.';
  end if;

  if p_quantity is null
    or p_quantity <= 0
    or p_quantity::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Withdrawal quantity must be greater than 0.';
  end if;

  if p_withdrawal_price_original is null
    or p_withdrawal_price_original < 0
    or p_withdrawal_price_original::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Withdrawal price cannot be negative.';
  end if;

  if p_destination_account_id is null then
    raise exception 'Choose the account that will receive the withdrawal.';
  end if;

  if p_withdrawn_at is null then
    raise exception 'Withdrawal date is required.';
  end if;

  normalized_withdrawal_currency := upper(
    coalesce(nullif(btrim(coalesce(p_withdrawal_currency, '')), ''), 'PKR')
  );

  if normalized_withdrawal_currency not in ('PKR', 'USD') then
    raise exception 'Withdrawal currency must be PKR or USD.';
  end if;

  effective_withdrawal_rate := case
    when normalized_withdrawal_currency = 'USD' then p_withdrawal_exchange_rate
    else 1
  end;

  if effective_withdrawal_rate is null
    or effective_withdrawal_rate <= 0
    or effective_withdrawal_rate::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Withdrawal exchange rate must be greater than 0.';
  end if;

  select investment.*
    into investment_row
  from public.investments investment
  where investment.id = p_investment_id
    and investment.user_id = current_user_id
  for update;

  if investment_row.id is null then
    raise exception 'Investment not found.';
  end if;

  if investment_row.quantity is null
    or investment_row.quantity <= 0
    or p_quantity > investment_row.quantity
  then
    raise exception 'Withdrawal quantity cannot exceed the available investment quantity.';
  end if;

  select transaction.*
    into purchase_transaction
  from public.transactions transaction
  where transaction.user_id = current_user_id
    and transaction.investment_id = investment_row.id
    and transaction.type = 'investment'
    and transaction.deleted_at is null
  order by transaction.created_at, transaction.id
  limit 1
  for update;

  if purchase_transaction.id is null or purchase_transaction.account_id is null then
    raise exception 'The investment purchase account could not be found.';
  end if;

  if not exists (
    select 1
    from public.accounts account
    where account.id = purchase_transaction.account_id
      and account.user_id = current_user_id
      and account.status = 'active'
  ) then
    raise exception 'The original investment account is not active.';
  end if;

  if not exists (
    select 1
    from public.accounts account
    where account.id = p_destination_account_id
      and account.user_id = current_user_id
      and account.status = 'active'
  ) then
    raise exception 'Choose one of your active accounts for the withdrawal.';
  end if;

  perform 1
  from public.accounts account
  where account.id in (purchase_transaction.account_id, p_destination_account_id)
    and account.user_id = current_user_id
  order by account.id
  for update;

  withdrawal_price_pkr := p_withdrawal_price_original * effective_withdrawal_rate;
  cost_basis_pkr := p_quantity * investment_row.purchase_price;
  proceeds_pkr := p_quantity * withdrawal_price_pkr;
  realized_pnl_pkr := proceeds_pkr - cost_basis_pkr;
  remaining_quantity := investment_row.quantity - p_quantity;

  if withdrawal_price_pkr < 0
    or cost_basis_pkr < 0
    or proceeds_pkr < 0
    or not (
      withdrawal_price_pkr::text not in ('NaN', 'Infinity', '-Infinity')
      and cost_basis_pkr::text not in ('NaN', 'Infinity', '-Infinity')
      and proceeds_pkr::text not in ('NaN', 'Infinity', '-Infinity')
      and realized_pnl_pkr::text not in ('NaN', 'Infinity', '-Infinity')
    )
  then
    raise exception 'Investment withdrawal could not be calculated safely.';
  end if;

  if remaining_quantity > 0 then
    update public.investments
    set quantity = remaining_quantity
    where id = investment_row.id
      and user_id = current_user_id;
  else
    delete from public.investments
    where id = investment_row.id
      and user_id = current_user_id;
  end if;

  if purchase_transaction.account_id is distinct from p_destination_account_id
    and cost_basis_pkr > 0
  then
    insert into public.account_transfers(
      user_id,
      from_account_id,
      to_account_id,
      amount,
      transfer_date,
      note,
      reference
    ) values (
      current_user_id,
      purchase_transaction.account_id,
      p_destination_account_id,
      cost_basis_pkr,
      p_withdrawn_at,
      'Investment principal moved: ' || btrim(investment_row.name),
      'INV-WD-' || left(investment_row.id::text, 8)
    )
    returning id into account_transfer_id;
  end if;

  if realized_pnl_pkr > 0 then
    select category.id
      into pnl_category_id
    from public.categories category
    where category.user_id = current_user_id
      and category.type = 'income'
      and lower(category.name) = 'investment profit'
      and category.parent_id is null
    limit 1;

    if pnl_category_id is null then
      insert into public.categories(user_id, name, type, color)
      values (current_user_id, 'Investment Profit', 'income', '#16a34a')
      returning id into pnl_category_id;
    end if;

    insert into public.transactions(
      user_id,
      type,
      amount,
      category_id,
      account_id,
      date,
      note,
      source_name,
      person_name,
      item_name,
      reference
    ) values (
      current_user_id,
      'income',
      realized_pnl_pkr,
      pnl_category_id,
      p_destination_account_id,
      p_withdrawn_at,
      'Realized investment profit: ' || btrim(investment_row.name),
      'Investments',
      null,
      btrim(investment_row.name),
      'INV-PROFIT-' || left(investment_row.id::text, 8)
    )
    returning id into pnl_transaction_id;
  elsif realized_pnl_pkr < 0 then
    select category.id
      into pnl_category_id
    from public.categories category
    where category.user_id = current_user_id
      and category.type = 'expense'
      and lower(category.name) = 'investment loss'
      and category.parent_id is null
    limit 1;

    if pnl_category_id is null then
      insert into public.categories(user_id, name, type, color)
      values (current_user_id, 'Investment Loss', 'expense', '#dc2626')
      returning id into pnl_category_id;
    end if;

    insert into public.transactions(
      user_id,
      type,
      amount,
      category_id,
      account_id,
      date,
      note,
      source_name,
      person_name,
      item_name,
      reference
    ) values (
      current_user_id,
      'expense',
      abs(realized_pnl_pkr),
      pnl_category_id,
      p_destination_account_id,
      p_withdrawn_at,
      'Realized investment loss: ' || btrim(investment_row.name),
      'Investments',
      null,
      btrim(investment_row.name),
      'INV-LOSS-' || left(investment_row.id::text, 8)
    )
    returning id into pnl_transaction_id;
  end if;

  insert into public.investment_withdrawals(
    user_id,
    investment_id,
    investment_name,
    investment_type,
    asset_id,
    symbol,
    image_url,
    source_account_id,
    destination_account_id,
    source_transaction_id,
    account_transfer_id,
    pnl_transaction_id,
    quantity,
    remaining_quantity,
    purchase_price_pkr,
    purchase_price_original,
    purchase_currency,
    purchase_exchange_rate,
    withdrawal_price_pkr,
    withdrawal_price_original,
    withdrawal_currency,
    withdrawal_exchange_rate,
    cost_basis_pkr,
    proceeds_pkr,
    realized_pnl_pkr,
    withdrawn_at
  ) values (
    current_user_id,
    investment_row.id,
    btrim(investment_row.name),
    investment_row.type,
    investment_row.asset_id,
    investment_row.symbol,
    investment_row.image_url,
    purchase_transaction.account_id,
    p_destination_account_id,
    purchase_transaction.id,
    account_transfer_id,
    pnl_transaction_id,
    p_quantity,
    greatest(remaining_quantity, 0),
    investment_row.purchase_price,
    investment_row.purchase_price_original,
    upper(coalesce(investment_row.purchase_currency, 'PKR')),
    investment_row.purchase_exchange_rate,
    withdrawal_price_pkr,
    p_withdrawal_price_original,
    normalized_withdrawal_currency,
    effective_withdrawal_rate,
    cost_basis_pkr,
    proceeds_pkr,
    realized_pnl_pkr,
    p_withdrawn_at
  )
  returning id into withdrawal_id;

  return withdrawal_id;
end;
$$;

revoke all on function public.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date) from public, anon;
grant execute on function public.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date) to authenticated, service_role;
