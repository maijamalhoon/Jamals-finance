create or replace function public.transaction_balance_delta(
  tx_type text,
  tx_amount numeric
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when tx_type = 'income' then coalesce(tx_amount, 0)
    when tx_type = 'expense' then -coalesce(tx_amount, 0)
    else 0
  end;
$$;

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists categories_parent_id_idx on public.categories(parent_id);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists investments_user_id_idx on public.investments(user_id);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists liability_payments_account_id_idx on public.liability_payments(account_id);
create index if not exists liability_payments_liability_owner_idx on public.liability_payments(liability_id, user_id);
create index if not exists liability_payments_transaction_id_idx on public.liability_payments(transaction_id);

grant select on public.exchange_rates to authenticated;

drop policy if exists exchange_rates_read_authenticated on public.exchange_rates;
create policy exchange_rates_read_authenticated
  on public.exchange_rates for select
  to authenticated
  using (true);

drop policy if exists owner_only on public.accounts;
create policy owner_only
  on public.accounts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.categories;
create policy owner_only
  on public.categories for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.transactions;
create policy owner_only
  on public.transactions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.investments;
create policy owner_only
  on public.investments for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.goals;
create policy owner_only
  on public.goals for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists liabilities_owner_select on public.liabilities;
drop policy if exists liabilities_owner_insert on public.liabilities;
drop policy if exists liabilities_owner_update on public.liabilities;
drop policy if exists liabilities_owner_delete on public.liabilities;

create policy liabilities_owner_select
  on public.liabilities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy liabilities_owner_insert
  on public.liabilities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy liabilities_owner_update
  on public.liabilities for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy liabilities_owner_delete
  on public.liabilities for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists liability_payments_owner_select on public.liability_payments;
drop policy if exists liability_payments_owner_insert on public.liability_payments;
drop policy if exists liability_payments_owner_update on public.liability_payments;
drop policy if exists liability_payments_owner_delete on public.liability_payments;

create policy liability_payments_owner_select
  on public.liability_payments for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy liability_payments_owner_insert
  on public.liability_payments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.liabilities l
      where l.id = liability_id
        and l.user_id = (select auth.uid())
    )
  );

create policy liability_payments_owner_update
  on public.liability_payments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.liabilities l
      where l.id = liability_id
        and l.user_id = (select auth.uid())
    )
  );

create policy liability_payments_owner_delete
  on public.liability_payments for delete
  to authenticated
  using ((select auth.uid()) = user_id);
