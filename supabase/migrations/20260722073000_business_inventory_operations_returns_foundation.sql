-- Inventory operations and returns foundation.
-- Adds tenant-safe transfer, adjustment, sales return, and purchase return ledgers.

alter table public.business_inventory_settings
  add column if not exists next_transfer_number bigint not null default 1,
  add column if not exists next_adjustment_number bigint not null default 1,
  add column if not exists next_sales_return_number bigint not null default 1,
  add column if not exists next_purchase_return_number bigint not null default 1;

alter table public.business_inventory_settings
  drop constraint if exists business_inventory_settings_operation_sequences_check;
alter table public.business_inventory_settings
  add constraint business_inventory_settings_operation_sequences_check
  check (
    next_transfer_number > 0
    and next_adjustment_number > 0
    and next_sales_return_number > 0
    and next_purchase_return_number > 0
  );

alter table public.business_sales_invoices
  add column if not exists returned_transaction numeric(24,6) not null default 0,
  add column if not exists returned_base numeric(24,6) not null default 0;

alter table public.business_sales_invoices
  drop constraint if exists business_sales_invoices_returns_check;
alter table public.business_sales_invoices
  add constraint business_sales_invoices_returns_check
  check (
    returned_transaction >= 0
    and returned_transaction <= total_transaction
    and returned_base >= 0
    and returned_base <= total_base
  );

alter table public.business_supplier_bills
  add column if not exists returned_transaction numeric(24,6) not null default 0,
  add column if not exists returned_base numeric(24,6) not null default 0;

alter table public.business_supplier_bills
  drop constraint if exists business_supplier_bills_returns_check;
alter table public.business_supplier_bills
  add constraint business_supplier_bills_returns_check
  check (
    returned_transaction >= 0
    and returned_transaction <= total_transaction
    and returned_base >= 0
    and returned_base <= total_base
  );

alter table public.business_stock_movements
  drop constraint if exists business_stock_movements_movement_type_check;
alter table public.business_stock_movements
  add constraint business_stock_movements_movement_type_check
  check (
    movement_type in (
      'receipt',
      'issue',
      'transfer_out',
      'transfer_in',
      'adjustment_in',
      'adjustment_out',
      'sales_return',
      'purchase_return'
    )
  );

alter table public.business_stock_movements
  drop constraint if exists business_stock_movements_source_type_check;
alter table public.business_stock_movements
  add constraint business_stock_movements_source_type_check
  check (
    source_type in (
      'supplier_bill',
      'sales_invoice',
      'warehouse_transfer',
      'stock_adjustment',
      'sales_return',
      'purchase_return'
    )
  );

create table if not exists public.business_warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  transfer_number bigint not null,
  transfer_code text not null,
  transfer_date date not null,
  from_warehouse_id uuid not null,
  to_warehouse_id uuid not null,
  status text not null default 'draft',
  notes text,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, transfer_number),
  unique (business_id, transfer_code),
  foreign key (business_id, from_warehouse_id)
    references public.business_warehouses(business_id, id) on delete restrict,
  foreign key (business_id, to_warehouse_id)
    references public.business_warehouses(business_id, id) on delete restrict,
  check (transfer_number > 0),
  check (char_length(btrim(transfer_code)) between 3 and 40),
  check (from_warehouse_id <> to_warehouse_id),
  check (status in ('draft','posted')),
  check (
    (status='draft' and posted_at is null)
    or (status='posted' and posted_at is not null)
  ),
  check (notes is null or char_length(notes) <= 2000),
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 160)
);

