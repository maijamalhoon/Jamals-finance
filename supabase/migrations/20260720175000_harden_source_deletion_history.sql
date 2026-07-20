begin;

-- Source-module deletes must be able to archive their linked ledger rows even
-- when normal RLS intentionally hides rows after deleted_at is set.
create or replace function private.archive_linked_transactions_before_source_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_table_name = 'investments' then
    update public.transactions transaction
    set
      deleted_at = coalesce(transaction.deleted_at, now()),
      investment_id = null
    where transaction.investment_id = old.id
      and transaction.user_id = old.user_id;
  elsif tg_table_name = 'goals' then
    update public.transactions transaction
    set
      deleted_at = coalesce(transaction.deleted_at, now()),
      goal_contribution_id = null
    from public.goal_contributions contribution
    where contribution.goal_id = old.id
      and contribution.user_id = old.user_id
      and transaction.goal_contribution_id = contribution.id
      and transaction.user_id = old.user_id;
  elsif tg_table_name = 'liabilities' then
    update public.transactions refund
    set deleted_at = coalesce(refund.deleted_at, now())
    from public.liability_payments payment
    where payment.liability_id = old.id
      and payment.user_id = old.user_id
      and refund.refund_of_transaction_id = payment.transaction_id
      and refund.user_id = old.user_id;

    update public.transactions transaction
    set deleted_at = coalesce(transaction.deleted_at, now())
    from public.liability_payments payment
    where payment.liability_id = old.id
      and payment.user_id = old.user_id
      and transaction.id = payment.transaction_id
      and transaction.user_id = old.user_id;
  else
    raise exception 'Unsupported transaction source table.';
  end if;

  return old;
end;
$$;

revoke all on function private.archive_linked_transactions_before_source_delete()
  from public, anon, authenticated;

-- Keep historical ledger rows detached instead of physically cascading them.
alter table public.transactions
  drop constraint if exists transactions_investment_id_fkey;
alter table public.transactions
  add constraint transactions_investment_id_fkey
  foreign key (investment_id) references public.investments(id) on delete set null;

alter table public.transactions
  drop constraint if exists transactions_goal_contribution_id_fkey;
alter table public.transactions
  add constraint transactions_goal_contribution_id_fkey
  foreign key (goal_contribution_id) references public.goal_contributions(id) on delete set null;

-- Stable, owner-checked delete contract for the Investments UI.
create or replace function public.delete_investment(p_investment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this investment.';
  end if;

  delete from public.investments investment
  where investment.id = p_investment_id
    and investment.user_id = current_user_id
  returning investment.id into deleted_id;

  if deleted_id is null then
    raise exception 'Investment not found.';
  end if;

  return deleted_id;
end;
$$;

revoke all on function public.delete_investment(uuid) from public, anon;
grant execute on function public.delete_investment(uuid) to authenticated;

-- These RPCs also archive transactions, so run them with the same protected
-- owner-checked definer context rather than through active-only RLS.
alter function public.delete_goal_contribution(uuid) security definer;
alter function public.delete_goal_contribution(uuid) set search_path = pg_catalog;
revoke all on function public.delete_goal_contribution(uuid) from public, anon;
grant execute on function public.delete_goal_contribution(uuid) to authenticated;

alter function public.delete_liability_payment_transaction(uuid) security definer;
alter function public.delete_liability_payment_transaction(uuid) set search_path = pg_catalog;
revoke all on function public.delete_liability_payment_transaction(uuid) from public, anon;
grant execute on function public.delete_liability_payment_transaction(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
