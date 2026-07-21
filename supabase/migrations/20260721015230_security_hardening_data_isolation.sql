create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.enforce_user_id_ownership()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Record ownership cannot be changed.' using errcode = '42501';
  end if;

  if current_user_id is not null and new.user_id is distinct from current_user_id then
    raise exception 'Record ownership does not match the authenticated user.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_user_id_ownership() from public, anon, authenticated;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'accounts',
    'categories',
    'transactions',
    'investments',
    'goals',
    'liabilities',
    'liability_payments',
    'account_transfers',
    'notification_states',
    'notification_preferences',
    'goal_contributions',
    'investment_withdrawals'
  ] loop
    execute format('drop trigger if exists enforce_user_id_ownership on public.%I', relation_name);
    execute format(
      'create trigger enforce_user_id_ownership before insert or update of user_id on public.%I for each row execute function private.enforce_user_id_ownership()',
      relation_name
    );
  end loop;
end;
$$;

drop policy if exists owner_only on public.accounts;
create policy accounts_select_own on public.accounts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy accounts_insert_own on public.accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy accounts_update_own on public.accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy accounts_delete_own on public.accounts for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.categories;
create policy categories_select_own on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.goals;
create policy goals_select_own on public.goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goals_insert_own on public.goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy goals_update_own on public.goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy goals_delete_own on public.goals for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.investments;
create policy investments_select_own on public.investments for select to authenticated
  using ((select auth.uid()) = user_id);
create policy investments_insert_own on public.investments for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy investments_update_own on public.investments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy investments_delete_own on public.investments for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists owner_only on public.transactions;
create policy transactions_select_own on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all privileges on table
  public.accounts,
  public.categories,
  public.transactions,
  public.investments,
  public.goals,
  public.exchange_rates,
  public.liabilities,
  public.liability_payments,
  public.account_transfers,
  public.profiles,
  public.notification_states,
  public.notification_preferences,
  public.goal_contributions,
  public.investment_withdrawals
from anon;

revoke all privileges on table public.crypto_assets from anon;
grant select on table public.crypto_assets to anon;

revoke all privileges on table
  public.accounts,
  public.categories,
  public.transactions,
  public.investments,
  public.goals,
  public.exchange_rates,
  public.liabilities,
  public.liability_payments,
  public.account_transfers,
  public.profiles,
  public.notification_states,
  public.notification_preferences,
  public.goal_contributions,
  public.investment_withdrawals,
  public.crypto_assets
from authenticated;

grant select, insert, update, delete on table
  public.accounts,
  public.categories,
  public.transactions,
  public.investments,
  public.goals,
  public.liabilities,
  public.liability_payments,
  public.account_transfers
  to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.notification_states to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
grant select, delete on table public.goal_contributions to authenticated;
grant select on table public.investment_withdrawals, public.exchange_rates, public.crypto_assets to authenticated;

