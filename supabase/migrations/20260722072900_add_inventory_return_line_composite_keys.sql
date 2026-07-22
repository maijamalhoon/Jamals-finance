-- Composite tenant keys required by return-line foreign keys.
create unique index if not exists business_sales_invoice_lines_business_id_id_idx
  on public.business_sales_invoice_lines(business_id,id);

create unique index if not exists business_supplier_bill_lines_business_id_id_idx
  on public.business_supplier_bill_lines(business_id,id);
