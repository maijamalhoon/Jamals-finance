-- Deleted ledger rows stay available in transaction history, but they must never
-- participate in live balances, analytics, reports, exports, or AI calculations.

create or replace function public.load_ledger_history(
  p_type text default null,
  p_from date default null,
  p_to date default null,
  p_category uuid default null,
  p_account uuid default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null
)
returns table (
  id uuid,
  date date,
  type text,
  amount numeric,
  note text,
  reference text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  source_name text,
  person_name text,
  item_name text,
  goal_contribution_id uuid,
  categories jsonb,
  accounts jsonb,
  from_account_id uuid,
  to_account_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    transaction.id,
    transaction.date,
    transaction.type,
    transaction.amount,
    transaction.note,
    transaction.reference,
    transaction.created_at,
    transaction.updated_at,
    transaction.deleted_at,
    transaction.source_name,
    transaction.person_name,
    transaction.item_name,
    transaction.goal_contribution_id,
    case
      when category.id is null then null
      else jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'color', category.color,
        'icon_key', category.icon_key,
        'type', category.type,
        'parent_id', category.parent_id
      )
    end as categories,
    case
      when account.id is null then null
      else jsonb_build_object('name', account.name)
    end as accounts,
    null::uuid as from_account_id,
    null::uuid as to_account_id
  from public.transactions transaction
  left join public.categories category
    on category.id = transaction.category_id
    and category.user_id = transaction.user_id
  left join public.accounts account
    on account.id = transaction.account_id
    and account.user_id = transaction.user_id
  where auth.uid() is not null
    and transaction.user_id = auth.uid()
    and (p_type is null or transaction.type = p_type)
    and (p_from is null or transaction.date >= p_from)
    and (p_to is null or transaction.date <= p_to)
    and (p_category is null or transaction.category_id = p_category)
    and (p_account is null or transaction.account_id = p_account)
    and (p_min_amount is null or transaction.amount >= p_min_amount)
    and (p_max_amount is null or transaction.amount <= p_max_amount)

  union all

  select
    transfer.id,
    transfer.transfer_date as date,
    'transfer'::text as type,
    transfer.amount,
    transfer.note,
    transfer.reference,
    transfer.created_at,
    transfer.updated_at,
    transfer.deleted_at,
    null::text as source_name,
    null::text as person_name,
    null::text as item_name,
    null::uuid as goal_contribution_id,
    null::jsonb as categories,
    jsonb_build_object(
      'name',
      coalesce(from_account.name, 'From account') || ' -> ' ||
      coalesce(to_account.name, 'To account')
    ) as accounts,
    transfer.from_account_id,
    transfer.to_account_id
  from public.account_transfers transfer
  left join public.accounts from_account
    on from_account.id = transfer.from_account_id
    and from_account.user_id = transfer.user_id
  left join public.accounts to_account
    on to_account.id = transfer.to_account_id
    and to_account.user_id = transfer.user_id
  where auth.uid() is not null
    and transfer.user_id = auth.uid()
    and (p_type is null or p_type = 'transfer')
    and p_category is null
    and (p_from is null or transfer.transfer_date >= p_from)
    and (p_to is null or transfer.transfer_date <= p_to)
    and (
      p_account is null
      or transfer.from_account_id = p_account
      or transfer.to_account_id = p_account
    )
    and (p_min_amount is null or transfer.amount >= p_min_amount)
    and (p_max_amount is null or transfer.amount <= p_max_amount);
$$;

revoke all on function public.load_ledger_history(
  text,
  date,
  date,
  uuid,
  uuid,
  numeric,
  numeric
) from public, anon;
grant execute on function public.load_ledger_history(
  text,
  date,
  date,
  uuid,
  uuid,
  numeric,
  numeric
) to authenticated;

-- Make active-only finance math the database default. Existing owner policies
-- still protect row ownership; these restrictive policies add deleted_at = null.
drop policy if exists transactions_active_rows_only on public.transactions;
create policy transactions_active_rows_only
  on public.transactions
  as restrictive
  for select
  to authenticated
  using (deleted_at is null);

drop policy if exists account_transfers_active_rows_only on public.account_transfers;
create policy account_transfers_active_rows_only
  on public.account_transfers
  as restrictive
  for select
  to authenticated
  using (deleted_at is null);
