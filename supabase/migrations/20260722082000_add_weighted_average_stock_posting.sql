create or replace function private.prepare_business_journal_line()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  target_entry_id uuid;
  entry_business_id uuid;
  entry_status text;
  entry_source_type text;
  entry_source_id uuid;
  entry_exchange_rate numeric(24,10);
  rounding_scale smallint;
  account_valid boolean;
  account_system_key text;
  invoice_total_base numeric(24,6);
  invoice_tax_base numeric(24,6);
  invoice_revenue_base numeric(24,6);
  invoice_revenue_and_tax_base numeric(24,6);
  first_revenue_account_id uuid;
  sales_payment_base numeric(24,6);
  supplier_bill_total_base numeric(24,6);
  supplier_bill_tax_base numeric(24,6);
  supplier_bill_allocation_base numeric(24,6);
  supplier_payment_base numeric(24,6);
begin
  target_entry_id:=case when tg_op='DELETE' then old.journal_entry_id else new.journal_entry_id end;
  select entry.business_id,entry.status,entry.source_type,entry.source_id,entry.exchange_rate
  into entry_business_id,entry_status,entry_source_type,entry_source_id,entry_exchange_rate
  from public.business_journal_entries entry
  where entry.id=target_entry_id for update;
  if not found then raise exception 'Journal entry does not exist.' using errcode='23503'; end if;
  if entry_status<>'draft' then raise exception 'Posted journal lines are immutable.' using errcode='55000'; end if;
  if tg_op='DELETE' then return old; end if;
  if new.business_id<>entry_business_id then
    raise exception 'Journal line tenant does not match its entry.' using errcode='23514';
  end if;

  select account.system_key,
    account.is_active and (
      (entry_source_type='manual' and account.allow_manual_posting)
      or (entry_source_type='sales_invoice' and account.system_key in(
        'accounts_receivable','sales_revenue','service_revenue','taxes_payable'
      ))
      or (entry_source_type='sales_payment' and account.system_key in(
        'cash','bank','accounts_receivable'
      ))
      or (entry_source_type='purchase_bill' and (
        account.system_key in('accounts_payable','tax_recoverable')
        or account.account_type='expense'
        or (account.account_type='asset' and account.system_key in(
          'inventory','prepaid_expenses','fixed_assets'
        ))
      ))
      or (entry_source_type='supplier_payment' and account.system_key in(
        'cash','bank','accounts_payable'
      ))
      or (entry_source_type='inventory_cogs' and exists(
        select 1
        from public.business_stock_movements movement
        join public.business_products product
          on product.business_id=movement.business_id
         and product.id=movement.product_id
        where movement.business_id=new.business_id
          and movement.source_type='sales_invoice'
          and movement.source_id=entry_source_id
          and movement.status='draft'
          and new.account_id in(product.inventory_account_id,product.cogs_account_id)
      ))
    )
  into account_system_key,account_valid
  from public.business_chart_of_accounts account
  where account.id=new.account_id and account.business_id=new.business_id;

  if not coalesce(account_valid,false) then
    raise exception 'Account is inactive, restricted, or invalid for this journal source.'
      using errcode='23514';
  end if;

  select settings.rounding_scale into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id=new.business_id;
  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode='23503';
  end if;

  if entry_source_type in('manual','inventory_cogs') then
    new.debit_base:=round(new.debit_transaction*entry_exchange_rate,rounding_scale);
    new.credit_base:=round(new.credit_transaction*entry_exchange_rate,rounding_scale);
    return new;
  end if;

  if entry_source_type='sales_invoice' then
    select invoice.total_base,invoice.tax_base
    into invoice_total_base,invoice_tax_base
    from public.business_sales_invoices invoice
    where invoice.id=entry_source_id
      and invoice.business_id=new.business_id
      and invoice.status='draft';
    if invoice_total_base is null then
      raise exception 'Sales invoice accounting source is unavailable.' using errcode='P0002';
    end if;
    if account_system_key='accounts_receivable' then
      new.debit_base:=invoice_total_base;new.credit_base:=0;return new;
    end if;
    if account_system_key='taxes_payable' then
      new.debit_base:=0;new.credit_base:=invoice_tax_base;return new;
    end if;
    select
      coalesce(sum(line.net_base) filter(where line.revenue_account_id=new.account_id),0),
      coalesce(sum(line.net_base),0)+invoice_tax_base,
      min(line.revenue_account_id::text)::uuid
    into invoice_revenue_base,invoice_revenue_and_tax_base,first_revenue_account_id
    from public.business_sales_invoice_lines line
    where line.business_id=new.business_id and line.invoice_id=entry_source_id;
    if new.account_id=first_revenue_account_id then
      invoice_revenue_base:=invoice_revenue_base+(invoice_total_base-invoice_revenue_and_tax_base);
    end if;
    new.debit_base:=0;new.credit_base:=invoice_revenue_base;return new;
  end if;

  if entry_source_type='sales_payment' then
    select payment.amount_base into sales_payment_base
    from public.business_sales_payments payment
    where payment.id=entry_source_id
      and payment.business_id=new.business_id
      and payment.status='draft';
    if sales_payment_base is null then
      raise exception 'Sales payment accounting source is unavailable.' using errcode='P0002';
    end if;
    if account_system_key in('cash','bank') then
      new.debit_base:=sales_payment_base;new.credit_base:=0;
    else
      new.debit_base:=0;new.credit_base:=sales_payment_base;
    end if;
    return new;
  end if;

  if entry_source_type='purchase_bill' then
    select bill.total_base,bill.tax_base
    into supplier_bill_total_base,supplier_bill_tax_base
    from public.business_supplier_bills bill
    where bill.id=entry_source_id
      and bill.business_id=new.business_id
      and bill.status='draft';
    if supplier_bill_total_base is null then
      raise exception 'Supplier bill accounting source is unavailable.' using errcode='P0002';
    end if;
    if account_system_key='accounts_payable' then
      new.debit_base:=0;new.credit_base:=supplier_bill_total_base;return new;
    end if;
    if account_system_key='tax_recoverable' then
      new.debit_base:=supplier_bill_tax_base;new.credit_base:=0;return new;
    end if;
    select coalesce(sum(line.net_base),0)
    into supplier_bill_allocation_base
    from public.business_supplier_bill_lines line
    where line.business_id=new.business_id
      and line.bill_id=entry_source_id
      and line.allocation_account_id=new.account_id;
    new.debit_base:=supplier_bill_allocation_base;new.credit_base:=0;return new;
  end if;

  if entry_source_type='supplier_payment' then
    select payment.amount_base into supplier_payment_base
    from public.business_supplier_payments payment
    where payment.id=entry_source_id
      and payment.business_id=new.business_id
      and payment.status='draft';
    if supplier_payment_base is null then
      raise exception 'Supplier payment accounting source is unavailable.' using errcode='P0002';
    end if;
    if account_system_key='accounts_payable' then
      new.debit_base:=supplier_payment_base;new.credit_base:=0;
    else
      new.debit_base:=0;new.credit_base:=supplier_payment_base;
    end if;
    return new;
  end if;

  raise exception 'Unsupported journal source.' using errcode='22023';
