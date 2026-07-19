begin;

-- Keep every linked account transaction on the same canonical cost basis as
-- its investment. Updating the transaction also lets the existing balance
-- trigger apply only the exact delta when legacy fractional math differed.
update public.transactions transaction
set
  type = 'investment',
  amount = round(investment.quantity * investment.purchase_price, 2),
  date = investment.purchased_at,
  note = 'Investment contribution: ' || btrim(investment.name),
  source_name = 'Investments',
  person_name = null,
  item_name = btrim(investment.name)
from public.investments investment
where transaction.investment_id = investment.id
  and transaction.user_id = investment.user_id
  and investment.quantity is not null
  and investment.quantity > 0
  and investment.quantity::text not in ('NaN', 'Infinity', '-Infinity')
  and investment.purchase_price is not null
  and investment.purchase_price > 0
  and investment.purchase_price::text not in ('NaN', 'Infinity', '-Infinity')
  and (
    transaction.type is distinct from 'investment'
    or transaction.amount is distinct from round(investment.quantity * investment.purchase_price, 2)
    or transaction.date is distinct from investment.purchased_at
    or transaction.note is distinct from 'Investment contribution: ' || btrim(investment.name)
    or transaction.source_name is distinct from 'Investments'
    or transaction.person_name is not null
    or transaction.item_name is distinct from btrim(investment.name)
  );

commit;
