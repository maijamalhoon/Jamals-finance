create index if not exists business_inventory_settings_default_warehouse_idx
  on public.business_inventory_settings(business_id,default_warehouse_id)
  where default_warehouse_id is not null;

create index if not exists business_products_revenue_account_idx
  on public.business_products(business_id,revenue_account_id);
create index if not exists business_products_inventory_account_idx
  on public.business_products(business_id,inventory_account_id);
create index if not exists business_products_cogs_account_idx
  on public.business_products(business_id,cogs_account_id);
create index if not exists business_products_created_by_idx
  on public.business_products(created_by);
create index if not exists business_warehouses_created_by_idx
  on public.business_warehouses(created_by);

create index if not exists business_sales_invoice_lines_product_idx
  on public.business_sales_invoice_lines(business_id,product_id)
  where product_id is not null;
create index if not exists business_sales_invoice_lines_warehouse_idx
  on public.business_sales_invoice_lines(business_id,warehouse_id)
  where warehouse_id is not null;
create index if not exists business_sales_invoice_lines_inventory_movement_idx
  on public.business_sales_invoice_lines(business_id,inventory_movement_id)
  where inventory_movement_id is not null;
create index if not exists business_sales_invoices_cogs_journal_idx
  on public.business_sales_invoices(business_id,cogs_journal_entry_id)
  where cogs_journal_entry_id is not null;

create index if not exists business_supplier_bill_lines_product_idx
  on public.business_supplier_bill_lines(business_id,product_id)
  where product_id is not null;
create index if not exists business_supplier_bill_lines_warehouse_idx
  on public.business_supplier_bill_lines(business_id,warehouse_id)
  where warehouse_id is not null;
create index if not exists business_supplier_bill_lines_inventory_movement_idx
  on public.business_supplier_bill_lines(business_id,inventory_movement_id)
  where inventory_movement_id is not null;

create index if not exists business_stock_movements_warehouse_idx
  on public.business_stock_movements(business_id,warehouse_id);
create index if not exists business_stock_movements_journal_idx
  on public.business_stock_movements(business_id,journal_entry_id)
  where journal_entry_id is not null;
create index if not exists business_stock_movements_created_by_idx
  on public.business_stock_movements(created_by);
