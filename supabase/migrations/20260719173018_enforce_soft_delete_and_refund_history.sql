create or replace function private.soft_delete_user_ledger_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or old.user_id is distinct from current_user_id then
    return old;
  end if;

  if tg_table_name = 'transactions' then
    update public.transactions transaction
    set deleted_at = coalesce(transaction.deleted_at, now())
    where transaction.id = old.id
      and transaction.user_id = current_user_id;
  elsif tg_table_name = 'account_transfers' then
    update public.account_transfers transfer
    set deleted_at = coalesce(transfer.deleted_at, now())
    where transfer.id = old.id
      and transfer.user_id = current_user_id;
  else
    raise exception 'Unsupported ledger table.';
  end if;

  return null;
end;
$$;

create or replace function private.archive_linked_refunds_after_transaction_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.transactions refund
    set deleted_at = coalesce(refund.deleted_at, new.deleted_at, now())
    where refund.refund_of_transaction_id = new.id
      and refund.user_id = new.user_id
      and refund.deleted_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_soft_delete_user_delete on public.transactions;
create trigger transactions_soft_delete_user_delete
before delete on public.transactions
for each row execute function private.soft_delete_user_ledger_row();

drop trigger if exists account_transfers_soft_delete_user_delete on public.account_transfers;
create trigger account_transfers_soft_delete_user_delete
before delete on public.account_transfers
for each row execute function private.soft_delete_user_ledger_row();

drop trigger if exists transactions_archive_linked_refunds on public.transactions;
create trigger transactions_archive_linked_refunds
after update of deleted_at on public.transactions
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute function private.archive_linked_refunds_after_transaction_delete();

create or replace function private.sync_investment_transaction_from_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.quantity is null
    or new.quantity <= 0
    or new.purchase_price is null
    or new.purchase_price <= 0
  then
    return new;
  end if;

  update public.transactions transaction
  set
    type = 'investment',
    amount = new.quantity * new.purchase_price,
    date = coalesce(new.purchased_at, transaction.date),
    note = case
      when transaction.note is null
        or transaction.note like 'Investment contribution:%'
      then 'Investment contribution: ' || btrim(new.name)
      else transaction.note
    end,
    source_name = 'Investments',
    person_name = null,
    item_name = btrim(new.name)
  where transaction.investment_id = new.id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null
    and (
      transaction.account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = transaction.account_id
          and account.user_id = transaction.user_id
          and account.status = 'active'
      )
    );

  return new;
end;
$$;

revoke all on function private.soft_delete_user_ledger_row() from public, anon, authenticated;
revoke all on function private.archive_linked_refunds_after_transaction_delete() from public, anon, authenticated;
revoke all on function private.sync_investment_transaction_from_source() from public, anon, authenticated;
