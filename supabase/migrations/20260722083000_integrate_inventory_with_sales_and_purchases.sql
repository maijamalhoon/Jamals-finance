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
  where invoice.id=p_invoice_id
    and invoice.business_id=p_business_id
    and invoice.status in('draft','issued')
    and invoice.cogs_journal_entry_id is null
  returning id into created_entry_id;
  if created_entry_id is null then
    raise exception 'Sales invoice is unavailable for COGS posting.' using errcode='P0002';
  end if;

  for grouped_record in
    select product.cogs_account_id as account_id,
           sum(movement.total_value_base)::numeric(24,6) as amount
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
    select product.inventory_account_id as account_id,
           sum(movement.total_value_base)::numeric(24,6) as amount
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
  where invoice.id=p_invoice_id
    and invoice.business_id=p_business_id
    and invoice.status in('draft','issued');
  if invoice_date is null then
    raise exception 'Sales invoice is unavailable for stock issue.' using errcode='P0002';
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
    insert into public.business_inventory_balances(business_id,product_id,warehouse_id)
    values(p_business_id,line_record.product_id,line_record.warehouse_id)
    on conflict(business_id,product_id,warehouse_id) do nothing;

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
    if line_record.quantity=current_quantity then issue_value:=current_value;
    else issue_value:=round(average_cost*line_record.quantity,6); end if;
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

