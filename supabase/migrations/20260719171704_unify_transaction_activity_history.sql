alter table public.transactions
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table public.account_transfers
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table public.transactions disable trigger user;
update public.transactions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
alter table public.transactions enable trigger user;

alter table public.account_transfers disable trigger user;
update public.account_transfers
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
alter table public.account_transfers enable trigger user;

alter table public.transactions
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.account_transfers
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_transactions_updated_at on public.transactions;
create trigger touch_transactions_updated_at
before update on public.transactions
for each row execute function public.touch_updated_at();

drop trigger if exists touch_account_transfers_updated_at on public.account_transfers;
create trigger touch_account_transfers_updated_at
before update on public.account_transfers
for each row execute function public.touch_updated_at();

create index if not exists transactions_user_activity_idx
  on public.transactions(user_id, updated_at desc, created_at desc, id desc);

create index if not exists transactions_user_active_activity_idx
  on public.transactions(user_id, updated_at desc, created_at desc, id desc)
  where deleted_at is null;

create index if not exists account_transfers_user_activity_idx
  on public.account_transfers(user_id, updated_at desc, created_at desc, id desc);

create index if not exists account_transfers_user_active_activity_idx
  on public.account_transfers(user_id, updated_at desc, created_at desc, id desc)
  where deleted_at is null;

create or replace function public.sync_account_balance_from_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null and new.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0)
        + public.transaction_balance_delta(new.type, new.amount)
      where id = new.account_id
        and user_id = new.user_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform 1
    from public.accounts account
    where account.id in (old.account_id, new.account_id)
      and account.user_id in (old.user_id, new.user_id)
    order by account.id
    for update;

    if old.deleted_at is null and old.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0)
        - public.transaction_balance_delta(old.type, old.amount)
      where id = old.account_id
        and user_id = old.user_id;
    end if;

    if new.deleted_at is null and new.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0)
        + public.transaction_balance_delta(new.type, new.amount)
      where id = new.account_id
        and user_id = new.user_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.deleted_at is null and old.account_id is not null then
      update public.accounts
      set balance = coalesce(balance, 0)
        - public.transaction_balance_delta(old.type, old.amount)
      where id = old.account_id
        and user_id = old.user_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.apply_account_transfer_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if new.user_id is distinct from (select auth.uid()) then
      raise exception 'Transfer user does not match the authenticated user.';
    end if;

    if not exists (
      select 1 from public.accounts account
      where account.id = new.from_account_id and account.user_id = new.user_id
    ) then
      raise exception 'Source account does not belong to the transfer owner.';
    end if;

    if not exists (
      select 1 from public.accounts account
      where account.id = new.to_account_id and account.user_id = new.user_id
    ) then
      raise exception 'Destination account does not belong to the transfer owner.';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    if not exists (
      select 1 from public.accounts account
      where account.id = old.from_account_id and account.user_id = old.user_id
    ) then
      raise exception 'Existing source account does not belong to the transfer owner.';
    end if;

    if not exists (
      select 1 from public.accounts account
      where account.id = old.to_account_id and account.user_id = old.user_id
    ) then
      raise exception 'Existing destination account does not belong to the transfer owner.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    perform 1 from public.accounts account
    where account.id in (new.from_account_id, new.to_account_id)
      and account.user_id = new.user_id
    order by account.id for update;
  elsif tg_op = 'UPDATE' then
    perform 1 from public.accounts account
    where account.id in (
      old.from_account_id, old.to_account_id,
      new.from_account_id, new.to_account_id
    )
      and account.user_id in (old.user_id, new.user_id)
    order by account.id for update;
  elsif tg_op = 'DELETE' then
    perform 1 from public.accounts account
    where account.id in (old.from_account_id, old.to_account_id)
      and account.user_id = old.user_id
    order by account.id for update;
  end if;

  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      update public.accounts
      set balance = balance - new.amount
      where id = new.from_account_id and user_id = new.user_id;

      update public.accounts
      set balance = balance + new.amount
      where id = new.to_account_id and user_id = new.user_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null then
      update public.accounts
      set balance = balance + old.amount
      where id = old.from_account_id and user_id = old.user_id;

      update public.accounts
      set balance = balance - old.amount
      where id = old.to_account_id and user_id = old.user_id;
    end if;

    if new.deleted_at is null then
      update public.accounts
      set balance = balance - new.amount
      where id = new.from_account_id and user_id = new.user_id;

      update public.accounts
      set balance = balance + new.amount
      where id = new.to_account_id and user_id = new.user_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      update public.accounts
      set balance = balance + old.amount
      where id = old.from_account_id and user_id = old.user_id;

      update public.accounts
      set balance = balance - old.amount
      where id = old.to_account_id and user_id = old.user_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

