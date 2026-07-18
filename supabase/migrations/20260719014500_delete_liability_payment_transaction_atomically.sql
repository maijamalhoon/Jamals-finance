begin;

create or replace function public.delete_liability_payment_transaction(
  p_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  payment_row public.liability_payments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this payable payment.';
  end if;

  select payment.*
    into payment_row
  from public.liability_payments payment
  where payment.transaction_id = p_transaction_id
    and payment.user_id = current_user_id
  for update;

  if payment_row.id is null then
    raise exception 'Payable payment not found.';
  end if;

  if not exists (
    select 1
    from public.transactions transaction_row
    where transaction_row.id = p_transaction_id
      and transaction_row.user_id = current_user_id
  ) then
    raise exception 'Linked transaction not found.';
  end if;

  delete from public.liability_payments
  where id = payment_row.id
    and user_id = current_user_id;

  delete from public.transactions
  where id = p_transaction_id
    and user_id = current_user_id;

  return payment_row.liability_id;
end;
$$;

revoke execute on function public.delete_liability_payment_transaction(uuid)
  from public, anon;
grant execute on function public.delete_liability_payment_transaction(uuid)
  to authenticated;

commit;
