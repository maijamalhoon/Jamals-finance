alter table public.investments
  add column if not exists purchase_price_original numeric,
  add column if not exists purchase_currency text default 'PKR',
  add column if not exists current_price_original numeric,
  add column if not exists current_price_currency text default 'PKR';

update public.investments
set
  purchase_currency = coalesce(purchase_currency, 'PKR'),
  current_price_currency = coalesce(current_price_currency, 'PKR');
