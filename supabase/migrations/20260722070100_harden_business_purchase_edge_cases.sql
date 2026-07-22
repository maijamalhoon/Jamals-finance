alter table public.business_supplier_bills
  drop constraint if exists business_supplier_bills_business_id_idempotency_key_key;
alter table public.business_supplier_payments
  drop constraint if exists business_supplier_payments_business_id_idempotency_key_key;

create unique index if not exists business_supplier_bills_idempotency_unique_idx
  on public.business_supplier_bills(business_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists business_supplier_payments_idempotency_unique_idx
  on public.business_supplier_payments(business_id, idempotency_key)
  where idempotency_key is not null;

create or replace function private.prepare_business_supplier_bill_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_bill_id uuid;
  target_business_id uuid;
  bill_status text;
  bill_exchange_rate numeric(24, 10);
  rounding_scale smallint;
  allocation_valid boolean;
begin
  target_bill_id := case when tg_op = 'DELETE' then old.bill_id else new.bill_id end;
  target_business_id := case when tg_op = 'DELETE' then old.business_id else new.business_id end;

  select bill.status, bill.exchange_rate
  into bill_status, bill_exchange_rate
  from public.business_supplier_bills bill
  where bill.id = target_bill_id
    and bill.business_id = target_business_id
  for update;

  if not found then
    raise exception 'Supplier bill does not exist.' using errcode = '23503';
  end if;

  if bill_status <> 'draft' then
    raise exception 'Issued supplier bill lines are immutable.' using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  select exists (
    select 1
    from public.business_chart_of_accounts account
    where account.id = new.allocation_account_id
      and account.business_id = new.business_id
      and account.is_active
      and (
        account.account_type = 'expense'
        or (
          account.account_type = 'asset'
          and account.system_key in ('inventory', 'prepaid_expenses', 'fixed_assets')
        )
      )
  ) into allocation_valid;

  if not allocation_valid then
    raise exception 'Allocation account must be an active expense, inventory, prepaid, or fixed-asset account.'
      using errcode = '23514';
  end if;

  select settings.rounding_scale
  into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id = new.business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  new.description := btrim(new.description);
  new.gross_transaction := round(new.quantity * new.unit_cost_transaction, rounding_scale);
  new.discount_transaction := round(
    new.gross_transaction * (new.discount_percent / 100),
    rounding_scale
  );
  new.net_transaction := new.gross_transaction - new.discount_transaction;
  new.tax_transaction := round(new.net_transaction * (new.tax_rate / 100), rounding_scale);
  new.total_transaction := new.net_transaction + new.tax_transaction;

  new.gross_base := round(new.gross_transaction * bill_exchange_rate, rounding_scale);
  new.discount_base := round(new.discount_transaction * bill_exchange_rate, rounding_scale);
  new.net_base := new.gross_base - new.discount_base;
  new.tax_base := round(new.tax_transaction * bill_exchange_rate, rounding_scale);
  new.total_base := new.net_base + new.tax_base;

  return new;
end;
$$;

revoke execute on function private.prepare_business_supplier_bill_line()
  from public, anon, authenticated;