begin;

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type = any (array[
    'income'::text,
    'expense'::text,
    'investment'::text,
    'refund'::text
  ]));

create index if not exists categories_parent_owner_idx
  on public.categories(parent_id, user_id)
  where parent_id is not null;

create index if not exists transactions_category_owner_idx
  on public.transactions(category_id, user_id)
  where category_id is not null;

create or replace function public.transaction_balance_delta(
  tx_type text,
  tx_amount numeric
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when tx_type = 'income' then coalesce(tx_amount, 0)
    when tx_type in ('expense', 'investment') then -coalesce(tx_amount, 0)
    else 0
  end;
$$;

update public.transactions
set type = 'investment'
where investment_id is not null
  and type <> 'investment';

create or replace function public.save_investment_purchase(
  p_investment_id uuid,
  p_name text,
  p_type text,
  p_quantity numeric,
  p_purchase_price numeric,
  p_purchase_price_original numeric,
  p_purchase_currency text,
  p_current_price numeric,
  p_current_price_original numeric,
  p_current_price_currency text,
  p_purchased_at date,
  p_asset_id text,
  p_symbol text,
  p_image_url text,
  p_price_source text,
  p_price_currency text,
  p_price_updated_at timestamptz,
  p_price_change_24h numeric,
  p_is_live_priced boolean,
  p_account_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_investment_id uuid;
  investment_category_id uuid;
  saved_transaction_id uuid;
  transaction_amount numeric;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before saving this investment.';
  end if;

  if p_account_id is null or not exists (
    select 1
    from public.accounts account
    where account.id = p_account_id
      and account.user_id = current_user_id
  ) then
    raise exception 'Choose one of your accounts for this investment.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Investment name is required.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Investment quantity must be greater than 0.';
  end if;

  if p_purchase_price is null or p_purchase_price <= 0 then
    raise exception 'Investment buy price must be greater than 0.';
  end if;

  if p_current_price is null or p_current_price <= 0 then
    raise exception 'Investment current price must be greater than 0.';
  end if;

  select category.id
    into investment_category_id
  from public.categories category
  where category.user_id = current_user_id
    and category.type = 'expense'
    and lower(category.name) in ('investment', 'investments')
    and category.parent_id is null
  order by case lower(category.name) when 'investments' then 0 else 1 end
  limit 1;

  if investment_category_id is null then
    insert into public.categories(user_id, name, type, color)
    values (current_user_id, 'Investments', 'expense', '#7c5ce0')
    returning id into investment_category_id;
  end if;

  if p_investment_id is null then
    insert into public.investments(
      user_id,
      name,
      type,
      quantity,
      purchase_price,
      purchase_price_original,
      purchase_currency,
      current_price,
      current_price_original,
      current_price_currency,
      purchased_at,
      asset_id,
      symbol,
      image_url,
      price_source,
      price_currency,
      price_updated_at,
      price_change_24h,
      is_live_priced
    )
    values (
      current_user_id,
      btrim(p_name),
      p_type,
      p_quantity,
      p_purchase_price,
      p_purchase_price_original,
      p_purchase_currency,
      p_current_price,
      p_current_price_original,
      p_current_price_currency,
      p_purchased_at,
      nullif(btrim(coalesce(p_asset_id, '')), ''),
      nullif(btrim(coalesce(p_symbol, '')), ''),
      nullif(btrim(coalesce(p_image_url, '')), ''),
      coalesce(nullif(btrim(coalesce(p_price_source, '')), ''), 'manual'),
      coalesce(nullif(btrim(coalesce(p_price_currency, '')), ''), 'PKR'),
      p_price_updated_at,
      p_price_change_24h,
      coalesce(p_is_live_priced, false)
    )
    returning id into saved_investment_id;
  else
    update public.investments
    set
      name = btrim(p_name),
      type = p_type,
      quantity = p_quantity,
      purchase_price = p_purchase_price,
      purchase_price_original = p_purchase_price_original,
      purchase_currency = p_purchase_currency,
      current_price = p_current_price,
      current_price_original = p_current_price_original,
      current_price_currency = p_current_price_currency,
      purchased_at = p_purchased_at,
      asset_id = nullif(btrim(coalesce(p_asset_id, '')), ''),
      symbol = nullif(btrim(coalesce(p_symbol, '')), ''),
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      price_source = coalesce(nullif(btrim(coalesce(p_price_source, '')), ''), 'manual'),
      price_currency = coalesce(nullif(btrim(coalesce(p_price_currency, '')), ''), 'PKR'),
      price_updated_at = p_price_updated_at,
      price_change_24h = p_price_change_24h,
      is_live_priced = coalesce(p_is_live_priced, false)
    where id = p_investment_id
      and user_id = current_user_id
    returning id into saved_investment_id;

    if saved_investment_id is null then
      raise exception 'Investment not found.';
    end if;
  end if;

  transaction_amount = p_quantity * p_purchase_price;

  select transaction.id
    into saved_transaction_id
  from public.transactions transaction
  where transaction.user_id = current_user_id
    and transaction.investment_id = saved_investment_id
  limit 1;

  if saved_transaction_id is null then
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
      investment_id
    )
    values (
      current_user_id,
      'investment',
      transaction_amount,
      investment_category_id,
      p_account_id,
      p_purchased_at,
      'Investment contribution: ' || btrim(p_name),
      'Investments',
      null,
      btrim(p_name),
      saved_investment_id
    );
  else
    update public.transactions
    set
      type = 'investment',
      amount = transaction_amount,
      category_id = investment_category_id,
      account_id = p_account_id,
      date = p_purchased_at,
      note = 'Investment contribution: ' || btrim(p_name),
      source_name = 'Investments',
      person_name = null,
      item_name = btrim(p_name)
    where id = saved_transaction_id
      and user_id = current_user_id;
  end if;

  return saved_investment_id;
end;
$$;

revoke execute on function public.save_investment_purchase(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  numeric,
  boolean,
  uuid
) from public, anon;

grant execute on function public.save_investment_purchase(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  numeric,
  boolean,
  uuid
) to authenticated;

revoke execute on function public.sync_account_balance_from_transaction()
  from public, anon, authenticated;
revoke execute on function public.sync_liability_payment_totals()
  from public, anon, authenticated;
revoke execute on function public.touch_updated_at()
  from public, anon, authenticated;

commit;
