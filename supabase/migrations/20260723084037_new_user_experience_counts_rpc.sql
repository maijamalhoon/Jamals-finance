create or replace function public.get_new_user_experience_counts()
returns table (
  accounts bigint,
  income_transactions bigint,
  expense_transactions bigint,
  total_transactions bigint,
  transfers bigint,
  income_categories bigint,
  expense_categories bigint,
  goals bigint,
  investments bigint,
  payables bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.accounts where user_id = (select auth.uid())) as accounts,
    (select count(*) from public.transactions where user_id = (select auth.uid()) and type = 'income') as income_transactions,
    (select count(*) from public.transactions where user_id = (select auth.uid()) and type = 'expense') as expense_transactions,
    (select count(*) from public.transactions where user_id = (select auth.uid())) as total_transactions,
    (select count(*) from public.account_transfers where user_id = (select auth.uid())) as transfers,
    (select count(*) from public.categories where user_id = (select auth.uid()) and type = 'income') as income_categories,
    (select count(*) from public.categories where user_id = (select auth.uid()) and type = 'expense') as expense_categories,
    (select count(*) from public.goals where user_id = (select auth.uid())) as goals,
    (select count(*) from public.investments where user_id = (select auth.uid())) as investments,
    (select count(*) from public.liabilities where user_id = (select auth.uid())) as payables;
$$;

revoke all on function public.get_new_user_experience_counts() from public;
revoke all on function public.get_new_user_experience_counts() from anon;
grant execute on function public.get_new_user_experience_counts() to authenticated;
