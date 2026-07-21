create or replace function public.record_goal_contribution_currency(
  p_goal_id uuid,
  p_account_id uuid,
  p_amount_original numeric,
  p_currency text,
  p_exchange_rate_to_pkr numeric,
  p_contributed_at date,
  p_note text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  canonical_amount numeric;
  contribution_id uuid;
begin
  canonical_amount := public.normalized_amount_pkr(
    p_amount_original,
    p_currency,
    p_exchange_rate_to_pkr
  );

  contribution_id := private.record_goal_contribution_impl(
    p_goal_id,
    p_account_id,
    canonical_amount,
    p_contributed_at,
    p_note
  );

  update public.goal_contributions contribution
  set amount = canonical_amount,
      amount_original = p_amount_original,
      currency = upper(p_currency),
      exchange_rate_to_pkr = p_exchange_rate_to_pkr
  where contribution.id = contribution_id
    and contribution.user_id = auth.uid();

  update public.transactions transaction
  set amount = canonical_amount,
      amount_original = p_amount_original,
      currency = upper(p_currency),
      exchange_rate_to_pkr = p_exchange_rate_to_pkr
  where transaction.goal_contribution_id = contribution_id
    and transaction.user_id = auth.uid();

  return contribution_id;
end;
$$;

revoke all on function public.record_goal_contribution_currency(uuid, uuid, numeric, text, numeric, date, text) from public, anon;
grant execute on function public.record_goal_contribution_currency(uuid, uuid, numeric, text, numeric, date, text) to authenticated;

create or replace function public.record_liability_payment_currency(
  p_liability_id uuid,
  p_account_id uuid,
  p_amount_original numeric,
  p_currency text,
  p_exchange_rate_to_pkr numeric,
  p_paid_at date,
  p_note text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  canonical_amount numeric;
  payment_id uuid;
  linked_transaction_id uuid;
begin
  canonical_amount := public.normalized_amount_pkr(
    p_amount_original,
    p_currency,
    p_exchange_rate_to_pkr
  );

  payment_id := public.record_liability_payment(
    p_liability_id,
    p_account_id,
    canonical_amount,
    p_paid_at,
    p_note
  );

  update public.liability_payments payment
  set amount = canonical_amount,
      amount_original = p_amount_original,
      currency = upper(p_currency),
      exchange_rate_to_pkr = p_exchange_rate_to_pkr
  where payment.id = payment_id
    and payment.user_id = auth.uid()
  returning payment.transaction_id into linked_transaction_id;

  update public.transactions transaction
  set amount = canonical_amount,
      amount_original = p_amount_original,
      currency = upper(p_currency),
      exchange_rate_to_pkr = p_exchange_rate_to_pkr
  where transaction.id = linked_transaction_id
    and transaction.user_id = auth.uid();

  return payment_id;
end;
$$;

revoke all on function public.record_liability_payment_currency(uuid, uuid, numeric, text, numeric, date, text) from public, anon;
grant execute on function public.record_liability_payment_currency(uuid, uuid, numeric, text, numeric, date, text) to authenticated;

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
set search_path = public
as $$
declare
  purchase_price_pkr numeric;
  current_price_pkr numeric;
  saved_id uuid;
  purchase_total_original numeric;
begin
  purchase_price_pkr := public.normalized_amount_pkr(
    p_purchase_price_original,
    p_purchase_currency,
    p_purchase_exchange_rate_to_pkr
  );
  current_price_pkr := public.normalized_amount_pkr(
    p_current_price_original,
    p_current_price_currency,
    p_current_exchange_rate_to_pkr
  );

  saved_id := public.save_investment_purchase(
    p_investment_id,
    p_name,
    p_type,
    p_quantity,
    purchase_price_pkr,
    p_purchase_price_original,
    'PKR',
    current_price_pkr,
    p_current_price_original,
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
      purchase_currency = upper(p_purchase_currency),
      purchase_exchange_rate = p_purchase_exchange_rate_to_pkr,
      current_price = current_price_pkr,
      current_price_original = p_current_price_original,
      current_price_currency = upper(p_current_price_currency),
      price_currency = 'PKR'
  where investment.id = saved_id
    and investment.user_id = auth.uid();

  purchase_total_original := p_quantity * p_purchase_price_original;

  update public.transactions transaction
  set amount = p_quantity * purchase_price_pkr,
      amount_original = purchase_total_original,
      currency = upper(p_purchase_currency),
      exchange_rate_to_pkr = p_purchase_exchange_rate_to_pkr
  where transaction.investment_id = saved_id
    and transaction.user_id = auth.uid()
    and transaction.deleted_at is null;

  return saved_id;
end;
$$;

revoke all on function public.save_investment_purchase_currency(uuid, text, text, numeric, numeric, text, numeric, numeric, text, numeric, date, text, text, text, text, timestamptz, numeric, boolean, uuid) from public, anon;
grant execute on function public.save_investment_purchase_currency(uuid, text, text, numeric, numeric, text, numeric, numeric, text, numeric, date, text, text, text, text, timestamptz, numeric, boolean, uuid) to authenticated;

-- The production migration also replaces private.withdraw_investment_impl so
-- every supported ISO currency uses its locked PKR-per-unit exchange rate while
-- principal, proceeds, and realized P/L remain canonical PKR ledger values.
