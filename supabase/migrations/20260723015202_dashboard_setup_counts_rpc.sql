create or replace function public.get_dashboard_setup_counts()
returns table (
  accounts bigint,
  income_transactions bigint,
  expense_transactions bigint,
  income_categories bigint,
  expense_categories bigint,
  goals bigint,
  investments bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.accounts where user_id = (select auth.uid()) and status = 'active') as accounts,
    (select count(*) from public.transactions where user_id = (select auth.uid()) and deleted_at is null and type = 'income') as income_transactions,
    (select count(*) from public.transactions where user_id = (select auth.uid()) and deleted_at is null and type = 'expense') as expense_transactions,
    (select count(*) from public.categories where user_id = (select auth.uid()) and type = 'income') as income_categories,
    (select count(*) from public.categories where user_id = (select auth.uid()) and type = 'expense') as expense_categories,
    (select count(*) from public.goals where user_id = (select auth.uid())) as goals,
    (select count(*) from public.investments where user_id = (select auth.uid())) as investments;
$$;

revoke all on function public.get_dashboard_setup_counts() from public;
grant execute on function public.get_dashboard_setup_counts() to authenticated;
