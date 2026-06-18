with duplicate_deltas as (
  select
    account_id,
    user_id,
    sum(public.transaction_balance_delta(type, amount)) as delta
  from public.transactions
  where account_id is not null
    and created_at >= timestamp with time zone '2026-06-18 00:53:32+00'
  group by account_id, user_id
)
update public.accounts a
set balance = coalesce(a.balance, 0) - duplicate_deltas.delta
from duplicate_deltas
where a.id = duplicate_deltas.account_id
  and a.user_id = duplicate_deltas.user_id;

drop trigger if exists trg_sync_account_balance on public.transactions;
drop function if exists public.sync_account_balance();
