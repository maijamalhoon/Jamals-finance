alter table public.business_sales_invoices
  drop constraint if exists business_sales_invoices_amounts_check;

alter table public.business_sales_invoices
  add constraint business_sales_invoices_amounts_check check (
    subtotal_transaction >= 0
    and discount_transaction >= 0
    and discount_transaction <= subtotal_transaction
    and tax_transaction >= 0
    and total_transaction = subtotal_transaction - discount_transaction + tax_transaction
    and paid_transaction >= 0
    and paid_transaction <= total_transaction
    and subtotal_base >= 0
    and discount_base >= 0
    and tax_base >= 0
    and total_base >= 0
    and paid_base >= 0
    and paid_base <= total_base
    and (
      (status = 'draft' and total_transaction >= 0 and total_base >= 0)
      or (status <> 'draft' and total_transaction > 0 and total_base > 0)
    )
  );

create or replace function private.normalize_business_sales_invoice_draft()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'draft'
    and new.subtotal_transaction = 0
    and new.discount_transaction = 0
    and new.tax_transaction = 0
    and new.total_transaction = 1
    and new.subtotal_base = 0
    and new.discount_base = 0
    and new.tax_base = 0
    and new.total_base = 1
  then
    new.total_transaction := 0;
    new.total_base := 0;
  end if;
  return new;
end;
$$;

revoke execute on function private.normalize_business_sales_invoice_draft()
  from public, anon, authenticated;

drop trigger if exists business_sales_invoices_normalize_draft
  on public.business_sales_invoices;
create trigger business_sales_invoices_normalize_draft
before insert on public.business_sales_invoices
for each row execute function private.normalize_business_sales_invoice_draft();

comment on function private.normalize_business_sales_invoice_draft() is
  'Starts atomic invoice creation at a mathematically valid zero draft before server-calculated lines are applied.';
