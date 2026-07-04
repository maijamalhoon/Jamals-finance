create or replace function public.account_transfer_accounts_owned_by_user(
  transfer_user_id uuid,
  transfer_from_account_id uuid,
  transfer_to_account_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    transfer_user_id = (select auth.uid())
    and exists (
      select 1
      from public.accounts account
      where account.id = transfer_from_account_id
        and account.user_id = transfer_user_id
    )
    and exists (
      select 1
      from public.accounts account
      where account.id = transfer_to_account_id
        and account.user_id = transfer_user_id
  );
$$;

revoke execute on function public.account_transfer_accounts_owned_by_user(uuid, uuid, uuid) from public;
grant execute on function public.account_transfer_accounts_owned_by_user(uuid, uuid, uuid) to authenticated;

drop policy if exists "Users can create their account transfers" on public.account_transfers;
create policy "Users can create their account transfers"
  on public.account_transfers
  for insert
  to authenticated
  with check (
    public.account_transfer_accounts_owned_by_user(
      user_id,
      from_account_id,
      to_account_id
    )
  );

drop policy if exists "Users can update their account transfers" on public.account_transfers;
create policy "Users can update their account transfers"
  on public.account_transfers
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    public.account_transfer_accounts_owned_by_user(
      user_id,
      from_account_id,
      to_account_id
    )
  );

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
      select 1
      from public.accounts account
      where account.id = new.from_account_id
        and account.user_id = new.user_id
    ) then
      raise exception 'Source account does not belong to the transfer owner.';
    end if;

    if not exists (
      select 1
      from public.accounts account
      where account.id = new.to_account_id
        and account.user_id = new.user_id
    ) then
      raise exception 'Destination account does not belong to the transfer owner.';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    if not exists (
      select 1
      from public.accounts account
      where account.id = old.from_account_id
        and account.user_id = old.user_id
    ) then
      raise exception 'Existing source account does not belong to the transfer owner.';
    end if;

    if not exists (
      select 1
      from public.accounts account
      where account.id = old.to_account_id
        and account.user_id = old.user_id
    ) then
      raise exception 'Existing destination account does not belong to the transfer owner.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    update public.accounts
    set balance = balance - new.amount
    where id = new.from_account_id and user_id = new.user_id;

    update public.accounts
    set balance = balance + new.amount
    where id = new.to_account_id and user_id = new.user_id;

    return new;
  elsif tg_op = 'UPDATE' then
    update public.accounts
    set balance = balance + old.amount
    where id = old.from_account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance - old.amount
    where id = old.to_account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance - new.amount
    where id = new.from_account_id and user_id = new.user_id;

    update public.accounts
    set balance = balance + new.amount
    where id = new.to_account_id and user_id = new.user_id;

    return new;
  elsif tg_op = 'DELETE' then
    update public.accounts
    set balance = balance + old.amount
    where id = old.from_account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance - old.amount
    where id = old.to_account_id and user_id = old.user_id;

    return old;
  end if;

  return null;
end;
$$;
