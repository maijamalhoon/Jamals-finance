begin;

create or replace function public.record_liability_payment(
  p_liability_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_paid_at date,
  p_note text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  liability_row public.liabilities%rowtype;
  debt_category_id uuid;
  saved_transaction_id uuid;
  saved_payment_id uuid;
  remaining_before_payment numeric;
  transaction_note text;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before recording this payment.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  if p_paid_at is null then
    raise exception 'Payment date is required.';
  end if;

  select liability.*
    into liability_row
  from public.liabilities liability
  where liability.id = p_liability_id
    and liability.user_id = current_user_id
  for update;

  if liability_row.id is null then
    raise exception 'Payable not found.';
  end if;

  if not exists (
    select 1
    from public.accounts account
    where account.id = p_account_id
      and account.user_id = current_user_id
  ) then
    raise exception 'Choose one of your accounts for this payment.';
  end if;

  remaining_before_payment = greatest(
    liability_row.original_value - liability_row.paid_amount,
    0
  );

  if p_amount > remaining_before_payment then
    raise exception 'Payment cannot be greater than the remaining payable amount.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(current_user_id::text || ':debt-repayment-category')
  );

  select category.id
    into debt_category_id
  from public.categories category
  where category.user_id = current_user_id
    and category.type = 'expense'
    and lower(category.name) = 'debt repayment'
    and category.parent_id is null
  order by category.created_at, category.id
  limit 1;

  if debt_category_id is null then
    insert into public.categories(user_id, name, type, color)
    values (current_user_id, 'Debt repayment', 'expense', '#ef4444')
    returning id into debt_category_id;
  end if;

  transaction_note = coalesce(
    nullif(btrim(coalesce(p_note, '')), ''),
    'Payment returned to ' || liability_row.person_name || ' for ' || liability_row.reason
  );

  insert into public.transactions(
    user_id,
    type,
    amount,
    category_id,
    account_id,
    date,
    note,
    person_name,
    item_name
  )
  values (
    current_user_id,
    'expense',
    p_amount,
    debt_category_id,
    p_account_id,
    p_paid_at,
    transaction_note,
    liability_row.person_name,
    liability_row.item_name
  )
  returning id into saved_transaction_id;

  insert into public.liability_payments(
    liability_id,
    user_id,
    account_id,
    transaction_id,
    amount,
    paid_at,
    note
  )
  values (
    liability_row.id,
    current_user_id,
    p_account_id,
    saved_transaction_id,
    p_amount,
    p_paid_at,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into saved_payment_id;

  return saved_payment_id;
end;
$$;

revoke execute on function public.record_liability_payment(
  uuid,
  uuid,
  numeric,
  date,
  text
) from public, anon;

grant execute on function public.record_liability_payment(
  uuid,
  uuid,
  numeric,
  date,
  text
) to authenticated;

commit;
