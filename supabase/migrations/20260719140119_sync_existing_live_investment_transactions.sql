begin;

update public.transactions transaction
set
  amount = investment.quantity * investment.purchase_price,
  date = investment.purchased_at,
  note = 'Investment contribution: ' || btrim(investment.name),
  source_name = 'Investments',
  person_name = null,
  item_name = btrim(investment.name)
from public.investments investment
where transaction.investment_id = investment.id
  and transaction.user_id = investment.user_id
  and coalesce(investment.is_live_priced, false)
  and lower(coalesce(investment.price_source, '')) in ('coingecko', 'alpha_vantage')
  and investment.quantity is not null
  and investment.quantity > 0
  and investment.purchase_price is not null
  and investment.purchase_price > 0
  and (
    transaction.amount is distinct from investment.quantity * investment.purchase_price
    or transaction.date is distinct from investment.purchased_at
  );

commit;
