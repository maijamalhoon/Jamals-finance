-- Keep deleted ledger rows hidden from normal finance reads while allowing the
-- currently deployed PATCH-based soft delete to complete successfully.
-- Dedicated RPCs below are the long-term atomic delete path.

create or replace function public.soft_delete_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
  affected_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this transaction.';
  end if;

  update public.transactions transaction
  set deleted_at = now()
  where transaction.id = p_transaction_id
    and transaction.user_id = current_user_id
    and transaction.deleted_at is null
  returning transaction.id into affected_id;

  if affected_id is not null then
    return affected_id;
  end if;

  if exists (
    select 1
    from public.transactions transaction
    where transaction.id = p_transaction_id
      and transaction.user_id = current_user_id
      and transaction.deleted_at is not null
  ) then
    return p_transaction_id;
  end if;

  raise exception 'Transaction not found.';
end;
$$;

create or replace function public.soft_delete_account_transfer(p_transfer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
  affected_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this transfer.';
  end if;

  update public.account_transfers transfer
  set deleted_at = now()
  where transfer.id = p_transfer_id
    and transfer.user_id = current_user_id
    and transfer.deleted_at is null
  returning transfer.id into affected_id;

  if affected_id is not null then
    return affected_id;
  end if;

  if exists (
    select 1
    from public.account_transfers transfer
    where transfer.id = p_transfer_id
      and transfer.user_id = current_user_id
      and transfer.deleted_at is not null
  ) then
    return p_transfer_id;
  end if;

  raise exception 'Transfer not found.';
end;
$$;

revoke all on function public.soft_delete_transaction(uuid) from public, anon;
revoke all on function public.soft_delete_account_transfer(uuid) from public, anon;
grant execute on function public.soft_delete_transaction(uuid) to authenticated;
grant execute on function public.soft_delete_account_transfer(uuid) to authenticated;

-- GET and HEAD remain active-only. PATCH may see the row it just archived so
-- PostgREST can finish the update response instead of rejecting it with 403.
drop policy if exists transactions_active_rows_only on public.transactions;
create policy transactions_active_rows_only
  on public.transactions
  as restrictive
  for select
  to authenticated
  using (
    deleted_at is null
    or (
      current_setting('request.method', true) = 'PATCH'
      and (select auth.uid()) = user_id
    )
  );

drop policy if exists account_transfers_active_rows_only on public.account_transfers;
create policy account_transfers_active_rows_only
  on public.account_transfers
  as restrictive
  for select
  to authenticated
  using (
    deleted_at is null
    or (
      current_setting('request.method', true) = 'PATCH'
      and (select auth.uid()) = user_id
    )
  );

-- Archived rows cannot be edited or restored through direct table updates.
drop policy if exists transactions_only_active_rows_can_update on public.transactions;
create policy transactions_only_active_rows_can_update
  on public.transactions
  as restrictive
  for update
  to authenticated
  using (deleted_at is null)
  with check (true);

drop policy if exists account_transfers_only_active_rows_can_update on public.account_transfers;
create policy account_transfers_only_active_rows_can_update
  on public.account_transfers
  as restrictive
  for update
  to authenticated
  using (deleted_at is null)
  with check (true);

notify pgrst, 'reload schema';