create unique index if not exists business_warehouse_transfers_idempotency_idx
  on public.business_warehouse_transfers(business_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists business_warehouse_transfers_business_date_idx
  on public.business_warehouse_transfers(business_id,transfer_date desc,transfer_number desc);
create index if not exists business_warehouse_transfers_from_idx
  on public.business_warehouse_transfers(business_id,from_warehouse_id);
create index if not exists business_warehouse_transfers_to_idx
  on public.business_warehouse_transfers(business_id,to_warehouse_id);
create index if not exists business_warehouse_transfers_created_by_idx
  on public.business_warehouse_transfers(created_by);

create table if not exists public.business_warehouse_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  transfer_id uuid not null,
  line_number smallint not null,
  product_id uuid not null,
  quantity numeric(24,6) not null,
  unit_cost_base numeric(24,6) not null,
  total_value_base numeric(24,6) not null,
  out_movement_id uuid,
  in_movement_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, transfer_id, line_number),
  unique (business_id, transfer_id, product_id),
  foreign key (business_id, transfer_id)
    references public.business_warehouse_transfers(business_id,id) on delete cascade,
  foreign key (business_id, product_id)
    references public.business_products(business_id,id) on delete restrict,
  foreign key (business_id, out_movement_id)
    references public.business_stock_movements(business_id,id) on delete restrict,
  foreign key (business_id, in_movement_id)
    references public.business_stock_movements(business_id,id) on delete restrict,
  check (line_number > 0),
  check (quantity > 0),
  check (unit_cost_base >= 0),
  check (total_value_base >= 0),
  check (
    (out_movement_id is null and in_movement_id is null)
    or (out_movement_id is not null and in_movement_id is not null)
  )
);

create index if not exists business_warehouse_transfer_lines_product_idx
  on public.business_warehouse_transfer_lines(business_id,product_id);
create index if not exists business_warehouse_transfer_lines_out_movement_idx
  on public.business_warehouse_transfer_lines(business_id,out_movement_id);
create index if not exists business_warehouse_transfer_lines_in_movement_idx
  on public.business_warehouse_transfer_lines(business_id,in_movement_id);

create table if not exists public.business_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  adjustment_number bigint not null,
  adjustment_code text not null,
  adjustment_date date not null,
  warehouse_id uuid not null,
  reason text not null,
  status text not null default 'draft',
  journal_entry_id uuid,
  notes text,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,adjustment_number),
  unique (business_id,adjustment_code),
  foreign key (business_id,warehouse_id)
    references public.business_warehouses(business_id,id) on delete restrict,
  foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  check (adjustment_number > 0),
  check (char_length(btrim(adjustment_code)) between 3 and 40),
  check (char_length(btrim(reason)) between 2 and 300),
  check (status in ('draft','posted')),
  check (
    (status='draft' and journal_entry_id is null and posted_at is null)
    or (status='posted' and journal_entry_id is not null and posted_at is not null)
  ),
  check (notes is null or char_length(notes) <= 2000),
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 160)
);

create unique index if not exists business_stock_adjustments_idempotency_idx
  on public.business_stock_adjustments(business_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists business_stock_adjustments_business_date_idx
  on public.business_stock_adjustments(business_id,adjustment_date desc,adjustment_number desc);
create index if not exists business_stock_adjustments_warehouse_idx
  on public.business_stock_adjustments(business_id,warehouse_id);
create index if not exists business_stock_adjustments_journal_idx
  on public.business_stock_adjustments(business_id,journal_entry_id);
create index if not exists business_stock_adjustments_created_by_idx
  on public.business_stock_adjustments(created_by);

create table if not exists public.business_stock_adjustment_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  adjustment_id uuid not null,
  line_number smallint not null,
  product_id uuid not null,
  system_quantity numeric(24,6) not null,
  counted_quantity numeric(24,6) not null,
  quantity_delta numeric(24,6) not null,
  unit_cost_base numeric(24,6) not null,
  value_change_base numeric(24,6) not null,
  movement_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,adjustment_id,line_number),
  unique (business_id,adjustment_id,product_id),
  foreign key (business_id,adjustment_id)
    references public.business_stock_adjustments(business_id,id) on delete cascade,
  foreign key (business_id,product_id)
    references public.business_products(business_id,id) on delete restrict,
  foreign key (business_id,movement_id)
    references public.business_stock_movements(business_id,id) on delete restrict,
  check (line_number > 0),
  check (system_quantity >= 0),
  check (counted_quantity >= 0),
  check (quantity_delta = counted_quantity - system_quantity),
  check (quantity_delta <> 0),
  check (unit_cost_base >= 0),
  check (value_change_base >= 0)
);

create index if not exists business_stock_adjustment_lines_product_idx
  on public.business_stock_adjustment_lines(business_id,product_id);
create index if not exists business_stock_adjustment_lines_movement_idx
  on public.business_stock_adjustment_lines(business_id,movement_id);

