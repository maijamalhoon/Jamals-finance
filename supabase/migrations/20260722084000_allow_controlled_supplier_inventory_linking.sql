create or replace function private.prepare_business_supplier_bill_line()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  target_bill_id uuid;
  target_business_id uuid;
  bill_status text;
  bill_exchange_rate numeric(24,10);
  rounding_scale smallint;
  allocation_valid boolean;
  inventory_link_only boolean:=false;
  movement_link_only boolean:=false;
begin
  target_bill_id:=case when tg_op='DELETE' then old.bill_id else new.bill_id end;
  target_business_id:=case when tg_op='DELETE' then old.business_id else new.business_id end;
  select bill.status,bill.exchange_rate
  into bill_status,bill_exchange_rate
  from public.business_supplier_bills bill
  where bill.id=target_bill_id and bill.business_id=target_business_id
  for update;
  if not found then raise exception 'Supplier bill does not exist.' using errcode='23503'; end if;

  if bill_status<>'draft' then
    if tg_op='UPDATE' then
      inventory_link_only:=(
        old.product_id is null and new.product_id is not null
        and old.warehouse_id is null and new.warehouse_id is not null
        and old.inventory_movement_id is null and new.inventory_movement_id is null
        and new.id=old.id and new.business_id=old.business_id and new.bill_id=old.bill_id
        and new.line_number=old.line_number
        and new.description is not distinct from old.description
        and new.quantity is not distinct from old.quantity
        and new.unit_cost_transaction is not distinct from old.unit_cost_transaction
        and new.discount_percent is not distinct from old.discount_percent
        and new.tax_rate is not distinct from old.tax_rate
        and new.allocation_account_id=old.allocation_account_id
        and new.gross_transaction=old.gross_transaction
        and new.discount_transaction=old.discount_transaction
        and new.net_transaction=old.net_transaction
        and new.tax_transaction=old.tax_transaction
        and new.total_transaction=old.total_transaction
        and new.gross_base=old.gross_base
        and new.discount_base=old.discount_base
        and new.net_base=old.net_base
        and new.tax_base=old.tax_base
        and new.total_base=old.total_base
      );
      movement_link_only:=(
        old.product_id is not null and new.product_id=old.product_id
        and old.warehouse_id is not null and new.warehouse_id=old.warehouse_id
        and old.inventory_movement_id is null and new.inventory_movement_id is not null
        and new.id=old.id and new.business_id=old.business_id and new.bill_id=old.bill_id
        and new.line_number=old.line_number
        and new.description is not distinct from old.description
        and new.quantity is not distinct from old.quantity
        and new.unit_cost_transaction is not distinct from old.unit_cost_transaction
        and new.discount_percent is not distinct from old.discount_percent
        and new.tax_rate is not distinct from old.tax_rate
        and new.allocation_account_id=old.allocation_account_id
        and new.gross_transaction=old.gross_transaction
        and new.discount_transaction=old.discount_transaction
        and new.net_transaction=old.net_transaction
        and new.tax_transaction=old.tax_transaction
        and new.total_transaction=old.total_transaction
        and new.gross_base=old.gross_base
        and new.discount_base=old.discount_base
        and new.net_base=old.net_base
        and new.tax_base=old.tax_base
        and new.total_base=old.total_base
      );
      if inventory_link_only or movement_link_only then return new; end if;
    end if;
    raise exception 'Issued supplier bill lines are immutable.' using errcode='55000';
  end if;

  if tg_op='DELETE' then return old; end if;
  select exists(
    select 1 from public.business_chart_of_accounts account
    where account.id=new.allocation_account_id
      and account.business_id=new.business_id
      and account.is_active
      and (
        account.account_type='expense'
        or (account.account_type='asset' and account.system_key in(
          'inventory','prepaid_expenses','fixed_assets'
        ))
      )
  ) into allocation_valid;
  if not allocation_valid then
    raise exception 'Allocation account must be an active expense, inventory, prepaid, or fixed-asset account.'
      using errcode='23514';
  end if;
  select settings.rounding_scale into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id=new.business_id;
  if rounding_scale is null then raise exception 'Accounting settings are missing.' using errcode='23503'; end if;

  new.description:=btrim(new.description);
  new.gross_transaction:=round(new.quantity*new.unit_cost_transaction,rounding_scale);
  new.discount_transaction:=round(new.gross_transaction*(new.discount_percent/100),rounding_scale);
  new.net_transaction:=new.gross_transaction-new.discount_transaction;
  new.tax_transaction:=round(new.net_transaction*(new.tax_rate/100),rounding_scale);
  new.total_transaction:=new.net_transaction+new.tax_transaction;
  new.gross_base:=round(new.gross_transaction*bill_exchange_rate,rounding_scale);
  new.discount_base:=round(new.discount_transaction*bill_exchange_rate,rounding_scale);
  new.net_base:=new.gross_base-new.discount_base;
  new.tax_base:=round(new.tax_transaction*bill_exchange_rate,rounding_scale);
  new.total_base:=new.net_base+new.tax_base;
  return new;
end;
$$;
