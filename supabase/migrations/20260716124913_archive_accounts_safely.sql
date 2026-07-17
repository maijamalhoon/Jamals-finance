begin;

alter table public.accounts
  add column if not exists status text not null default 'active',
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_status_check'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_status_check
      check (status = any (array['active'::text, 'archived'::text]));
  end if;
end
$$;

create index if not exists accounts_user_active_name_idx
  on public.accounts(user_id, name)
  where status = 'active';

create or replace function public.set_account_archived(
  p_account_id uuid,
  p_archived boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_account_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before changing this account.';
  end if;

  select account.id
    into saved_account_id
  from public.accounts account
  where account.id = p_account_id
    and account.user_id = current_user_id
  for update;

  if saved_account_id is null then
    raise exception 'Account not found.';
  end if;

  update public.accounts
  set status = case when p_archived then 'archived' else 'active' end,
      archived_at = case when p_archived then now() else null end
  where id = saved_account_id
    and user_id = current_user_id;

  return saved_account_id;
end;
$$;

revoke execute on function public.set_account_archived(uuid, boolean)
  from public, anon;
grant execute on function public.set_account_archived(uuid, boolean)
  to authenticated;

create or replace function public.require_active_ledger_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_ids uuid[];
  account_id_to_check uuid;
begin
  if tg_table_name = 'transactions' then
    account_ids := array[new.account_id];
  elsif tg_table_name = 'account_transfers' then
    account_ids := array[new.from_account_id, new.to_account_id];
  elsif tg_table_name = 'goals' then
    if tg_op = 'UPDATE' and new.account_id is not distinct from old.account_id then
      return new;
    end if;
    account_ids := array[new.account_id];
  elsif tg_table_name = 'goal_contributions' then
    account_ids := array[new.account_id];
  else
    raise exception 'Unsupported account ledger table.';
  end if;

  foreach account_id_to_check in array account_ids loop
    if account_id_to_check is not null and not exists (
      select 1
      from public.accounts account
      where account.id = account_id_to_check
        and account.user_id = new.user_id
        and account.status = 'active'
    ) then
      raise exception 'Choose an active account.';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.require_active_ledger_account()
  from public, anon, authenticated;

drop trigger if exists transactions_require_active_account on public.transactions;
create trigger transactions_require_active_account
before insert or update on public.transactions
for each row execute function public.require_active_ledger_account();

drop trigger if exists transfers_require_active_accounts on public.account_transfers;
create trigger transfers_require_active_accounts
before insert or update on public.account_transfers
for each row execute function public.require_active_ledger_account();

drop trigger if exists goals_require_active_account on public.goals;
create trigger goals_require_active_account
before insert or update on public.goals
for each row execute function public.require_active_ledger_account();

drop trigger if exists goal_contributions_require_active_account on public.goal_contributions;
create trigger goal_contributions_require_active_account
before insert or update on public.goal_contributions
for each row execute function public.require_active_ledger_account();

create or replace function public.protect_account_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.transactions transaction where transaction.account_id = old.id
  ) or exists (
    select 1 from public.account_transfers transfer
    where transfer.from_account_id = old.id or transfer.to_account_id = old.id
  ) or exists (
    select 1 from public.goals goal where goal.account_id = old.id
  ) or exists (
    select 1 from public.goal_contributions contribution where contribution.account_id = old.id
  ) then
    raise exception 'Archive this account to preserve its financial history.';
  end if;

  return old;
end;
$$;

revoke execute on function public.protect_account_history()
  from public, anon, authenticated;

drop trigger if exists accounts_protect_history on public.accounts;
create trigger accounts_protect_history
before delete on public.accounts
for each row execute function public.protect_account_history();

commit;