create table if not exists public.business_sales_returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_number bigint not null,
  return_code text not null,
  invoice_id uuid not null,
  customer_id uuid not null,
  return_date date not null,
  status text not null default 'draft',
  currency text not null,
  exchange_rate numeric(24,10) not null,
  net_transaction numeric(24,6) not null default 0,
  tax_transaction numeric(24,6) not null default 0,
  total_transaction numeric(24,6) not null default 0,
  net_base numeric(24,6) not null default 0,
  tax_base numeric(24,6) not null default 0,
  total_base numeric(24,6) not null default 0,
  ar_credit_base numeric(24,6) not null default 0,
  customer_credit_base numeric(24,6) not null default 0,
  journal_entry_id uuid,
  notes text,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,return_number),
  unique (business_id,return_code),
  foreign key (business_id,invoice_id)
    references public.business_sales_invoices(business_id,id) on delete restrict,
  foreign key (business_id,customer_id)
    references public.business_contacts(business_id,id) on delete restrict,
  foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  check (return_number > 0),
  check (char_length(btrim(return_code)) between 3 and 40),
  check (public.is_supported_financial_currency(currency)),
  check (exchange_rate > 0),
  check (
    net_transaction >= 0
    and tax_transaction >= 0
    and total_transaction = net_transaction + tax_transaction
    and net_base >= 0
    and tax_base >= 0
    and total_base = net_base + tax_base
    and ar_credit_base >= 0
    and customer_credit_base >= 0
    and ar_credit_base + customer_credit_base = total_base
  ),
  check (status in ('draft','posted')),
  check (
    (status='draft' and journal_entry_id is null and posted_at is null)
    or (
      status='posted'
      and journal_entry_id is not null
      and posted_at is not null
      and total_transaction > 0
      and total_base > 0
    )
  ),
  check (notes is null or char_length(notes) <= 2000),
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 160)
);

create unique index if not exists business_sales_returns_idempotency_idx
  on public.business_sales_returns(business_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists business_sales_returns_business_date_idx
  on public.business_sales_returns(business_id,return_date desc,return_number desc);
create index if not exists business_sales_returns_invoice_idx
  on public.business_sales_returns(business_id,invoice_id);
create index if not exists business_sales_returns_customer_idx
  on public.business_sales_returns(business_id,customer_id);
create index if not exists business_sales_returns_journal_idx
  on public.business_sales_returns(business_id,journal_entry_id);
create index if not exists business_sales_returns_created_by_idx
  on public.business_sales_returns(created_by);

create table if not exists public.business_sales_return_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_id uuid not null,
  line_number smallint not null,
  invoice_line_id uuid not null,
  product_id uuid,
  warehouse_id uuid,
  quantity numeric(24,6) not null,
  restock boolean not null default true,
  net_transaction numeric(24,6) not null,
  tax_transaction numeric(24,6) not null,
  total_transaction numeric(24,6) not null,
  net_base numeric(24,6) not null,
  tax_base numeric(24,6) not null,
  total_base numeric(24,6) not null,
  cogs_base numeric(24,6) not null default 0,
  movement_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,return_id,line_number),
  unique (business_id,return_id,invoice_line_id),
  foreign key (business_id,return_id)
    references public.business_sales_returns(business_id,id) on delete cascade,
  foreign key (business_id,invoice_line_id)
    references public.business_sales_invoice_lines(business_id,id) on delete restrict,
  foreign key (business_id,product_id)
    references public.business_products(business_id,id) on delete restrict,
  foreign key (business_id,warehouse_id)
    references public.business_warehouses(business_id,id) on delete restrict,
  foreign key (business_id,movement_id)
    references public.business_stock_movements(business_id,id) on delete restrict,
  check (line_number > 0),
  check (quantity > 0),
  check (
    net_transaction >= 0
    and tax_transaction >= 0
    and total_transaction = net_transaction + tax_transaction
    and total_transaction > 0
    and net_base >= 0
    and tax_base >= 0
    and total_base = net_base + tax_base
    and total_base > 0
    and cogs_base >= 0
  ),
  check (
    (product_id is null and warehouse_id is null and restock=false and movement_id is null and cogs_base=0)
    or (
      product_id is not null
      and (
        (restock=true and warehouse_id is not null)
        or (restock=false and warehouse_id is null and movement_id is null and cogs_base=0)
      )
    )
  )
);

create index if not exists business_sales_return_lines_invoice_line_idx
  on public.business_sales_return_lines(business_id,invoice_line_id);
create index if not exists business_sales_return_lines_product_idx
  on public.business_sales_return_lines(business_id,product_id);
