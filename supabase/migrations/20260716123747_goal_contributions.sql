begin;

alter table public.goals
  add column if not exists account_id uuid
    references public.accounts(id) on delete set null;

create index if not exists goals_user_account_idx
  on public.goals(user_id, account_id)
  where account_id is not null;

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric not null check (amount > 0),
  contributed_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_user_date_idx
  on public.goal_contributions(user_id, contributed_at desc, created_at desc);

create index if not exists goal_contributions_goal_idx
  on public.goal_contributions(goal_id, contributed_at desc, created_at desc);

alter table public.goal_contributions enable row level security;

create policy "Users can read their goal contributions"
  on public.goal_contributions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.goal_contributions from anon, authenticated;
grant select on table public.goal_contributions to authenticated;

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
