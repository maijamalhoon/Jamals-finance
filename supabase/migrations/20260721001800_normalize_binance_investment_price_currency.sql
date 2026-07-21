create or replace function public.normalize_binance_investment_price_currency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(coalesce(new.price_source, '')) = 'binance'
    and new.current_price_original is not null
  then
    new.current_price_currency := 'USD';
    new.price_currency := 'PKR';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_binance_investment_price_currency
  on public.investments;
create trigger normalize_binance_investment_price_currency
before insert or update of price_source, current_price_original, current_price_currency, price_currency
on public.investments
for each row
execute function public.normalize_binance_investment_price_currency();

revoke all privileges on function public.normalize_binance_investment_price_currency()
  from public, anon, authenticated;
grant execute on function public.normalize_binance_investment_price_currency()
  to service_role, postgres;

update public.investments
set current_price_currency = 'USD',
    price_currency = 'PKR'
where lower(coalesce(price_source, '')) = 'binance'
  and current_price_original is not null
  and (
    upper(coalesce(current_price_currency, '')) <> 'USD'
    or upper(coalesce(price_currency, '')) <> 'PKR'
  );