end;
$$;

create or replace function private.next_business_inventory_movement_number(p_business_id uuid)
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare assigned_number bigint;
begin
  update public.business_inventory_settings settings
  set next_movement_number=settings.next_movement_number+1,
      updated_at=now()
  where settings.business_id=p_business_id
  returning settings.next_movement_number-1 into assigned_number;
  if assigned_number is null then
    raise exception 'Inventory settings are missing.' using errcode='23503';
  end if;
  return assigned_number;
end;
$$;

create or replace function private.receive_supplier_bill_inventory(
  p_business_id uuid,
  p_bill_id uuid,
  p_journal_entry_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  line_record record;
  current_quantity numeric(24,6);
  current_value numeric(24,6);
  new_quantity numeric(24,6);
  new_value numeric(24,6);
  new_average numeric(24,6);
  movement_id uuid;
  movement_number bigint;
begin
  for line_record in
    select line.id,line.product_id,line.warehouse_id,line.quantity,line.net_base,
           product.inventory_account_id
    from public.business_supplier_bill_lines line
    join public.business_products product
      on product.business_id=line.business_id and product.id=line.product_id
    join public.business_warehouses warehouse
      on warehouse.business_id=line.business_id and warehouse.id=line.warehouse_id
    where line.business_id=p_business_id
      and line.bill_id=p_bill_id
      and line.product_id is not null
      and line.inventory_movement_id is null
      and product.status='active'
      and warehouse.status='active'
    order by line.line_number
  loop
    if not exists(
      select 1 from public.business_supplier_bill_lines line
      where line.id=line_record.id
        and line.business_id=p_business_id
        and line.allocation_account_id=line_record.inventory_account_id
    ) then
      raise exception 'Inventory bill lines must allocate to the product inventory account.'
        using errcode='23514';
    end if;

    insert into public.business_inventory_balances(
      business_id,product_id,warehouse_id
    ) values(
      p_business_id,line_record.product_id,line_record.warehouse_id
    ) on conflict(business_id,product_id,warehouse_id) do nothing;

    select balance.quantity_on_hand,balance.inventory_value_base
    into current_quantity,current_value
    from public.business_inventory_balances balance
    where balance.business_id=p_business_id
      and balance.product_id=line_record.product_id
      and balance.warehouse_id=line_record.warehouse_id
    for update;

    new_quantity:=current_quantity+line_record.quantity;
    new_value:=current_value+line_record.net_base;
    new_average:=case when new_quantity=0 then 0 else round(new_value/new_quantity,6) end;

    update public.business_inventory_balances balance
    set quantity_on_hand=new_quantity,
        inventory_value_base=new_value,
        average_cost_base=new_average,
        updated_at=now()
    where balance.business_id=p_business_id
      and balance.product_id=line_record.product_id
      and balance.warehouse_id=line_record.warehouse_id;

    movement_number:=private.next_business_inventory_movement_number(p_business_id);
    insert into public.business_stock_movements(
      business_id,movement_number,movement_type,movement_date,
      product_id,warehouse_id,quantity,unit_cost_base,total_value_base,
      source_type,source_id,source_line_id,journal_entry_id,
      status,notes,created_by,posted_at
    )
    select
      p_business_id,movement_number,'receipt',bill.bill_date,
      line_record.product_id,line_record.warehouse_id,line_record.quantity,
      case when line_record.quantity=0 then 0 else round(line_record.net_base/line_record.quantity,6) end,
      line_record.net_base,'supplier_bill',p_bill_id,line_record.id,p_journal_entry_id,
      'posted','Supplier bill stock receipt',p_user_id,now()
    from public.business_supplier_bills bill
    where bill.id=p_bill_id and bill.business_id=p_business_id
    returning id into movement_id;

    update public.business_supplier_bill_lines line
    set inventory_movement_id=movement_id,updated_at=now()
    where line.id=line_record.id and line.business_id=p_business_id;
  end loop;
end;
$$;

create or replace function private.post_inventory_cogs_journal(
  p_business_id uuid,
  p_invoice_id uuid,
  p_entry_date date,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  base_currency text;
  selected_period_id uuid;
  created_entry_id uuid;
  line_number smallint:=0;
  grouped_record record;
  total_cogs numeric(24,6);
begin
  select business.base_currency into base_currency
  from public.businesses business
  where business.id=p_business_id and business.status='active';
  if base_currency is null then raise exception 'Active business not found.' using errcode='P0002'; end if;

  select coalesce(sum(movement.total_value_base),0) into total_cogs
  from public.business_stock_movements movement
  where movement.business_id=p_business_id
    and movement.source_type='sales_invoice'
    and movement.source_id=p_invoice_id
    and movement.movement_type='issue'
    and movement.status='draft';
  if total_cogs<=0 then return null; end if;

  select period.id into selected_period_id
  from public.business_fiscal_periods period
  where period.business_id=p_business_id
    and period.status='open'
    and p_entry_date between period.starts_on and period.ends_on
  order by period.starts_on desc limit 1;
  if selected_period_id is null then
    raise exception 'No open fiscal period contains the COGS date.' using errcode='22008';
  end if;

  insert into public.business_journal_entries(
    business_id,entry_date,fiscal_period_id,source_type,source_id,
    reference,description,status,transaction_currency,exchange_rate,created_by
  )
  select p_business_id,p_entry_date,selected_period_id,'inventory_cogs',p_invoice_id,
         invoice.invoice_code,'Cost of goods sold for '||invoice.invoice_code,
         'draft',base_currency,1,p_user_id
  from public.business_sales_invoices invoice
  where invoice.id=p_invoice_id and invoice.business_id=p_business_id and invoice.status='draft'
  returning id into created_entry_id;
  if created_entry_id is null then
    raise exception 'Draft sales invoice is unavailable for COGS posting.' using errcode='P0002';
  end if;

  for grouped_record in
    select product.cogs_account_id as account_id,sum(movement.total_value_base)::numeric(24,6) as amount
    from public.business_stock_movements movement
    join public.business_products product
      on product.business_id=movement.business_id and product.id=movement.product_id
    where movement.business_id=p_business_id
      and movement.source_type='sales_invoice'
      and movement.source_id=p_invoice_id
      and movement.status='draft'
    group by product.cogs_account_id
    order by product.cogs_account_id
  loop
    line_number:=line_number+1;
    insert into public.business_journal_lines(
      business_id,journal_entry_id,line_number,account_id,description,
      debit_transaction,credit_transaction
    ) values(
      p_business_id,created_entry_id,line_number,grouped_record.account_id,
      'Cost of goods sold',grouped_record.amount,0
    );
  end loop;

  for grouped_record in
    select product.inventory_account_id as account_id,sum(movement.total_value_base)::numeric(24,6) as amount
    from public.business_stock_movements movement
    join public.business_products product
      on product.business_id=movement.business_id and product.id=movement.product_id
    where movement.business_id=p_business_id
      and movement.source_type='sales_invoice'
      and movement.source_id=p_invoice_id
      and movement.status='draft'
    group by product.inventory_account_id
    order by product.inventory_account_id
  loop
    line_number:=line_number+1;
    insert into public.business_journal_lines(
      business_id,journal_entry_id,line_number,account_id,description,
      debit_transaction,credit_transaction
    ) values(
      p_business_id,created_entry_id,line_number,grouped_record.account_id,
      'Inventory issued',0,grouped_record.amount
    );
  end loop;

  update public.business_journal_entries entry
  set status='posted'
  where entry.id=created_entry_id and entry.business_id=p_business_id;
  return created_entry_id;
end;
$$;

create or replace function private.issue_sales_invoice_inventory(
  p_business_id uuid,
  p_invoice_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  line_record record;
  current_quantity numeric(24,6);
  current_value numeric(24,6);
  average_cost numeric(24,6);
  issue_value numeric(24,6);
  new_quantity numeric(24,6);
  new_value numeric(24,6);
  movement_id uuid;
  movement_number bigint;
  cogs_journal_id uuid;
  invoice_date date;
  allow_negative boolean;
begin
  select invoice.invoice_date into invoice_date
  from public.business_sales_invoices invoice
  where invoice.id=p_invoice_id and invoice.business_id=p_business_id and invoice.status='draft';
  if invoice_date is null then
    raise exception 'Draft sales invoice is unavailable for stock issue.' using errcode='P0002';
  end if;
  select settings.allow_negative_stock into allow_negative
  from public.business_inventory_settings settings
  where settings.business_id=p_business_id;
  if allow_negative is null then raise exception 'Inventory settings are missing.' using errcode='23503'; end if;

  for line_record in
    select line.id,line.product_id,line.warehouse_id,line.quantity
    from public.business_sales_invoice_lines line
    join public.business_products product
      on product.business_id=line.business_id and product.id=line.product_id
    join public.business_warehouses warehouse
      on warehouse.business_id=line.business_id and warehouse.id=line.warehouse_id
    where line.business_id=p_business_id
      and line.invoice_id=p_invoice_id
      and line.product_id is not null
      and line.inventory_movement_id is null
      and product.status='active'
      and warehouse.status='active'
    order by line.line_number
  loop
    insert into public.business_inventory_balances(
      business_id,product_id,warehouse_id
    ) values(
      p_business_id,line_record.product_id,line_record.warehouse_id
    ) on conflict(business_id,product_id,warehouse_id) do nothing;

    select balance.quantity_on_hand,balance.inventory_value_base,balance.average_cost_base
    into current_quantity,current_value,average_cost
    from public.business_inventory_balances balance
    where balance.business_id=p_business_id
      and balance.product_id=line_record.product_id
      and balance.warehouse_id=line_record.warehouse_id
    for update;

    if not allow_negative and line_record.quantity>current_quantity then
      raise exception 'Insufficient stock for an invoice line.' using errcode='22023';
    end if;
    if line_record.quantity=current_quantity then
      issue_value:=current_value;
    else
      issue_value:=round(average_cost*line_record.quantity,6);
    end if;
    new_quantity:=current_quantity-line_record.quantity;
    new_value:=greatest(current_value-issue_value,0);

    update public.business_inventory_balances balance
    set quantity_on_hand=new_quantity,
        inventory_value_base=case when new_quantity=0 then 0 else new_value end,
        average_cost_base=case when new_quantity=0 then 0 else average_cost end,
        updated_at=now()
    where balance.business_id=p_business_id
      and balance.product_id=line_record.product_id
      and balance.warehouse_id=line_record.warehouse_id;

    movement_number:=private.next_business_inventory_movement_number(p_business_id);
    insert into public.business_stock_movements(
      business_id,movement_number,movement_type,movement_date,
      product_id,warehouse_id,quantity,unit_cost_base,total_value_base,
      source_type,source_id,source_line_id,status,notes,created_by
    ) values(
      p_business_id,movement_number,'issue',invoice_date,
      line_record.product_id,line_record.warehouse_id,line_record.quantity,
      average_cost,issue_value,'sales_invoice',p_invoice_id,line_record.id,
      'draft','Sales invoice stock issue',p_user_id
    ) returning id into movement_id;

    update public.business_sales_invoice_lines line
    set inventory_movement_id=movement_id,cogs_base=issue_value,updated_at=now()
    where line.id=line_record.id and line.business_id=p_business_id;
  end loop;

  cogs_journal_id:=private.post_inventory_cogs_journal(
    p_business_id,p_invoice_id,invoice_date,p_user_id
  );
  if cogs_journal_id is not null then
    update public.business_stock_movements movement
    set journal_entry_id=cogs_journal_id,status='posted',posted_at=now()
    where movement.business_id=p_business_id
      and movement.source_type='sales_invoice'
      and movement.source_id=p_invoice_id
      and movement.status='draft';
  end if;
  return cogs_journal_id;
end;
$$;

revoke execute on function private.next_business_inventory_movement_number(uuid) from public,anon,authenticated;
revoke execute on function private.receive_supplier_bill_inventory(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function private.post_inventory_cogs_journal(uuid,uuid,date,uuid) from public,anon,authenticated;
revoke execute on function private.issue_sales_invoice_inventory(uuid,uuid,uuid) from public,anon,authenticated;
