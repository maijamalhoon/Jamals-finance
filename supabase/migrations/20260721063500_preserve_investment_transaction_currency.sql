create or replace function private.sync_investment_transaction_from_source()
returns trigger
language plpgsql
set search_path = 'pg_catalog'
as $$
begin
  if new.quantity is null
    or new.quantity <= 0
    or new.purchase_price is null
    or new.purchase_price <= 0
  then
    return new;
  end if;

  update public.transactions transaction
  set
    type = 'investment',
    amount = new.quantity * new.purchase_price,
    amount_original = new.quantity * coalesce(
      new.purchase_price_original,
      new.purchase_price
    ),
    currency = upper(coalesce(new.purchase_currency, 'PKR')),
    exchange_rate_to_pkr = case
      when upper(coalesce(new.purchase_currency, 'PKR')) = 'PKR' then 1
      else coalesce(new.purchase_exchange_rate, 1)
    end,
    date = coalesce(new.purchased_at, transaction.date),
    note = case
      when transaction.note is null
        or transaction.note like 'Investment contribution:%'
      then 'Investment contribution: ' || btrim(new.name)
      else transaction.note
    end,
    source_name = 'Investments',
    person_name = null,
    item_name = btrim(new.name)
  where transaction.investment_id = new.id
    and transaction.user_id = new.user_id
    and transaction.deleted_at is null
    and (
      transaction.account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = transaction.account_id
          and account.user_id = transaction.user_id
          and account.status = 'active'
      )
    );

  return new;
end;
$$;

drop trigger if exists investments_sync_linked_transaction
  on public.investments;
create trigger investments_sync_linked_transaction
after update of
  name,
  quantity,
  purchase_price,
  purchase_price_original,
  purchase_currency,
  purchase_exchange_rate,
  purchased_at
on public.investments
for each row
execute function private.sync_investment_transaction_from_source();