create index if not exists business_sales_return_lines_warehouse_idx
  on public.business_sales_return_lines(business_id,warehouse_id);
create index if not exists business_sales_return_lines_movement_idx
  on public.business_sales_return_lines(business_id,movement_id);

create table if not exists public.business_purchase_returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_number bigint not null,
  return_code text not null,
  bill_id uuid not null,
  supplier_id uuid not null,
  return_date date not null,
  status text not null default 'draft',
  currency text not null,
  exchange_rate numeric(24,10) not null,
  net_transaction numeric(24,6) not null default 0,
  tax_transaction numeric(24,6) not null default 0,
  total_transaction numeric(24,6) not null default 0,
  net_base numeric(24,6) not null default 0,
  tax_base numeric(24,6) not null default 0,
  total_base numeric(24,6) not null default 0,
  ap_debit_base numeric(24,6) not null default 0,
  supplier_receivable_base numeric(24,6) not null default 0,
  journal_entry_id uuid,
  notes text,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,return_number),
  unique (business_id,return_code),
  foreign key (business_id,bill_id)
    references public.business_supplier_bills(business_id,id) on delete restrict,
  foreign key (business_id,supplier_id)
    references public.business_contacts(business_id,id) on delete restrict,
  foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  check (return_number > 0),
  check (char_length(btrim(return_code)) between 3 and 40),
  check (public.is_supported_financial_currency(currency)),
  check (exchange_rate > 0),
  check (
    net_transaction >= 0
    and tax_transaction >= 0
    and total_transaction = net_transaction + tax_transaction
    and net_base >= 0
    and tax_base >= 0
    and total_base = net_base + tax_base
    and ap_debit_base >= 0
    and supplier_receivable_base >= 0
    and ap_debit_base + supplier_receivable_base = total_base
  ),
  check (status in ('draft','posted')),
  check (
    (status='draft' and journal_entry_id is null and posted_at is null)
    or (
      status='posted'
      and journal_entry_id is not null
      and posted_at is not null
      and total_transaction > 0
      and total_base > 0
    )
  ),
  check (notes is null or char_length(notes) <= 2000),
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 160)
);

create unique index if not exists business_purchase_returns_idempotency_idx
  on public.business_purchase_returns(business_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists business_purchase_returns_business_date_idx
  on public.business_purchase_returns(business_id,return_date desc,return_number desc);
create index if not exists business_purchase_returns_bill_idx
  on public.business_purchase_returns(business_id,bill_id);
create index if not exists business_purchase_returns_supplier_idx
  on public.business_purchase_returns(business_id,supplier_id);
create index if not exists business_purchase_returns_journal_idx
  on public.business_purchase_returns(business_id,journal_entry_id);
create index if not exists business_purchase_returns_created_by_idx
  on public.business_purchase_returns(created_by);

create table if not exists public.business_purchase_return_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_id uuid not null,
  line_number smallint not null,
  bill_line_id uuid not null,
  product_id uuid,
  warehouse_id uuid,
  quantity numeric(24,6) not null,
  net_transaction numeric(24,6) not null,
  tax_transaction numeric(24,6) not null,
  total_transaction numeric(24,6) not null,
  net_base numeric(24,6) not null,
  tax_base numeric(24,6) not null,
  total_base numeric(24,6) not null,
  inventory_value_base numeric(24,6) not null default 0,
  variance_base numeric(24,6) not null default 0,
  movement_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,return_id,line_number),
  unique (business_id,return_id,bill_line_id),
  foreign key (business_id,return_id)
    references public.business_purchase_returns(business_id,id) on delete cascade,
  foreign key (business_id,bill_line_id)
    references public.business_supplier_bill_lines(business_id,id) on delete restrict,
  foreign key (business_id,product_id)
    references public.business_products(business_id,id) on delete restrict,
  foreign key (business_id,warehouse_id)
    references public.business_warehouses(business_id,id) on delete restrict,
  foreign key (business_id,movement_id)
    references public.business_stock_movements(business_id,id) on delete restrict,
  check (line_number > 0),
  check (quantity > 0),
  check (
    net_transaction >= 0
    and tax_transaction >= 0
    and total_transaction = net_transaction + tax_transaction
    and total_transaction > 0
    and net_base >= 0
    and tax_base >= 0
    and total_base = net_base + tax_base
    and total_base > 0
    and inventory_value_base >= 0
  ),
  check (
    (product_id is null and warehouse_id is null and movement_id is null and inventory_value_base=0 and variance_base=0)
    or (product_id is not null and warehouse_id is not null)
  )
);

