begin;

-- Existing live-priced rows stored the original value as a per-unit price.
-- Keep the unit cost basis intact, but preserve the user's entered total amount
-- for future PKR/USD edits.
update public.investments
set purchase_price_original = purchase_price_original * quantity
where coalesce(is_live_priced, false)
  and lower(coalesce(price_source, '')) in ('coingecko', 'alpha_vantage')
  and purchase_price_original is not null
  and quantity is not null
  and quantity > 0;

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
  p_price_updated_at timestamp with time zone,
  p_price_change_24h numeric,
  p_is_live_priced boolean,
  p_account_id uuid
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  current_user_id uuid := auth.uid();
  saved_investment_id uuid;
  investment_category_id uuid;
  saved_transaction_id uuid;
  transaction_amount numeric;
  effective_quantity numeric;
  effective_purchase_price numeric;
  saved_purchase_original numeric;
  saved_purchase_date date;
  amount_based_live boolean :=
    coalesce(p_is_live_priced, false)
    and lower(coalesce(p_price_source, '')) in ('coingecko', 'alpha_vantage');
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
    raise exception 'Investment buy amount must be greater than 0.';
  end if;

  if p_current_price is null or p_current_price <= 0 then
    raise exception 'Investment current price must be greater than 0.';
  end if;

  if p_purchased_at is null then
    raise exception 'Investment purchase date is required.';
  end if;

  if amount_based_live then
    -- Live assets treat the form value as the total invested amount. Convert
    -- that amount into asset units using the normalized live PKR quote.
    effective_quantity := p_purchase_price / p_current_price;
    effective_purchase_price := p_current_price;
    transaction_amount := p_purchase_price;
    saved_purchase_original := coalesce(
      p_purchase_price_original,
      case
        when upper(coalesce(p_purchase_currency, 'PKR')) = 'PKR'
          then p_purchase_price
        else null
      end
    );
  else
    -- Manual assets keep the existing quantity x unit-price behaviour.
    effective_quantity := p_quantity;
    effective_purchase_price := p_purchase_price;
    transaction_amount := p_quantity * p_purchase_price;
    saved_purchase_original := p_purchase_price_original;
  end if;

  if effective_quantity is null or effective_quantity <= 0 then
    raise exception 'Investment quantity could not be calculated safely.';
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
    saved_purchase_date := p_purchased_at;

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
      effective_quantity,
      effective_purchase_price,
      saved_purchase_original,
      upper(coalesce(nullif(btrim(coalesce(p_purchase_currency, '')), ''), 'PKR')),
      p_current_price,
      p_current_price_original,
      p_current_price_currency,
      saved_purchase_date,
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
    select investment.purchased_at
      into saved_purchase_date
    from public.investments investment
    where investment.id = p_investment_id
      and investment.user_id = current_user_id
    for update;

    if not found then
      raise exception 'Investment not found.';
    end if;

    saved_purchase_date := coalesce(saved_purchase_date, p_purchased_at);

    update public.investments
    set
      name = btrim(p_name),
      type = p_type,
      quantity = effective_quantity,
      purchase_price = effective_purchase_price,
      purchase_price_original = saved_purchase_original,
      purchase_currency = upper(coalesce(nullif(btrim(coalesce(p_purchase_currency, '')), ''), 'PKR')),
      current_price = p_current_price,
      current_price_original = p_current_price_original,
      current_price_currency = p_current_price_currency,
      purchased_at = saved_purchase_date,
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
  end if;

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
      saved_purchase_date,
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
      date = saved_purchase_date,
      note = 'Investment contribution: ' || btrim(p_name),
      source_name = 'Investments',
      person_name = null,
      item_name = btrim(p_name)
    where id = saved_transaction_id
      and user_id = current_user_id;
  end if;

  return saved_investment_id;
end;
$function$;

revoke all on function public.save_investment_purchase(
  uuid, text, text, numeric, numeric, numeric, text, numeric, numeric, text,
  date, text, text, text, text, text, timestamp with time zone, numeric, boolean, uuid
) from public;
revoke all on function public.save_investment_purchase(
  uuid, text, text, numeric, numeric, numeric, text, numeric, numeric, text,
  date, text, text, text, text, text, timestamp with time zone, numeric, boolean, uuid
) from anon;
grant execute on function public.save_investment_purchase(
  uuid, text, text, numeric, numeric, numeric, text, numeric, numeric, text,
  date, text, text, text, text, text, timestamp with time zone, numeric, boolean, uuid
) to authenticated;

commit;
