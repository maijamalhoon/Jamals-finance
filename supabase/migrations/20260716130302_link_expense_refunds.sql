begin;

alter table public.transactions
  add column if not exists refund_of_transaction_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_refund_of_transaction_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_refund_of_transaction_id_fkey
      foreign key (refund_of_transaction_id)
      references public.transactions(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists transactions_refund_lookup_idx
  on public.transactions(refund_of_transaction_id, user_id)
  where refund_of_transaction_id is not null;

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
    when tx_type in ('income', 'refund') then coalesce(tx_amount, 0)
    when tx_type in ('expense', 'investment') then -coalesce(tx_amount, 0)
    else 0
  end;
$$;

create or replace function public.validate_expense_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  original_expense public.transactions%rowtype;
  already_refunded numeric;
begin
  if new.type <> 'refund' then
    if new.refund_of_transaction_id is not null then
      raise exception 'Only refunds can reference an original expense.';
    end if;
    return new;
  end if;

  if new.refund_of_transaction_id is null then
    raise exception 'Choose the original expense for this refund.';
  end if;

  if new.id = new.refund_of_transaction_id then
    raise exception 'A refund cannot reference itself.';
  end if;

  select transaction.*
    into original_expense
  from public.transactions transaction
  where transaction.id = new.refund_of_transaction_id
    and transaction.user_id = new.user_id
    and transaction.type = 'expense'
  for update;

  if original_expense.id is null then
    raise exception 'Original expense not found.';
  end if;

  if new.account_id is distinct from original_expense.account_id
    or new.category_id is distinct from original_expense.category_id then
    raise exception 'Refund account and category must match the original expense.';
  end if;

  select coalesce(sum(refund.amount), 0)
    into already_refunded
  from public.transactions refund
  where refund.refund_of_transaction_id = original_expense.id
    and refund.user_id = new.user_id
    and refund.type = 'refund'
    and refund.id is distinct from new.id;

  if already_refunded + new.amount > original_expense.amount then
    raise exception 'Refunds cannot exceed the original expense amount.';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_expense_refund()
  from public, anon, authenticated;

drop trigger if exists transactions_validate_expense_refund on public.transactions;
create trigger transactions_validate_expense_refund
before insert or update on public.transactions
for each row execute function public.validate_expense_refund();

commit;
