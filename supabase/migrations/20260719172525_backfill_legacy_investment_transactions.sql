insert into public.categories(user_id, name, type, color)
select distinct
  investment.user_id,
  'Investments',
  'expense',
  '#7c5ce0'
from public.investments investment
where not exists (
  select 1
  from public.transactions transaction
  where transaction.investment_id = investment.id
    and transaction.user_id = investment.user_id
)
and not exists (
  select 1
  from public.categories category
  where category.user_id = investment.user_id
    and category.type = 'expense'
    and lower(category.name) in ('investment', 'investments')
    and category.parent_id is null
);

insert into public.transactions(
  user_id,
  type,
  amount,
  category_id,
  account_id,
  date,
  note,
  source_name,
  person_name,
  item_name,
  investment_id
)
select
  investment.user_id,
  'investment',
  investment.quantity * investment.purchase_price,
  investment_category.id,
  null,
  coalesce(investment.purchased_at, current_date),
  'Investment contribution: ' || btrim(investment.name),
  'Investments',
  null,
  btrim(investment.name),
  investment.id
from public.investments investment
join lateral (
  select category.id
  from public.categories category
  where category.user_id = investment.user_id
    and category.type = 'expense'
    and lower(category.name) in ('investment', 'investments')
    and category.parent_id is null
  order by case lower(category.name) when 'investments' then 0 else 1 end,
           category.created_at,
           category.id
  limit 1
) investment_category on true
where investment.quantity is not null
  and investment.quantity > 0
  and investment.purchase_price is not null
  and investment.purchase_price > 0
  and not exists (
    select 1
    from public.transactions transaction
    where transaction.investment_id = investment.id
      and transaction.user_id = investment.user_id
  );
