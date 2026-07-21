create or replace function private.record_goal_contribution_impl(
  p_goal_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_contributed_at date,
  p_note text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  goal_row public.goals%rowtype;
  saved_total numeric;
  contribution_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in again before saving this contribution.';
  end if;

  select goal.* into goal_row
  from public.goals goal
  where goal.id = p_goal_id
    and goal.user_id = current_user_id
  for update;

  if goal_row.id is null then
    raise exception 'Goal not found.';
  end if;

  if p_account_id is not null and not exists (
    select 1 from public.accounts account
    where account.id = p_account_id
      and account.user_id = current_user_id
      and account.status = 'active'
  ) then
    raise exception 'Choose one of your active accounts for this contribution.';
  end if;

  if p_amount is null
    or p_amount <= 0
    or p_amount::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Contribution amount must be greater than 0.';
  end if;

  if p_contributed_at is null then
    raise exception 'Contribution date is required.';
  end if;

  select coalesce(sum(contribution.amount), 0)
    into saved_total
  from public.goal_contributions contribution
  where contribution.goal_id = goal_row.id
    and contribution.user_id = current_user_id;

  if saved_total + p_amount > goal_row.target_amount then
    raise exception 'Contribution cannot exceed the remaining goal amount.';
  end if;

  insert into public.goal_contributions(
    user_id,
    goal_id,
    account_id,
    amount,
    contributed_at,
    note
  )
  values (
    current_user_id,
    goal_row.id,
    p_account_id,
    p_amount,
    p_contributed_at,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into contribution_id;

  return contribution_id;
end;
$$;
