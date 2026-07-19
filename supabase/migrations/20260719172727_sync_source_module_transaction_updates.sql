create or replace function private.sync_investment_transaction_from_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.quantity is null
    or new.quantity <= 0
    or new.purchase_price is null
    or new.purchase_price <= 0
  then
    return new;
  end if;

  update public.transactions transaction
  set
    type = 'investment',
    amount = new.quantity * new.purchase_price,
    date = coalesce(new.purchased_at, transaction.date),
    note = case
      when transaction.note is null
        or transaction.note like 'Investment contribution:%'
      then 'Investment contribution: ' || btrim(new.name)
      else transaction.note
    end,
    source_name = 'Investments',
    person_name = null,
    item_name = btrim(new.name)
  where transaction.investment_id = new.id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null;

  return new;
end;
$$;

create or replace function private.sync_goal_contribution_transaction_from_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  goal_name text;
begin
  select goal.name
    into goal_name
  from public.goals goal
  where goal.id = new.goal_id
    and goal.user_id = new.user_id;

  update public.transactions transaction
  set
    type = 'goal',
    amount = new.amount,
    account_id = new.account_id,
    date = new.contributed_at,
    note = coalesce(
      nullif(btrim(coalesce(new.note, '')), ''),
      'Goal contribution: ' || coalesce(goal_name, transaction.item_name, 'Goal')
    ),
    source_name = 'Goals',
    person_name = null,
    item_name = coalesce(goal_name, transaction.item_name)
  where transaction.goal_contribution_id = new.id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null;

  update public.goals goal
  set current_amount = coalesce((
    select sum(contribution.amount)
    from public.goal_contributions contribution
    where contribution.goal_id = goal.id
      and contribution.user_id = goal.user_id
  ), 0)
  where goal.id in (old.goal_id, new.goal_id)
    and goal.user_id = new.user_id;

  return new;
end;
$$;

create or replace function private.sync_liability_payment_transaction_from_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  liability_row public.liabilities%rowtype;
begin
  select liability.*
    into liability_row
  from public.liabilities liability
  where liability.id = new.liability_id
    and liability.user_id = new.user_id;

  update public.transactions transaction
  set
    type = 'expense',
    amount = new.amount,
    account_id = new.account_id,
    date = new.paid_at,
    note = coalesce(
      nullif(btrim(coalesce(new.note, '')), ''),
      'Payment returned to ' ||
        coalesce(liability_row.person_name, transaction.person_name, 'payee') ||
        ' for ' || coalesce(liability_row.reason, 'payable')
    ),
    person_name = coalesce(liability_row.person_name, transaction.person_name),
    item_name = coalesce(liability_row.item_name, transaction.item_name)
  where transaction.id = new.transaction_id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null;

  return new;
end;
$$;

create or replace function private.sync_goal_transaction_labels_from_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  update public.transactions transaction
  set
    item_name = btrim(new.name),
    note = case
      when transaction.note = 'Goal contribution: ' || old.name
      then 'Goal contribution: ' || btrim(new.name)
      else transaction.note
    end
  from public.goal_contributions contribution
  where contribution.goal_id = new.id
    and contribution.user_id = new.user_id
    and transaction.goal_contribution_id = contribution.id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null;

  return new;
end;
$$;

create or replace function private.sync_liability_transaction_labels_from_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  update public.transactions transaction
  set
    person_name = new.person_name,
    item_name = new.item_name,
    note = case
      when transaction.note =
        'Payment returned to ' || old.person_name || ' for ' || old.reason
      then 'Payment returned to ' || new.person_name || ' for ' || new.reason
      else transaction.note
    end
  from public.liability_payments payment
  where payment.liability_id = new.id
    and payment.user_id = new.user_id
    and transaction.id = payment.transaction_id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null;

  return new;
end;
$$;

drop trigger if exists investments_sync_linked_transaction on public.investments;
create trigger investments_sync_linked_transaction
after update of name, quantity, purchase_price, purchased_at on public.investments
for each row execute function private.sync_investment_transaction_from_source();

drop trigger if exists goal_contributions_sync_linked_transaction on public.goal_contributions;
create trigger goal_contributions_sync_linked_transaction
after update of goal_id, account_id, amount, contributed_at, note on public.goal_contributions
for each row execute function private.sync_goal_contribution_transaction_from_source();

drop trigger if exists liability_payments_sync_linked_transaction on public.liability_payments;
create trigger liability_payments_sync_linked_transaction
after update of liability_id, account_id, transaction_id, amount, paid_at, note on public.liability_payments
for each row execute function private.sync_liability_payment_transaction_from_source();

drop trigger if exists goals_sync_transaction_labels on public.goals;
create trigger goals_sync_transaction_labels
after update of name on public.goals
for each row
when (old.name is distinct from new.name)
execute function private.sync_goal_transaction_labels_from_source();

drop trigger if exists liabilities_sync_transaction_labels on public.liabilities;
create trigger liabilities_sync_transaction_labels
after update of person_name, item_name, reason on public.liabilities
for each row
when (
  old.person_name is distinct from new.person_name
  or old.item_name is distinct from new.item_name
  or old.reason is distinct from new.reason
)
execute function private.sync_liability_transaction_labels_from_source();

revoke all on function private.sync_investment_transaction_from_source() from public, anon, authenticated;
revoke all on function private.sync_goal_contribution_transaction_from_source() from public, anon, authenticated;
revoke all on function private.sync_liability_payment_transaction_from_source() from public, anon, authenticated;
revoke all on function private.sync_goal_transaction_labels_from_source() from public, anon, authenticated;
revoke all on function private.sync_liability_transaction_labels_from_source() from public, anon, authenticated;