create or replace function private.create_business_stock_sales_invoice_internal(
  p_business_id uuid,
  p_customer_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_currency text,
  p_exchange_rate numeric,
  p_notes text,
  p_lines jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  transformed_lines jsonb:='[]'::jsonb;
  line_item jsonb;
  transformed_line jsonb;
  line_index bigint;
  product_uuid uuid;
  warehouse_uuid uuid;
  product_revenue_account_id uuid;
  created_invoice_id uuid;
  existing_cogs_journal_id uuid;
  cogs_journal_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if jsonb_typeof(p_lines)<>'array' then raise exception 'Invoice lines must be an array.' using errcode='22023'; end if;

  for line_item,line_index in
    select value,ordinality from jsonb_array_elements(p_lines) with ordinality
  loop
    product_uuid:=null;warehouse_uuid:=null;product_revenue_account_id:=null;
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Inventory product or warehouse is invalid.' using errcode='22023';
    end;
    transformed_line:=line_item;
    if product_uuid is not null or warehouse_uuid is not null then
      if product_uuid is null or warehouse_uuid is null then
        raise exception 'Inventory lines require both product and warehouse.' using errcode='22023';
      end if;
      select product.revenue_account_id into product_revenue_account_id
      from public.business_products product
      join public.business_warehouses warehouse
        on warehouse.business_id=product.business_id and warehouse.id=warehouse_uuid
      where product.id=product_uuid
        and product.business_id=p_business_id
        and product.status='active'
        and warehouse.status='active';
      if product_revenue_account_id is null then
        raise exception 'Active inventory product or warehouse not found.' using errcode='P0002';
      end if;
      transformed_line:=transformed_line||jsonb_build_object(
        'revenue_account_id',product_revenue_account_id
      );
    end if;
    transformed_lines:=transformed_lines||jsonb_build_array(transformed_line);
  end loop;

  created_invoice_id:=public.create_business_sales_invoice(
    p_business_id,p_customer_id,p_invoice_date,p_due_date,p_currency,
    p_exchange_rate,p_notes,transformed_lines,p_idempotency_key
  );

  select invoice.cogs_journal_entry_id into existing_cogs_journal_id
  from public.business_sales_invoices invoice
  where invoice.id=created_invoice_id and invoice.business_id=p_business_id;
  if existing_cogs_journal_id is not null then return created_invoice_id; end if;

  for line_item,line_index in
    select value,ordinality from jsonb_array_elements(p_lines) with ordinality
  loop
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Inventory product or warehouse is invalid.' using errcode='22023';
    end;
    if product_uuid is not null then
      update public.business_sales_invoice_lines line
      set product_id=product_uuid,warehouse_id=warehouse_uuid,updated_at=now()
      where line.business_id=p_business_id
        and line.invoice_id=created_invoice_id
        and line.line_number=line_index;
    end if;
  end loop;

  cogs_journal_id:=private.issue_sales_invoice_inventory(
    p_business_id,created_invoice_id,current_user_id
  );
  if cogs_journal_id is not null then
    update public.business_sales_invoices invoice
    set cogs_journal_entry_id=cogs_journal_id,updated_at=now()
    where invoice.id=created_invoice_id and invoice.business_id=p_business_id;
  end if;
  return created_invoice_id;
end;
$$;

create or replace function public.create_business_stock_sales_invoice(
  p_business_id uuid,
  p_customer_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_currency text default null,
  p_exchange_rate numeric default 1,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public,private
as $$
begin
  return private.create_business_stock_sales_invoice_internal(
    p_business_id,p_customer_id,p_invoice_date,p_due_date,p_currency,
    p_exchange_rate,p_notes,p_lines,p_idempotency_key
  );
end;
$$;

create or replace function private.create_business_stock_supplier_bill_internal(
  p_business_id uuid,
  p_supplier_id uuid,
  p_bill_date date,
  p_due_date date,
  p_supplier_document_number text,
  p_currency text,
  p_exchange_rate numeric,
  p_notes text,
  p_lines jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  transformed_lines jsonb:='[]'::jsonb;
  line_item jsonb;
  transformed_line jsonb;
  line_index bigint;
  product_uuid uuid;
  warehouse_uuid uuid;
  product_inventory_account_id uuid;
  created_bill_id uuid;
  bill_journal_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if jsonb_typeof(p_lines)<>'array' then raise exception 'Supplier bill lines must be an array.' using errcode='22023'; end if;

  for line_item,line_index in
    select value,ordinality from jsonb_array_elements(p_lines) with ordinality
  loop
    product_uuid:=null;warehouse_uuid:=null;product_inventory_account_id:=null;
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Inventory product or warehouse is invalid.' using errcode='22023';
    end;
    transformed_line:=line_item;
    if product_uuid is not null or warehouse_uuid is not null then
      if product_uuid is null or warehouse_uuid is null then
        raise exception 'Inventory lines require both product and warehouse.' using errcode='22023';
      end if;
      select product.inventory_account_id into product_inventory_account_id
      from public.business_products product
      join public.business_warehouses warehouse
        on warehouse.business_id=product.business_id and warehouse.id=warehouse_uuid
      where product.id=product_uuid
        and product.business_id=p_business_id
        and product.status='active'
        and warehouse.status='active';
      if product_inventory_account_id is null then
        raise exception 'Active inventory product or warehouse not found.' using errcode='P0002';
      end if;
      transformed_line:=transformed_line||jsonb_build_object(
        'allocation_account_id',product_inventory_account_id
      );
    end if;
    transformed_lines:=transformed_lines||jsonb_build_array(transformed_line);
  end loop;

  created_bill_id:=public.create_business_supplier_bill(
    p_business_id,p_supplier_id,p_bill_date,p_due_date,p_supplier_document_number,
    p_currency,p_exchange_rate,p_notes,transformed_lines,p_idempotency_key
  );

  for line_item,line_index in
    select value,ordinality from jsonb_array_elements(p_lines) with ordinality
  loop
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Inventory product or warehouse is invalid.' using errcode='22023';
    end;
    if product_uuid is not null then
      update public.business_supplier_bill_lines line
      set product_id=product_uuid,warehouse_id=warehouse_uuid,updated_at=now()
      where line.business_id=p_business_id
        and line.bill_id=created_bill_id
        and line.line_number=line_index;
    end if;
  end loop;

  select bill.journal_entry_id into bill_journal_id
  from public.business_supplier_bills bill
  where bill.id=created_bill_id and bill.business_id=p_business_id;
  perform private.receive_supplier_bill_inventory(
    p_business_id,created_bill_id,bill_journal_id,current_user_id
  );
  return created_bill_id;
end;
$$;

create or replace function public.create_business_stock_supplier_bill(
  p_business_id uuid,
  p_supplier_id uuid,
  p_bill_date date,
  p_due_date date,
  p_supplier_document_number text default null,
  p_currency text default null,
  p_exchange_rate numeric default 1,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public,private
as $$
begin
  return private.create_business_stock_supplier_bill_internal(
    p_business_id,p_supplier_id,p_bill_date,p_due_date,p_supplier_document_number,
    p_currency,p_exchange_rate,p_notes,p_lines,p_idempotency_key
  );
end;
$$;

revoke execute on function private.create_business_stock_sales_invoice_internal(uuid,uuid,date,date,text,numeric,text,jsonb,text) from public,anon;
revoke execute on function private.create_business_stock_supplier_bill_internal(uuid,uuid,date,date,text,text,numeric,text,jsonb,text) from public,anon;
grant execute on function private.create_business_stock_sales_invoice_internal(uuid,uuid,date,date,text,numeric,text,jsonb,text) to authenticated;
grant execute on function private.create_business_stock_supplier_bill_internal(uuid,uuid,date,date,text,text,numeric,text,jsonb,text) to authenticated;
revoke execute on function public.create_business_stock_sales_invoice(uuid,uuid,date,date,text,numeric,text,jsonb,text) from public,anon;
revoke execute on function public.create_business_stock_supplier_bill(uuid,uuid,date,date,text,text,numeric,text,jsonb,text) from public,anon;
grant execute on function public.create_business_stock_sales_invoice(uuid,uuid,date,date,text,numeric,text,jsonb,text) to authenticated;
grant execute on function public.create_business_stock_supplier_bill(uuid,uuid,date,date,text,text,numeric,text,jsonb,text) to authenticated;
