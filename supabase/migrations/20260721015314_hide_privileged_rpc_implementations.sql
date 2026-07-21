alter function public.delete_goal_contribution(uuid) set schema private;
alter function private.delete_goal_contribution(uuid) rename to delete_goal_contribution_impl;
alter function private.delete_goal_contribution_impl(uuid) set search_path = pg_catalog;
create or replace function public.delete_goal_contribution(p_contribution_id uuid)
returns uuid language sql security invoker set search_path = pg_catalog
as $$ select private.delete_goal_contribution_impl(p_contribution_id); $$;

alter function public.delete_investment(uuid) set schema private;
alter function private.delete_investment(uuid) rename to delete_investment_impl;
alter function private.delete_investment_impl(uuid) set search_path = pg_catalog;
create or replace function public.delete_investment(p_investment_id uuid)
returns uuid language sql security invoker set search_path = pg_catalog
as $$ select private.delete_investment_impl(p_investment_id); $$;

alter function public.delete_liability_payment_transaction(uuid) set schema private;
alter function private.delete_liability_payment_transaction(uuid) rename to delete_liability_payment_transaction_impl;
alter function private.delete_liability_payment_transaction_impl(uuid) set search_path = pg_catalog;
create or replace function public.delete_liability_payment_transaction(p_transaction_id uuid)
returns uuid language sql security invoker set search_path = pg_catalog
as $$ select private.delete_liability_payment_transaction_impl(p_transaction_id); $$;

alter function public.record_goal_contribution(uuid, uuid, numeric, date, text) set schema private;
alter function private.record_goal_contribution(uuid, uuid, numeric, date, text) rename to record_goal_contribution_impl;
alter function private.record_goal_contribution_impl(uuid, uuid, numeric, date, text) set search_path = pg_catalog;
create or replace function public.record_goal_contribution(
  p_goal_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_contributed_at date,
  p_note text
)
returns uuid language sql security invoker set search_path = pg_catalog
as $$
  select private.record_goal_contribution_impl(
    p_goal_id, p_account_id, p_amount, p_contributed_at, p_note
  );
$$;

alter function public.soft_delete_account_transfer(uuid) set schema private;
alter function private.soft_delete_account_transfer(uuid) rename to soft_delete_account_transfer_impl;
alter function private.soft_delete_account_transfer_impl(uuid) set search_path = pg_catalog;
create or replace function public.soft_delete_account_transfer(p_transfer_id uuid)
returns uuid language sql security invoker set search_path = pg_catalog
as $$ select private.soft_delete_account_transfer_impl(p_transfer_id); $$;

alter function public.soft_delete_transaction(uuid) set schema private;
alter function private.soft_delete_transaction(uuid) rename to soft_delete_transaction_impl;
alter function private.soft_delete_transaction_impl(uuid) set search_path = pg_catalog;
create or replace function public.soft_delete_transaction(p_transaction_id uuid)
returns uuid language sql security invoker set search_path = pg_catalog
as $$ select private.soft_delete_transaction_impl(p_transaction_id); $$;

alter function public.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date) set schema private;
alter function private.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date) rename to withdraw_investment_impl;
alter function private.withdraw_investment_impl(uuid, numeric, numeric, text, numeric, uuid, date) set search_path = pg_catalog;
create or replace function public.withdraw_investment(
  p_investment_id uuid,
  p_quantity numeric,
  p_withdrawal_price_original numeric,
  p_withdrawal_currency text,
  p_withdrawal_exchange_rate numeric,
  p_destination_account_id uuid,
  p_withdrawn_at date
)
returns uuid language sql security invoker set search_path = pg_catalog
as $$
  select private.withdraw_investment_impl(
    p_investment_id,
    p_quantity,
    p_withdrawal_price_original,
    p_withdrawal_currency,
    p_withdrawal_exchange_rate,
    p_destination_account_id,
    p_withdrawn_at
  );
$$;

alter function public.load_ledger_history(text, date, date, uuid, uuid, numeric, numeric) set schema private;
alter function private.load_ledger_history(text, date, date, uuid, uuid, numeric, numeric) rename to load_ledger_history_impl;
alter function private.load_ledger_history_impl(text, date, date, uuid, uuid, numeric, numeric) set search_path = pg_catalog;
create or replace function public.load_ledger_history(
  p_type text default null,
  p_from date default null,
  p_to date default null,
  p_category uuid default null,
  p_account uuid default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null
)
returns table(
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
language sql stable security invoker set search_path = pg_catalog
as $$
  select *
  from private.load_ledger_history_impl(
    p_type, p_from, p_to, p_category, p_account, p_min_amount, p_max_amount
  );
$$;

revoke execute on function
  private.delete_goal_contribution_impl(uuid),
  private.delete_investment_impl(uuid),
  private.delete_liability_payment_transaction_impl(uuid),
  private.record_goal_contribution_impl(uuid, uuid, numeric, date, text),
  private.soft_delete_account_transfer_impl(uuid),
  private.soft_delete_transaction_impl(uuid),
  private.withdraw_investment_impl(uuid, numeric, numeric, text, numeric, uuid, date),
  private.load_ledger_history_impl(text, date, date, uuid, uuid, numeric, numeric)
from public, anon;

grant execute on function
  private.delete_goal_contribution_impl(uuid),
  private.delete_investment_impl(uuid),
  private.delete_liability_payment_transaction_impl(uuid),
  private.record_goal_contribution_impl(uuid, uuid, numeric, date, text),
  private.soft_delete_account_transfer_impl(uuid),
  private.soft_delete_transaction_impl(uuid),
  private.withdraw_investment_impl(uuid, numeric, numeric, text, numeric, uuid, date),
  private.load_ledger_history_impl(text, date, date, uuid, uuid, numeric, numeric)
to authenticated, service_role;

revoke execute on function
  public.delete_goal_contribution(uuid),
  public.delete_investment(uuid),
  public.delete_liability_payment_transaction(uuid),
  public.record_goal_contribution(uuid, uuid, numeric, date, text),
  public.soft_delete_account_transfer(uuid),
  public.soft_delete_transaction(uuid),
  public.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date),
  public.load_ledger_history(text, date, date, uuid, uuid, numeric, numeric)
from public, anon;

grant execute on function
  public.delete_goal_contribution(uuid),
  public.delete_investment(uuid),
  public.delete_liability_payment_transaction(uuid),
  public.record_goal_contribution(uuid, uuid, numeric, date, text),
  public.soft_delete_account_transfer(uuid),
  public.soft_delete_transaction(uuid),
  public.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date),
  public.load_ledger_history(text, date, date, uuid, uuid, numeric, numeric)
to authenticated, service_role;
