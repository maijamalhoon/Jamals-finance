alter table public.crypto_assets
  add column if not exists binance_symbol text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.crypto_assets'::regclass
      and conname = 'crypto_assets_binance_symbol_format'
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

update public.crypto_assets
set binance_symbol = case
  when upper(symbol) = 'USDT' then null
  when upper(symbol) = 'BTT' then 'BTTCUSDT'
  else upper(symbol) || 'USDT'
end;

create index if not exists crypto_assets_binance_symbol_idx
  on public.crypto_assets (binance_symbol)
  where binance_symbol is not null;