create index if not exists business_purchase_return_lines_bill_line_idx
  on public.business_purchase_return_lines(business_id,bill_line_id);
create index if not exists business_purchase_return_lines_product_idx
  on public.business_purchase_return_lines(business_id,product_id);
create index if not exists business_purchase_return_lines_warehouse_idx
  on public.business_purchase_return_lines(business_id,warehouse_id);
create index if not exists business_purchase_return_lines_movement_idx
  on public.business_purchase_return_lines(business_id,movement_id);

create or replace function private.ensure_business_inventory_operation_accounts(
  p_business_id uuid,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1
    from public.businesses business
    where business.id=p_business_id
      and business.owner_user_id=p_owner_id
      and business.status='active'
  ) then
    raise exception 'Business owner verification failed.' using errcode='42501';
  end if;

  insert into public.business_chart_of_accounts(
    business_id,code,name,account_type,account_subtype,normal_balance,
    system_key,allow_manual_posting,created_by
  ) values
    (p_business_id,'1250','Supplier refunds receivable','asset','receivable','debit',
      'supplier_refunds_receivable',false,p_owner_id),
    (p_business_id,'2150','Customer credits','liability','customer_credit','credit',
      'customer_credits',false,p_owner_id),
    (p_business_id,'4300','Inventory adjustment gains','revenue','other_income','credit',
      'inventory_adjustment_gain',false,p_owner_id),
    (p_business_id,'6950','Inventory adjustment losses','expense','other_expense','debit',
      'inventory_adjustment_loss',false,p_owner_id)
  on conflict(business_id,code) do update
  set name=excluded.name,
      account_type=excluded.account_type,
      account_subtype=excluded.account_subtype,
      normal_balance=excluded.normal_balance,
      system_key=excluded.system_key,
      allow_manual_posting=excluded.allow_manual_posting,
      updated_at=now();
end;
$$;

create or replace function private.ensure_business_inventory_operation_accounts_on_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.role='owner' and new.status='active' then
    perform private.ensure_business_inventory_operation_accounts(new.business_id,new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists business_members_initialize_inventory_operations
  on public.business_members;
create trigger business_members_initialize_inventory_operations
after insert on public.business_members
for each row execute function private.ensure_business_inventory_operation_accounts_on_owner();

do $$
declare owner_record record;
begin
  for owner_record in
    select business.id as business_id,business.owner_user_id
    from public.businesses business
    where business.status='active'
  loop
    perform private.ensure_business_inventory_operation_accounts(
      owner_record.business_id,
      owner_record.owner_user_id
    );
  end loop;
end;
$$;

alter table public.business_warehouse_transfers enable row level security;
alter table public.business_warehouse_transfer_lines enable row level security;
alter table public.business_stock_adjustments enable row level security;
alter table public.business_stock_adjustment_lines enable row level security;
alter table public.business_sales_returns enable row level security;
alter table public.business_sales_return_lines enable row level security;
alter table public.business_purchase_returns enable row level security;
alter table public.business_purchase_return_lines enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'business_warehouse_transfers',
    'business_warehouse_transfer_lines',
    'business_stock_adjustments',
    'business_stock_adjustment_lines',
    'business_sales_returns',
    'business_sales_return_lines',
    'business_purchase_returns',
    'business_purchase_return_lines'
  ]
  loop
    execute format('drop policy if exists %I_select_member on public.%I',table_name,table_name);
    execute format(
      'create policy %I_select_member on public.%I for select to authenticated using (
        exists (
          select 1 from public.business_members membership
          where membership.business_id=%I.business_id
            and membership.user_id=(select auth.uid())
            and membership.status=''active''
        )
      )',
      table_name,table_name,table_name
    );
    execute format('revoke all on table public.%I from anon,authenticated',table_name);
    execute format('grant select on table public.%I to authenticated',table_name);
    execute format('grant all on table public.%I to service_role',table_name);
  end loop;
end;
$$;

revoke execute on function private.ensure_business_inventory_operation_accounts(uuid,uuid)
  from public,anon,authenticated;
revoke execute on function private.ensure_business_inventory_operation_accounts_on_owner()
  from public,anon,authenticated;
