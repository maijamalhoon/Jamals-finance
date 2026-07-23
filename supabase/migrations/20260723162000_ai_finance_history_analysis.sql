create or replace function public.get_ai_finance_history_analysis()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with ledger as (
  select
    t.date,
    t.type,
    coalesce(t.amount, 0)::numeric as amount,
    coalesce(
      nullif(btrim(t.source_name), ''),
      nullif(btrim(t.note), ''),
      nullif(btrim(c.name), ''),
      nullif(btrim(a.name), ''),
      'Unspecified'
    ) as income_source,
    coalesce(
      nullif(btrim(t.item_name), ''),
      nullif(btrim(t.person_name), ''),
      nullif(btrim(t.note), ''),
      nullif(btrim(c.name), ''),
      nullif(btrim(a.name), ''),
      'Unspecified'
    ) as expense_destination,
    coalesce(nullif(btrim(c.name), ''), 'Unspecified') as category_name
  from public.transactions t
  left join public.categories c
    on c.id = t.category_id
    and c.user_id = t.user_id
  left join public.accounts a
    on a.id = t.account_id
    and a.user_id = t.user_id
  where t.user_id = auth.uid()
    and t.deleted_at is null
),
bounds as (
  select min(date) as first_date, max(date) as last_date
  from ledger
),
period as (
  select
    first_date,
    last_date,
    case
      when first_date is null or last_date is null then 0
      else greatest(
        1,
        (
          extract(year from last_date)::integer * 12
          + extract(month from last_date)::integer
        ) - (
          extract(year from first_date)::integer * 12
          + extract(month from first_date)::integer
        ) + 1
      )
    end as month_count
  from bounds
),
totals as (
  select
    coalesce(sum(amount) filter (where type = 'income'), 0)::numeric as income,
    coalesce(sum(
      case
        when type = 'expense' then amount
        when type = 'refund' then -amount
        else 0
      end
    ), 0)::numeric as expenses
  from ledger
),
expense_ledger as (
  select
    date,
    date_trunc('month', date)::date as month_start,
    category_name,
    expense_destination,
    case
      when type = 'expense' then amount
      when type = 'refund' then -amount
      else 0
    end as signed_amount
  from ledger
  where type in ('expense', 'refund')
),
day_spending as (
  select date::text as label, sum(signed_amount)::numeric as amount
  from expense_ledger
  group by date
  having sum(signed_amount) > 0
),
month_spending as (
  select to_char(month_start, 'YYYY-MM') as label, sum(signed_amount)::numeric as amount
  from expense_ledger
  group by month_start
  having sum(signed_amount) > 0
),
category_spending as (
  select category_name as label, sum(signed_amount)::numeric as amount
  from expense_ledger
  group by category_name
  having sum(signed_amount) > 0
),
income_sources as (
  select income_source as label, sum(amount)::numeric as amount
  from ledger
  where type = 'income'
  group by income_source
  having sum(amount) > 0
  order by amount desc, label asc
  limit 5
),
expense_destinations as (
  select expense_destination as label, sum(signed_amount)::numeric as amount
  from expense_ledger
  group by expense_destination
  having sum(signed_amount) > 0
  order by amount desc, label asc
  limit 5
),
cash as (
  select coalesce(sum(balance), 0)::numeric as balance
  from public.accounts
  where user_id = auth.uid()
    and status = 'active'
)
select jsonb_build_object(
  'firstDate', period.first_date,
  'lastDate', period.last_date,
  'monthCount', period.month_count,
  'totals', jsonb_build_object(
    'income', totals.income,
    'expenses', totals.expenses,
    'savings', totals.income - totals.expenses
  ),
  'monthlyAverage', jsonb_build_object(
    'income', case when period.month_count > 0 then totals.income / period.month_count else 0 end,
    'expenses', case when period.month_count > 0 then totals.expenses / period.month_count else 0 end,
    'savings', case when period.month_count > 0 then (totals.income - totals.expenses) / period.month_count else 0 end
  ),
  'peakSpending', jsonb_build_object(
    'date', (
      select jsonb_build_object('label', label, 'amount', amount)
      from day_spending
      order by amount desc, label asc
      limit 1
    ),
    'month', (
      select jsonb_build_object('label', label, 'amount', amount)
      from month_spending
      order by amount desc, label asc
      limit 1
    ),
    'category', (
      select jsonb_build_object('label', label, 'amount', amount)
      from category_spending
      order by amount desc, label asc
      limit 1
    )
  ),
  'incomeSources', coalesce(
    (select jsonb_agg(jsonb_build_object('label', label, 'amount', amount) order by amount desc, label asc) from income_sources),
    '[]'::jsonb
  ),
  'expenseDestinations', coalesce(
    (select jsonb_agg(jsonb_build_object('label', label, 'amount', amount) order by amount desc, label asc) from expense_destinations),
    '[]'::jsonb
  ),
  'cashBalance', cash.balance
)
from period
cross join totals
cross join cash;
$$;

revoke all on function public.get_ai_finance_history_analysis() from public;
grant execute on function public.get_ai_finance_history_analysis() to authenticated;

comment on function public.get_ai_finance_history_analysis() is
  'Returns authenticated-user-only aggregate finance history for deterministic AI calculations without transferring raw ledger rows.';
