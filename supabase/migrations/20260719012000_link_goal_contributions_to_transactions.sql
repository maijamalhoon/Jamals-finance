begin;

-- Goal contributions are ledger activity, but they are savings allocations rather
-- than income or spending. A dedicated neutral transaction type keeps them visible
-- in history without changing account balances or expense analytics.
alter table public.transactions
  add column if not exists goal_contribution_id uuid
    references public.goal_contributions(id) on delete cascade;

create unique index if not exists transactions_goal_contribution_id_unique_idx
  on public.transactions(goal_contribution_id)
  where goal_contribution_id is not null;

create index if not exists transactions_user_goal_contribution_idx
  on public.transactions(user_id, goal_contribution_id)
  where goal_contribution_id is not null;

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type = any (array[
    'income'::text,
    'expense'::text,
    'investment'::text,
    'goal'::text,
    'refund'::text
  ]));

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
    when tx_type in ('expense', 'investment') then -coalesce(tx_amount, 0)
    else 0
  end;
$$;

-- Preserve every existing contribution by adding one linked neutral transaction.
insert into public.transactions(
  user_id,
  type,
  amount,
  account_id,
  date,
  note,
  source_name,
  person_name,
  item_name,
  goal_contribution_id
)
select
  contribution.user_id,
  'goal',
  contribution.amount,
  contribution.account_id,
  contribution.contributed_at,
  coalesce(
    nullif(btrim(coalesce(contribution.note, '')), ''),
    'Goal contribution: ' || goal.name
  ),
  'Goals',
  null,
  goal.name,
  contribution.id
from public.goal_contributions contribution
join public.goals goal
  on goal.id = contribution.goal_id
 and goal.user_id = contribution.user_id
where not exists (
  select 1
  from public.transactions transaction_row
  where transaction_row.goal_contribution_id = contribution.id
);

create or replace function public.record_goal_contribution(
  p_goal_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_contributed_at date,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  goal_row public.goals%rowtype;
  contribution_id uuid;
  remaining_amount numeric;
  transaction_note text;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before recording this contribution.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Contribution amount must be greater than 0.';
  end if;

  if p_contributed_at is null then
    raise exception 'Contribution date is required.';
  end if;

  select goal.*
    into goal_row
  from public.goals goal
  where goal.id = p_goal_id
    and goal.user_id = current_user_id
  for update;

  if goal_row.id is null then
    raise exception 'Goal not found.';
  end if;

  if p_account_id is not null and not exists (
    select 1
    from public.accounts account
    where account.id = p_account_id
      and account.user_id = current_user_id
  ) then
    raise exception 'Choose one of your accounts for this contribution.';
  end if;

  remaining_amount = greatest(goal_row.target_amount - goal_row.current_amount, 0);
  if remaining_amount <= 0 then
    raise exception 'This goal is already complete.';
  end if;

  if p_amount > remaining_amount then
    raise exception 'Contribution cannot be greater than the remaining goal amount.';
  end if;

  insert into public.goal_contributions(
    goal_id,
    user_id,
    account_id,
    amount,
    contributed_at,
    note
  )
  values (
    goal_row.id,
    current_user_id,
    p_account_id,
    p_amount,
    p_contributed_at,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into contribution_id;

  transaction_note = coalesce(
    nullif(btrim(coalesce(p_note, '')), ''),
    'Goal contribution: ' || goal_row.name
  );

  insert into public.transactions(
    user_id,
    type,
    amount,
    account_id,
    date,
    note,
    source_name,
    person_name,
    item_name,
    goal_contribution_id
  )
  values (
    current_user_id,
    'goal',
    p_amount,
    p_account_id,
    p_contributed_at,
    transaction_note,
    'Goals',
    null,
    goal_row.name,
    contribution_id
  );

  update public.goals
  set current_amount = current_amount + p_amount
  where id = goal_row.id
    and user_id = current_user_id;

  return contribution_id;
end;
$$;

create or replace function public.delete_goal_contribution(
  p_contribution_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  contribution_row public.goal_contributions%rowtype;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before deleting this contribution.';
  end if;

  select contribution.*
    into contribution_row
  from public.goal_contributions contribution
  where contribution.id = p_contribution_id
    and contribution.user_id = current_user_id
  for update;

  if contribution_row.id is null then
    raise exception 'Contribution not found.';
  end if;

  perform 1
  from public.goals goal
  where goal.id = contribution_row.goal_id
    and goal.user_id = current_user_id
  for update;

  -- The linked transaction is removed automatically by the foreign-key cascade.
  delete from public.goal_contributions
  where id = contribution_row.id
    and user_id = current_user_id;

  update public.goals
  set current_amount = greatest(current_amount - contribution_row.amount, 0)
  where id = contribution_row.goal_id
    and user_id = current_user_id;

  return contribution_row.goal_id;
end;
$$;

revoke execute on function public.record_goal_contribution(
  uuid,
  uuid,
  numeric,
  date,
  text
) from public, anon;
grant execute on function public.record_goal_contribution(
  uuid,
  uuid,
  numeric,
  date,
  text
) to authenticated;

revoke execute on function public.delete_goal_contribution(uuid)
  from public, anon;
grant execute on function public.delete_goal_contribution(uuid)
  to authenticated;

commit;
