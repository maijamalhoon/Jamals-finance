create or replace function public.transaction_balance_delta(
  tx_type text,
  tx_amount numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when tx_type = 'income' then coalesce(tx_amount, 0)
    when tx_type = 'expense' then -coalesce(tx_amount, 0)
    else 0
  end;
$$;

create or replace function public.sync_account_balance_from_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0) + public.transaction_balance_delta(new.type, new.amount)
      where id = new.account_id
        and user_id = new.user_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0) - public.transaction_balance_delta(old.type, old.amount)
      where id = old.account_id
        and user_id = old.user_id;
    end if;

    if new.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0) + public.transaction_balance_delta(new.type, new.amount)
      where id = new.account_id
        and user_id = new.user_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0) - public.transaction_balance_delta(old.type, old.amount)
      where id = old.account_id
        and user_id = old.user_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

with account_deltas as (
  select
    account_id,
    user_id,
    sum(public.transaction_balance_delta(type, amount)) as delta
  from public.transactions
  where account_id is not null
  group by account_id, user_id
)
update public.accounts a
set balance = coalesce(a.balance, 0) + account_deltas.delta
from account_deltas
where a.id = account_deltas.account_id
  and a.user_id = account_deltas.user_id;

drop trigger if exists sync_account_balance_after_transaction_change on public.transactions;

create trigger sync_account_balance_after_transaction_change
after insert or update or delete on public.transactions
for each row
execute function public.sync_account_balance_from_transaction();
