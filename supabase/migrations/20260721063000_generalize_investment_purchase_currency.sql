create or replace function public.normalize_investment_purchase_accounting()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  normalized_currency text;
  effective_rate numeric;
begin
  normalized_currency := upper(
    coalesce(nullif(btrim(coalesce(new.purchase_currency, '')), ''), 'PKR')
  );

  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported investment purchase currency.';
  end if;

  if new.purchase_price is null
    or new.purchase_price <= 0
    or new.purchase_price::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Investment buy price must be greater than 0.';
  end if;

  if normalized_currency = 'PKR' then
    new.purchase_currency := 'PKR';
    new.purchase_exchange_rate := 1;
    new.purchase_price_original := coalesce(
      new.purchase_price_original,
      new.purchase_price
    );

    if new.purchase_price_original is null
      or new.purchase_price_original <= 0
      or new.purchase_price_original::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Original investment buy price must be greater than 0.';
    end if;

    new.purchase_price := new.purchase_price_original;
  else
    if new.purchase_price_original is null
      or new.purchase_price_original <= 0
      or new.purchase_price_original::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Original investment buy price is required.';
    end if;

    effective_rate := case
      when new.purchase_exchange_rate is not null
        and new.purchase_exchange_rate > 0
        and new.purchase_exchange_rate::text not in ('NaN', 'Infinity', '-Infinity')
      then new.purchase_exchange_rate
      when tg_op = 'UPDATE'
        and normalized_currency = upper(coalesce(old.purchase_currency, 'PKR'))
        and old.purchase_exchange_rate is not null
        and old.purchase_exchange_rate > 0
        and old.purchase_exchange_rate::text not in ('NaN', 'Infinity', '-Infinity')
      then old.purchase_exchange_rate
      else new.purchase_price / new.purchase_price_original
    end;

    if effective_rate is null
      or effective_rate <= 0
      or effective_rate::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Investment purchase exchange rate could not be calculated safely.';
    end if;

    new.purchase_currency := normalized_currency;
    new.purchase_exchange_rate := effective_rate;
    new.purchase_price := new.purchase_price_original * effective_rate;
  end if;

  if new.purchase_price <= 0
    or new.purchase_price::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Normalized investment buy price could not be calculated safely.';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_investment_purchase_accounting
  on public.investments;
create trigger normalize_investment_purchase_accounting
before insert or update of
  purchase_price,
  purchase_price_original,
  purchase_currency,
  purchase_exchange_rate
on public.investments
for each row
execute function public.normalize_investment_purchase_accounting();

create or replace function public.save_investment_purchase_currency(
  p_investment_id uuid,
  p_name text,
  p_type text,
  p_quantity numeric,
  p_purchase_price_original numeric,
  p_purchase_currency text,
  p_purchase_exchange_rate_to_pkr numeric,
  p_current_price_original numeric,
  p_current_price_currency text,
  p_current_exchange_rate_to_pkr numeric,
  p_purchased_at date,
  p_asset_id text,
  p_symbol text,
  p_image_url text,
  p_price_source text,
  p_price_updated_at timestamptz,
  p_price_change_24h numeric,
  p_is_live_priced boolean,
  p_account_id uuid
)
returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  normalized_purchase_currency text;
  normalized_current_currency text;
  purchase_price_pkr numeric;
  current_price_pkr numeric;
  saved_id uuid;
  purchase_total_original numeric;
begin
  normalized_purchase_currency := upper(
    coalesce(nullif(btrim(coalesce(p_purchase_currency, '')), ''), 'PKR')
  );
  normalized_current_currency := upper(
    coalesce(nullif(btrim(coalesce(p_current_price_currency, '')), ''), 'PKR')
  );

  if not public.is_supported_financial_currency(normalized_purchase_currency) then
    raise exception 'Unsupported investment purchase currency.';
  end if;
  if not public.is_supported_financial_currency(normalized_current_currency) then
    raise exception 'Unsupported investment current-price currency.';
  end if;

  purchase_price_pkr := public.normalized_amount_pkr(
    p_purchase_price_original,
    normalized_purchase_currency,
    p_purchase_exchange_rate_to_pkr
  );
  current_price_pkr := public.normalized_amount_pkr(
    p_current_price_original,
    normalized_current_currency,
    p_current_exchange_rate_to_pkr
  );

  saved_id := public.save_investment_purchase(
    p_investment_id,
    p_name,
    p_type,
    p_quantity,
    purchase_price_pkr,
    purchase_price_pkr,
    'PKR',
    current_price_pkr,
    current_price_pkr,
    'PKR',
    p_purchased_at,
    p_asset_id,
    p_symbol,
    p_image_url,
    p_price_source,
    'PKR',
    p_price_updated_at,
    p_price_change_24h,
    p_is_live_priced,
    p_account_id
  );

  update public.investments investment
  set purchase_price = purchase_price_pkr,
      purchase_price_original = p_purchase_price_original,
      purchase_currency = normalized_purchase_currency,
      purchase_exchange_rate = case
        when normalized_purchase_currency = 'PKR' then 1
        else p_purchase_exchange_rate_to_pkr
      end,
      current_price = current_price_pkr,
      current_price_original = p_current_price_original,
      current_price_currency = normalized_current_currency,
      price_currency = 'PKR'
  where investment.id = saved_id
    and investment.user_id = auth.uid();

  if not found then
    raise exception 'Investment could not be saved.';
  end if;

  purchase_total_original := p_quantity * p_purchase_price_original;

  update public.transactions transaction
  set amount = p_quantity * purchase_price_pkr,
      amount_original = purchase_total_original,
      currency = normalized_purchase_currency,
      exchange_rate_to_pkr = case
        when normalized_purchase_currency = 'PKR' then 1
        else p_purchase_exchange_rate_to_pkr
      end
  where transaction.investment_id = saved_id
    and transaction.user_id = auth.uid()
    and transaction.deleted_at is null;

  if not found then
    raise exception 'Linked investment transaction could not be saved.';
  end if;

  return saved_id;
end;
$$;

revoke all on function public.save_investment_purchase_currency(
  uuid, text, text, numeric, numeric, text, numeric, numeric, text, numeric,
  date, text, text, text, text, timestamptz, numeric, boolean, uuid
) from public, anon;
grant execute on function public.save_investment_purchase_currency(
  uuid, text, text, numeric, numeric, text, numeric, numeric, text, numeric,
  date, text, text, text, text, timestamptz, numeric, boolean, uuid
) to authenticated, service_role;
