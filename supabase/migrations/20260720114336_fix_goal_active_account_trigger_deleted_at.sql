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
    if new.deleted_at is not null then
      return new;
    end if;
    account_ids := array[new.account_id];
  elsif tg_table_name = 'account_transfers' then
    if new.deleted_at is not null then
      return new;
    end if;
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
