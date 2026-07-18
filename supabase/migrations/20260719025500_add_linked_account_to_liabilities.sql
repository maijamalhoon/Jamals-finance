alter table public.liabilities
  add column if not exists account_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'liabilities_account_id_fkey'
      and conrelid = 'public.liabilities'::regclass
  ) then
    alter table public.liabilities
      add constraint liabilities_account_id_fkey
      foreign key (account_id)
      references public.accounts(id)
      on delete set null;
  end if;
end
$$;

create index if not exists liabilities_user_account_idx
  on public.liabilities(user_id, account_id)
  where account_id is not null;

drop policy if exists liabilities_owner_insert on public.liabilities;
create policy liabilities_owner_insert
  on public.liabilities for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = account_id
          and account.user_id = auth.uid()
      )
    )
  );

drop policy if exists liabilities_owner_update on public.liabilities;
create policy liabilities_owner_update
  on public.liabilities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = account_id
          and account.user_id = auth.uid()
      )
    )
  );