create unique index if not exists accounts_id_user_id_key on public.accounts(id, user_id);
create unique index if not exists investments_id_user_id_key on public.investments(id, user_id);
create unique index if not exists transactions_id_user_id_key on public.transactions(id, user_id);
create unique index if not exists goals_id_user_id_key on public.goals(id, user_id);
create unique index if not exists goal_contributions_id_user_id_key on public.goal_contributions(id, user_id);
create unique index if not exists account_transfers_id_user_id_key on public.account_transfers(id, user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'account_transfers_from_account_owner_fkey') then
    alter table public.account_transfers add constraint account_transfers_from_account_owner_fkey
      foreign key (from_account_id, user_id) references public.accounts(id, user_id) on delete restrict not valid;
    alter table public.account_transfers validate constraint account_transfers_from_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'account_transfers_to_account_owner_fkey') then
    alter table public.account_transfers add constraint account_transfers_to_account_owner_fkey
      foreign key (to_account_id, user_id) references public.accounts(id, user_id) on delete restrict not valid;
    alter table public.account_transfers validate constraint account_transfers_to_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_account_owner_fkey') then
    alter table public.transactions add constraint transactions_account_owner_fkey
      foreign key (account_id, user_id) references public.accounts(id, user_id) on delete set null (account_id) not valid;
    alter table public.transactions validate constraint transactions_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_investment_owner_fkey') then
    alter table public.transactions add constraint transactions_investment_owner_fkey
      foreign key (investment_id, user_id) references public.investments(id, user_id) on delete set null (investment_id) not valid;
    alter table public.transactions validate constraint transactions_investment_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_refund_owner_fkey') then
    alter table public.transactions add constraint transactions_refund_owner_fkey
      foreign key (refund_of_transaction_id, user_id) references public.transactions(id, user_id) on delete restrict not valid;
    alter table public.transactions validate constraint transactions_refund_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_goal_contribution_owner_fkey') then
    alter table public.transactions add constraint transactions_goal_contribution_owner_fkey
      foreign key (goal_contribution_id, user_id) references public.goal_contributions(id, user_id) on delete set null (goal_contribution_id) not valid;
    alter table public.transactions validate constraint transactions_goal_contribution_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'goals_account_owner_fkey') then
    alter table public.goals add constraint goals_account_owner_fkey
      foreign key (account_id, user_id) references public.accounts(id, user_id) on delete set null (account_id) not valid;
    alter table public.goals validate constraint goals_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'goal_contributions_goal_owner_fkey') then
    alter table public.goal_contributions add constraint goal_contributions_goal_owner_fkey
      foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade not valid;
    alter table public.goal_contributions validate constraint goal_contributions_goal_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'goal_contributions_account_owner_fkey') then
    alter table public.goal_contributions add constraint goal_contributions_account_owner_fkey
      foreign key (account_id, user_id) references public.accounts(id, user_id) on delete set null (account_id) not valid;
    alter table public.goal_contributions validate constraint goal_contributions_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'liabilities_account_owner_fkey') then
    alter table public.liabilities add constraint liabilities_account_owner_fkey
      foreign key (account_id, user_id) references public.accounts(id, user_id) on delete set null (account_id) not valid;
    alter table public.liabilities validate constraint liabilities_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'liability_payments_account_owner_fkey') then
    alter table public.liability_payments add constraint liability_payments_account_owner_fkey
      foreign key (account_id, user_id) references public.accounts(id, user_id) on delete set null (account_id) not valid;
    alter table public.liability_payments validate constraint liability_payments_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'liability_payments_transaction_owner_fkey') then
    alter table public.liability_payments add constraint liability_payments_transaction_owner_fkey
      foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete set null (transaction_id) not valid;
    alter table public.liability_payments validate constraint liability_payments_transaction_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investment_withdrawals_source_account_owner_fkey') then
    alter table public.investment_withdrawals add constraint investment_withdrawals_source_account_owner_fkey
      foreign key (source_account_id, user_id) references public.accounts(id, user_id) on delete set null (source_account_id) not valid;
    alter table public.investment_withdrawals validate constraint investment_withdrawals_source_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investment_withdrawals_destination_account_owner_fkey') then
    alter table public.investment_withdrawals add constraint investment_withdrawals_destination_account_owner_fkey
      foreign key (destination_account_id, user_id) references public.accounts(id, user_id) on delete set null (destination_account_id) not valid;
    alter table public.investment_withdrawals validate constraint investment_withdrawals_destination_account_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investment_withdrawals_source_transaction_owner_fkey') then
    alter table public.investment_withdrawals add constraint investment_withdrawals_source_transaction_owner_fkey
      foreign key (source_transaction_id, user_id) references public.transactions(id, user_id) on delete set null (source_transaction_id) not valid;
    alter table public.investment_withdrawals validate constraint investment_withdrawals_source_transaction_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investment_withdrawals_pnl_transaction_owner_fkey') then
    alter table public.investment_withdrawals add constraint investment_withdrawals_pnl_transaction_owner_fkey
      foreign key (pnl_transaction_id, user_id) references public.transactions(id, user_id) on delete set null (pnl_transaction_id) not valid;
    alter table public.investment_withdrawals validate constraint investment_withdrawals_pnl_transaction_owner_fkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investment_withdrawals_transfer_owner_fkey') then
    alter table public.investment_withdrawals add constraint investment_withdrawals_transfer_owner_fkey
      foreign key (account_transfer_id, user_id) references public.account_transfers(id, user_id) on delete set null (account_transfer_id) not valid;
    alter table public.investment_withdrawals validate constraint investment_withdrawals_transfer_owner_fkey;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_amount_positive') then
    alter table public.transactions add constraint transactions_amount_positive check (amount > 0) not valid;
    alter table public.transactions validate constraint transactions_amount_positive;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'goals_amounts_nonnegative') then
    alter table public.goals add constraint goals_amounts_nonnegative check (target_amount > 0 and coalesce(current_amount, 0) >= 0) not valid;
    alter table public.goals validate constraint goals_amounts_nonnegative;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investments_values_positive') then
    alter table public.investments add constraint investments_values_positive check (quantity > 0 and purchase_price > 0) not valid;
    alter table public.investments validate constraint investments_values_positive;
  end if;
