alter table public.crypto_assets
  add column if not exists binance_symbol text;

update public.crypto_assets
set binance_symbol = case
  when upper(symbol) = 'USDT' then null
  when upper(symbol) = 'BTT' then 'BTTCUSDT'
  else upper(symbol) || 'USDT'
end
where binance_symbol is null
  and is_active = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_assets_binance_symbol_format'
      and conrelid = 'public.crypto_assets'::regclass
  ) then
    alter table public.crypto_assets
      add constraint crypto_assets_binance_symbol_format
      check (
        binance_symbol is null
        or binance_symbol ~ '^[A-Z0-9]{5,24}$'
      );
  end if;
end
$$;

create index if not exists crypto_assets_binance_symbol_idx
  on public.crypto_assets (binance_symbol)
  where binance_symbol is not null;

comment on column public.crypto_assets.binance_symbol is
  'Binance Spot USDT market symbol used by the live public WebSocket price stream. Null means no automatic Binance price.';
