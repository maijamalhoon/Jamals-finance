alter table public.investments
  add column if not exists asset_id text,
  add column if not exists symbol text,
  add column if not exists image_url text,
  add column if not exists price_source text default 'manual',
  add column if not exists price_currency text default 'PKR',
  add column if not exists price_updated_at timestamptz,
  add column if not exists price_change_24h numeric,
  add column if not exists is_live_priced boolean default false;

update public.investments
set
  price_source = coalesce(price_source, 'manual'),
  price_currency = coalesce(price_currency, 'PKR'),
  is_live_priced = coalesce(is_live_priced, false);

create index if not exists investments_live_price_lookup_idx
  on public.investments(user_id, price_source, asset_id)
  where is_live_priced = true and asset_id is not null;