end;
$$;

create table if not exists private.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, scope),
  check (char_length(scope) between 1 and 120)
);
revoke all on table private.api_rate_limits from public, anon, authenticated;
grant all on table private.api_rate_limits to service_role;

create or replace function private.consume_api_rate_limit_impl(
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_scope text := lower(btrim(coalesce(p_scope, '')));
  current_row private.api_rate_limits%rowtype;
  current_time timestamptz := clock_timestamp();
begin
  if current_user_id is null then return false; end if;
  if normalized_scope !~ '^[a-z0-9_:/.-]{1,120}$' then return false; end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then return false; end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then return false; end if;

  select * into current_row
  from private.api_rate_limits
  where user_id = current_user_id and scope = normalized_scope
  for update;

  if not found then
    insert into private.api_rate_limits(user_id, scope, window_started_at, request_count, updated_at)
    values (current_user_id, normalized_scope, current_time, 1, current_time);
    return true;
  end if;

  if current_time >= current_row.window_started_at + make_interval(secs => p_window_seconds) then
    update private.api_rate_limits
      set window_started_at = current_time, request_count = 1, updated_at = current_time
      where user_id = current_user_id and scope = normalized_scope;
    return true;
  end if;

  if current_row.request_count >= p_limit then
    update private.api_rate_limits set updated_at = current_time
      where user_id = current_user_id and scope = normalized_scope;
    return false;
  end if;

  update private.api_rate_limits
    set request_count = request_count + 1, updated_at = current_time
    where user_id = current_user_id and scope = normalized_scope;
  return true;
end;
$$;

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language sql
security invoker
set search_path = pg_catalog
as $$
  select private.consume_api_rate_limit_impl(p_scope, p_limit, p_window_seconds);
$$;

revoke execute on function private.consume_api_rate_limit_impl(text, integer, integer) from public, anon;
grant execute on function private.consume_api_rate_limit_impl(text, integer, integer) to authenticated, service_role;
revoke execute on function public.consume_api_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to authenticated, service_role;

drop function if exists public.email_exists(text);

revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.assign_category_visual_identity(),
  public.normalize_investment_purchase_accounting(),
  public.normalize_linked_investment_transaction_amount(),
  public.set_goal_icon_from_name()
from authenticated;

grant execute on function
  public.archive_transaction(uuid),
  public.delete_goal_contribution(uuid),
  public.delete_investment(uuid),
  public.delete_liability_payment_transaction(uuid),
  public.load_ledger_history(text, date, date, uuid, uuid, numeric, numeric),
  public.record_goal_contribution(uuid, uuid, numeric, date, text),
  public.record_liability_payment(uuid, uuid, numeric, date, text),
  public.save_investment_purchase(uuid, text, text, numeric, numeric, numeric, text, numeric, numeric, text, date, text, text, text, text, text, timestamptz, numeric, boolean, uuid),
  public.set_account_archived(uuid, boolean),
  public.soft_delete_account_transfer(uuid),
  public.soft_delete_transaction(uuid),
  public.withdraw_investment(uuid, numeric, numeric, text, numeric, uuid, date),
  public.consume_api_rate_limit(text, integer, integer),
  public.category_color_distance_sq(text, text),
  public.infer_category_icon_key(text, text),
  public.infer_goal_icon(text),
  public.is_supported_financial_currency(text),
  public.normalized_amount_pkr(numeric, text, numeric),
  public.transaction_balance_delta(text, numeric)
to authenticated;
