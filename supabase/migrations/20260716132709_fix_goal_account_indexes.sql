begin;

create index if not exists goals_account_id_idx
  on public.goals(account_id)
  where account_id is not null;

create index if not exists goal_contributions_account_id_idx
  on public.goal_contributions(account_id)
  where account_id is not null;

alter function public.set_account_archived(uuid, boolean)
  security invoker;

commit;