create schema if not exists private;

create or replace function private.archive_linked_transactions_before_source_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_table_name = 'investments' then
    update public.transactions transaction
    set deleted_at = coalesce(transaction.deleted_at, now())
    where transaction.investment_id = old.id
      and transaction.user_id = old.user_id;
  elsif tg_table_name = 'goals' then
    update public.transactions transaction
    set deleted_at = coalesce(transaction.deleted_at, now())
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

drop trigger if exists investments_archive_transaction_history on public.investments;
create trigger investments_archive_transaction_history
before delete on public.investments
for each row execute function private.archive_linked_transactions_before_source_delete();

drop trigger if exists goals_archive_transaction_history on public.goals;
create trigger goals_archive_transaction_history
before delete on public.goals
for each row execute function private.archive_linked_transactions_before_source_delete();

drop trigger if exists liabilities_archive_transaction_history on public.liabilities;
create trigger liabilities_archive_transaction_history
before delete on public.liabilities
for each row execute function private.archive_linked_transactions_before_source_delete();

create or replace function public.delete_goal_contribution(p_contribution_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  contribution_row public.goal_contributions%rowtype;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this contribution.';
  end if;

  select contribution.* into contribution_row
  from public.goal_contributions contribution
  where contribution.id = p_contribution_id
    and contribution.user_id = current_user_id
  for update;

  if contribution_row.id is null then
    raise exception 'Contribution not found.';
  end if;

  perform 1 from public.goals goal
  where goal.id = contribution_row.goal_id
    and goal.user_id = current_user_id
  for update;

  update public.transactions
  set deleted_at = coalesce(deleted_at, now())
  where goal_contribution_id = contribution_row.id
    and user_id = current_user_id;

  delete from public.goal_contributions
  where id = contribution_row.id
    and user_id = current_user_id;

  update public.goals
  set current_amount = greatest(current_amount - contribution_row.amount, 0)
  where id = contribution_row.goal_id
    and user_id = current_user_id;

  return contribution_row.goal_id;
end;
$$;

create or replace function public.delete_liability_payment_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  payment_row public.liability_payments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this payable payment.';
  end if;

  select payment.* into payment_row
  from public.liability_payments payment
  where payment.transaction_id = p_transaction_id
    and payment.user_id = current_user_id
  for update;

  if payment_row.id is null then
    raise exception 'Payable payment not found.';
  end if;

  if not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.id = p_transaction_id
      and transaction_row.user_id = current_user_id
  ) then
    raise exception 'Linked transaction not found.';
  end if;

  update public.transactions refund
  set deleted_at = coalesce(refund.deleted_at, now())
  where refund.refund_of_transaction_id = p_transaction_id
    and refund.user_id = current_user_id;

  update public.transactions
  set deleted_at = coalesce(deleted_at, now())
  where id = p_transaction_id
    and user_id = current_user_id;

  delete from public.liability_payments
  where id = payment_row.id
    and user_id = current_user_id;

  return payment_row.liability_id;
end;
$$;

revoke all on function private.archive_linked_transactions_before_source_delete() from public;
revoke all on function private.archive_linked_transactions_before_source_delete() from anon;
revoke all on function private.archive_linked_transactions_before_source_delete() from authenticated;

grant execute on function public.delete_goal_contribution(uuid) to authenticated;
grant execute on function public.delete_liability_payment_transaction(uuid) to authenticated;
