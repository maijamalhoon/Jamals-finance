-- Atomic purchase returns, supplier debit notes, refund receivables, and stock valuation differences.
create or replace function private.create_business_purchase_return_internal(
  p_business_id uuid,
  p_bill_id uuid,
  p_return_date date,
  p_lines jsonb,
  p_notes text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path to pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  existing_return_id uuid;
  created_return_id uuid;
  assigned_number bigint;
  assigned_code text;
  bill_record record;
  source_line record;
  line_item jsonb;
  line_number smallint:=0;
  source_line_id uuid;
  return_quantity numeric(24,6);
  selected_warehouse_id uuid;
  seen_source_lines uuid[]:='{}'::uuid[];
  prior_quantity numeric(24,6);
  prior_net_transaction numeric(24,6);
  prior_tax_transaction numeric(24,6);
  prior_net_base numeric(24,6);
  prior_tax_base numeric(24,6);
  remaining_quantity numeric(24,6);
  line_net_transaction numeric(24,6);
  line_tax_transaction numeric(24,6);
  line_total_transaction numeric(24,6);
  line_net_base numeric(24,6);
  line_tax_base numeric(24,6);
  line_total_base numeric(24,6);
  line_inventory_value numeric(24,6);
  line_variance numeric(24,6);
  created_return_line_id uuid;
  created_movement_id uuid;
  current_quantity numeric(24,6);
  current_value numeric(24,6);
  current_average numeric(24,6);
  new_quantity numeric(24,6);
  new_value numeric(24,6);
  total_net_transaction numeric(24,6):=0;
  total_tax_transaction numeric(24,6):=0;
  total_return_transaction numeric(24,6):=0;
  total_net_base numeric(24,6):=0;
  total_tax_base numeric(24,6):=0;
  total_return_base numeric(24,6):=0;
  bill_outstanding_base numeric(24,6);
  ap_debit_base numeric(24,6);
  supplier_receivable_base numeric(24,6);
  ap_account_id uuid;
  tax_account_id uuid;
  supplier_receivable_account_id uuid;
  gain_account_id uuid;
  loss_account_id uuid;
  journal_lines jsonb:='[]'::jsonb;
  grouped_record record;
  total_gain numeric(24,6);
  total_loss numeric(24,6);
  created_journal_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.business_members membership
    where membership.business_id=p_business_id
      and membership.user_id=current_user_id
      and membership.status='active'
      and (
        membership.role in('owner','admin','accountant','manager')
        or '*'=any(membership.permissions)
        or 'purchases.manage'=any(membership.permissions)
        or 'purchases.return'=any(membership.permissions)
      )
  ) then
    raise exception 'Purchase return permission required.' using errcode='42501';
  end if;
  if p_return_date is null then
    raise exception 'Purchase return date is required.' using errcode='22004';
  end if;
  if p_idempotency_key is not null then
    select purchase_return.id into existing_return_id
    from public.business_purchase_returns purchase_return
    where purchase_return.business_id=p_business_id
      and purchase_return.idempotency_key=nullif(btrim(p_idempotency_key),'');
    if existing_return_id is not null then return existing_return_id; end if;
  end if;

  select bill.* into bill_record
  from public.business_supplier_bills bill
  where bill.business_id=p_business_id
    and bill.id=p_bill_id
    and bill.status in('issued','partially_paid','paid')
  for update;
  if not found then
    raise exception 'Issued supplier bill not found.' using errcode='P0002';
  end if;
  if p_return_date<bill_record.bill_date then
    raise exception 'Purchase return date cannot be before the supplier bill date.' using errcode='22008';
  end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>100 then
    raise exception 'Purchase returns require 1 to 100 supplier bill lines.' using errcode='22023';
  end if;

  select account.id into ap_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='accounts_payable' and account.is_active;
  select account.id into tax_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='tax_recoverable' and account.is_active;
  select account.id into supplier_receivable_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='supplier_refunds_receivable' and account.is_active;
  select account.id into gain_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='inventory_adjustment_gain' and account.is_active;
  select account.id into loss_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='inventory_adjustment_loss' and account.is_active;
  if ap_account_id is null or tax_account_id is null or supplier_receivable_account_id is null
     or gain_account_id is null or loss_account_id is null then
    raise exception 'Purchase return clearing accounts are missing.' using errcode='23503';
  end if;

  assigned_number:=private.next_business_inventory_operation_number(p_business_id,'purchase_return');
  assigned_code:='PRN-'||lpad(assigned_number::text,6,'0');
  insert into public.business_purchase_returns(
    business_id,return_number,return_code,bill_id,supplier_id,return_date,
    status,currency,exchange_rate,notes,idempotency_key,created_by
  ) values(
    p_business_id,assigned_number,assigned_code,p_bill_id,bill_record.supplier_id,p_return_date,
    'draft',bill_record.currency,bill_record.exchange_rate,
    nullif(btrim(coalesce(p_notes,'')),''),nullif(btrim(coalesce(p_idempotency_key,'')),''),current_user_id
  ) returning id into created_return_id;

  for line_item in select value from jsonb_array_elements(p_lines)
  loop
    line_number:=line_number+1;
    begin
      source_line_id:=(line_item->>'bill_line_id')::uuid;
      return_quantity:=coalesce(nullif(line_item->>'quantity','')::numeric,0);
      selected_warehouse_id:=nullif(line_item->>'warehouse_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'Purchase return lines contain invalid source, quantity, or warehouse values.' using errcode='22023';
    end;
    if return_quantity<=0 then
      raise exception 'Purchase return quantity must be greater than zero.' using errcode='22023';
    end if;
    if source_line_id=any(seen_source_lines) then
      raise exception 'A supplier bill line can appear only once per purchase return.' using errcode='23505';
    end if;
    seen_source_lines:=array_append(seen_source_lines,source_line_id);

    select bill_line.* into source_line
    from public.business_supplier_bill_lines bill_line
    where bill_line.business_id=p_business_id
      and bill_line.bill_id=p_bill_id
      and bill_line.id=source_line_id
    for update;
    if not found then
      raise exception 'Supplier bill line not found for this company bill.' using errcode='P0002';
    end if;

    select
      coalesce(sum(return_line.quantity),0),
      coalesce(sum(return_line.net_transaction),0),
      coalesce(sum(return_line.tax_transaction),0),
      coalesce(sum(return_line.net_base),0),
      coalesce(sum(return_line.tax_base),0)
    into prior_quantity,prior_net_transaction,prior_tax_transaction,prior_net_base,prior_tax_base
    from public.business_purchase_return_lines return_line
    join public.business_purchase_returns purchase_return
      on purchase_return.business_id=return_line.business_id and purchase_return.id=return_line.return_id
    where return_line.business_id=p_business_id
      and return_line.bill_line_id=source_line_id
      and purchase_return.status='posted';

    remaining_quantity:=source_line.quantity-prior_quantity;
    if return_quantity>remaining_quantity or remaining_quantity<=0 then
      raise exception 'Purchase return quantity exceeds the unreturned bill quantity.' using errcode='22023';
    end if;
    if return_quantity=remaining_quantity then
      line_net_transaction:=source_line.net_transaction-prior_net_transaction;
      line_tax_transaction:=source_line.tax_transaction-prior_tax_transaction;
      line_net_base:=source_line.net_base-prior_net_base;
      line_tax_base:=source_line.tax_base-prior_tax_base;
    else
      line_net_transaction:=round(source_line.net_transaction*return_quantity/source_line.quantity,6);
      line_tax_transaction:=round(source_line.tax_transaction*return_quantity/source_line.quantity,6);
      line_net_base:=round(source_line.net_base*return_quantity/source_line.quantity,6);
      line_tax_base:=round(source_line.tax_base*return_quantity/source_line.quantity,6);
    end if;
    line_total_transaction:=line_net_transaction+line_tax_transaction;
    line_total_base:=line_net_base+line_tax_base;

    if source_line.product_id is null then
      selected_warehouse_id:=null;
      line_inventory_value:=0;
      line_variance:=0;
    else
      selected_warehouse_id:=coalesce(selected_warehouse_id,source_line.warehouse_id);
      if not exists(
        select 1 from public.business_warehouses warehouse
        where warehouse.business_id=p_business_id
          and warehouse.id=selected_warehouse_id
          and warehouse.status='active'
      ) then
        raise exception 'Active purchase return warehouse not found.' using errcode='P0002';
      end if;
      insert into public.business_inventory_balances(business_id,product_id,warehouse_id)
      values(p_business_id,source_line.product_id,selected_warehouse_id)
      on conflict(business_id,product_id,warehouse_id) do nothing;
      select balance.quantity_on_hand,balance.inventory_value_base,balance.average_cost_base
      into current_quantity,current_value,current_average
      from public.business_inventory_balances balance
      where balance.business_id=p_business_id
        and balance.product_id=source_line.product_id
        and balance.warehouse_id=selected_warehouse_id
      for update;
      if return_quantity>current_quantity then
        raise exception 'Insufficient stock for purchase return.' using errcode='22023';
      end if;
      line_inventory_value:=case
        when return_quantity=current_quantity then current_value
        else round(current_average*return_quantity,6)
      end;
      line_variance:=line_net_base-line_inventory_value;
      new_quantity:=current_quantity-return_quantity;
      new_value:=case when new_quantity=0 then 0 else greatest(current_value-line_inventory_value,0) end;
      update public.business_inventory_balances balance
      set quantity_on_hand=new_quantity,
          inventory_value_base=new_value,
          average_cost_base=case when new_quantity=0 then 0 else current_average end,
          updated_at=now()
      where balance.business_id=p_business_id
        and balance.product_id=source_line.product_id
        and balance.warehouse_id=selected_warehouse_id;
    end if;

    insert into public.business_purchase_return_lines(
      business_id,return_id,line_number,bill_line_id,product_id,warehouse_id,quantity,
      net_transaction,tax_transaction,total_transaction,net_base,tax_base,total_base,
      inventory_value_base,variance_base
    ) values(
      p_business_id,created_return_id,line_number,source_line_id,source_line.product_id,selected_warehouse_id,
      return_quantity,line_net_transaction,line_tax_transaction,line_total_transaction,
      line_net_base,line_tax_base,line_total_base,line_inventory_value,line_variance
    ) returning id into created_return_line_id;

    if source_line.product_id is not null then
      insert into public.business_stock_movements(
        business_id,movement_number,movement_type,movement_date,product_id,warehouse_id,
        quantity,unit_cost_base,total_value_base,source_type,source_id,source_line_id,
        status,notes,created_by
      ) values(
        p_business_id,private.next_business_inventory_movement_number(p_business_id),'purchase_return',p_return_date,
        source_line.product_id,selected_warehouse_id,return_quantity,
        case when return_quantity=0 then 0 else round(line_inventory_value/return_quantity,6) end,
        line_inventory_value,'purchase_return',created_return_id,created_return_line_id,
        'draft','Stock returned to supplier',current_user_id
      ) returning id into created_movement_id;
      update public.business_purchase_return_lines return_line
      set movement_id=created_movement_id
      where return_line.business_id=p_business_id and return_line.id=created_return_line_id;
    end if;

    total_net_transaction:=total_net_transaction+line_net_transaction;
    total_tax_transaction:=total_tax_transaction+line_tax_transaction;
    total_return_transaction:=total_return_transaction+line_total_transaction;
    total_net_base:=total_net_base+line_net_base;
    total_tax_base:=total_tax_base+line_tax_base;
    total_return_base:=total_return_base+line_total_base;
  end loop;

  if total_return_base<=0 then
    raise exception 'Purchase return total must be greater than zero.' using errcode='22023';
  end if;
  bill_outstanding_base:=greatest(
    bill_record.total_base-bill_record.paid_base-bill_record.returned_base,
    0
  );
  ap_debit_base:=least(total_return_base,bill_outstanding_base);
  supplier_receivable_base:=total_return_base-ap_debit_base;
  update public.business_purchase_returns purchase_return
  set net_transaction=total_net_transaction,
      tax_transaction=total_tax_transaction,
      total_transaction=total_return_transaction,
      net_base=total_net_base,
      tax_base=total_tax_base,
      total_base=total_return_base,
      ap_debit_base=ap_debit_base,
      supplier_receivable_base=supplier_receivable_base,
      updated_at=now()
  where purchase_return.business_id=p_business_id and purchase_return.id=created_return_id;

  if ap_debit_base>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',ap_account_id,'debit',ap_debit_base,'credit',0,
      'description','Accounts payable reduced'
    ));
  end if;
  if supplier_receivable_base>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',supplier_receivable_account_id,'debit',supplier_receivable_base,'credit',0,
      'description','Supplier refund receivable'
    ));
  end if;
  if total_tax_base>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',tax_account_id,'debit',0,'credit',total_tax_base,
      'description','Recoverable tax reversed'
    ));
  end if;

  for grouped_record in
    select bill_line.allocation_account_id as account_id,
           sum(return_line.net_base)::numeric(24,6) as amount
    from public.business_purchase_return_lines return_line
    join public.business_supplier_bill_lines bill_line
      on bill_line.business_id=return_line.business_id and bill_line.id=return_line.bill_line_id
    where return_line.business_id=p_business_id
      and return_line.return_id=created_return_id
      and return_line.product_id is null
    group by bill_line.allocation_account_id
    order by bill_line.allocation_account_id
  loop
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',grouped_record.account_id,'debit',0,'credit',grouped_record.amount,
      'description','Supplier bill allocation reversed'
    ));
  end loop;

  for grouped_record in
    select product.inventory_account_id as account_id,
           sum(return_line.inventory_value_base)::numeric(24,6) as amount
    from public.business_purchase_return_lines return_line
    join public.business_products product
      on product.business_id=return_line.business_id and product.id=return_line.product_id
    where return_line.business_id=p_business_id
      and return_line.return_id=created_return_id
      and return_line.inventory_value_base>0
    group by product.inventory_account_id
    order by product.inventory_account_id
  loop
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',grouped_record.account_id,'debit',0,'credit',grouped_record.amount,
      'description','Inventory returned to supplier'
    ));
  end loop;

  select
    coalesce(sum(greatest(return_line.variance_base,0)),0),
    coalesce(sum(abs(least(return_line.variance_base,0))),0)
  into total_gain,total_loss
  from public.business_purchase_return_lines return_line
  where return_line.business_id=p_business_id and return_line.return_id=created_return_id;
  if total_gain>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',gain_account_id,'debit',0,'credit',total_gain,
      'description','Purchase return inventory gain'
    ));
  end if;
  if total_loss>0 then
    journal_lines:=journal_lines||jsonb_build_array(jsonb_build_object(
      'account_id',loss_account_id,'debit',total_loss,'credit',0,
      'description','Purchase return inventory loss'
    ));
  end if;

  created_journal_id:=private.post_business_inventory_operation_journal(
    p_business_id,p_return_date,'purchase_return',created_return_id,assigned_code,
    'Purchase return '||assigned_code,journal_lines,current_user_id
  );
  update public.business_stock_movements movement
  set journal_entry_id=created_journal_id,status='posted',posted_at=now()
  where movement.business_id=p_business_id
    and movement.source_type='purchase_return'
    and movement.source_id=created_return_id
    and movement.status='draft';
  update public.business_supplier_bills bill
  set returned_transaction=bill.returned_transaction+total_return_transaction,
      returned_base=bill.returned_base+total_return_base,
      updated_at=now()
  where bill.business_id=p_business_id and bill.id=p_bill_id;
  update public.business_purchase_returns purchase_return
  set status='posted',journal_entry_id=created_journal_id,posted_at=now(),updated_at=now()
  where purchase_return.business_id=p_business_id and purchase_return.id=created_return_id;
  return created_return_id;
end;
$$;

create or replace function public.create_business_purchase_return(
  p_business_id uuid,
  p_bill_id uuid,
  p_return_date date,
  p_lines jsonb default '[]'::jsonb,
  p_notes text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
set search_path to pg_catalog,public,private
as $$
begin
  return private.create_business_purchase_return_internal(
    p_business_id,p_bill_id,p_return_date,p_lines,p_notes,p_idempotency_key
  );
end;
$$;

revoke all on function public.create_business_purchase_return(uuid,uuid,date,jsonb,text,text)
  from public,anon;
grant execute on function public.create_business_purchase_return(uuid,uuid,date,jsonb,text,text)
  to authenticated,service_role;
revoke execute on function private.create_business_purchase_return_internal(uuid,uuid,date,jsonb,text,text)
  from public,anon,authenticated;
