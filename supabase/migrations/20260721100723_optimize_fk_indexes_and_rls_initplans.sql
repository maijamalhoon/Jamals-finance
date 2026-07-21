-- Production-safe performance pass.
-- Adds covering indexes for ownership-aware foreign keys and prevents
-- per-row auth/current_setting evaluation in the remaining RLS policies.
-- No financial data, formulas, UI behavior, or ownership rules are changed.

create index if not exists account_transfers_from_account_owner_idx
  on public.account_transfers (from_account_id, user_id);
create index if not exists account_transfers_to_account_owner_idx
  on public.account_transfers (to_account_id, user_id);

create index if not exists goal_contributions_account_owner_idx
  on public.goal_contributions (account_id, user_id)
  where account_id is not null;
create index if not exists goal_contributions_goal_owner_idx
  on public.goal_contributions (goal_id, user_id);

create index if not exists goals_account_owner_idx
  on public.goals (account_id, user_id)
  where account_id is not null;

create index if not exists investment_withdrawals_destination_account_owner_idx
  on public.investment_withdrawals (destination_account_id, user_id)
  where destination_account_id is not null;
create index if not exists investment_withdrawals_source_account_owner_idx
  on public.investment_withdrawals (source_account_id, user_id)
  where source_account_id is not null;
create index if not exists investment_withdrawals_source_transaction_owner_idx
  on public.investment_withdrawals (source_transaction_id, user_id)
  where source_transaction_id is not null;
create index if not exists investment_withdrawals_pnl_transaction_owner_idx
  on public.investment_withdrawals (pnl_transaction_id, user_id)
  where pnl_transaction_id is not null;
create index if not exists investment_withdrawals_transfer_owner_idx
  on public.investment_withdrawals (account_transfer_id, user_id)
  where account_transfer_id is not null;

create index if not exists liabilities_account_owner_idx
  on public.liabilities (account_id, user_id)
  where account_id is not null;

create index if not exists liability_payments_account_owner_idx
  on public.liability_payments (account_id, user_id)
  where account_id is not null;
create index if not exists liability_payments_transaction_owner_idx
  on public.liability_payments (transaction_id, user_id)
  where transaction_id is not null;

create index if not exists transactions_account_owner_idx
  on public.transactions (account_id, user_id)
  where account_id is not null;
create index if not exists transactions_goal_contribution_owner_idx
  on public.transactions (goal_contribution_id, user_id)
  where goal_contribution_id is not null;
create index if not exists transactions_investment_owner_idx
  on public.transactions (investment_id, user_id)
  where investment_id is not null;

alter policy transactions_active_rows_only
  on public.transactions
  using (
    deleted_at is null
    or (
      (select current_setting('request.method', true)) = 'PATCH'
      and (select auth.uid()) = user_id
    )
  );

alter policy account_transfers_active_rows_only
  on public.account_transfers
  using (
    deleted_at is null
    or (
      (select current_setting('request.method', true)) = 'PATCH'
      and (select auth.uid()) = user_id
    )
  );

alter policy liabilities_owner_insert
  on public.liabilities
  with check (
    (select auth.uid()) = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = liabilities.account_id
          and account.user_id = (select auth.uid())
      )
    )
  );

alter policy liabilities_owner_update
  on public.liabilities
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = liabilities.account_id
          and account.user_id = (select auth.uid())
      )
    )
  );
