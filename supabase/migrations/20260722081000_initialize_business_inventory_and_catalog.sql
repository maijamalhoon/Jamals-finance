create or replace function private.initialize_business_inventory(
  p_business_id uuid,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_default_warehouse_id uuid;
begin
  if not exists (
    select 1 from public.businesses business
    where business.id=p_business_id
      and business.owner_user_id=p_owner_id
      and business.status='active'
  ) then
    raise exception 'Business owner verification failed.' using errcode='42501';
  end if;

  insert into public.business_inventory_settings(business_id)
  values(p_business_id)
  on conflict(business_id) do nothing;

  select warehouse.id into v_default_warehouse_id
  from public.business_warehouses warehouse
  where warehouse.business_id=p_business_id
    and warehouse.is_default
    and warehouse.status='active'
  order by warehouse.created_at
  limit 1;

  if v_default_warehouse_id is null then
    insert into public.business_warehouses(
      business_id,code,name,status,is_default,created_by
    ) values(
      p_business_id,'MAIN','Main warehouse','active',true,p_owner_id
    ) returning id into v_default_warehouse_id;
  end if;

  update public.business_inventory_settings settings
  set default_warehouse_id=v_default_warehouse_id,
      updated_at=now()
  where settings.business_id=p_business_id
    and settings.default_warehouse_id is null;
end;
$$;

create or replace function private.initialize_business_inventory_on_owner()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if new.role='owner' and new.status='active' then
    perform private.initialize_business_inventory(new.business_id,new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists initialize_business_inventory_on_owner on public.business_members;
create trigger initialize_business_inventory_on_owner
after insert on public.business_members
for each row execute function private.initialize_business_inventory_on_owner();

do $$
declare business_record record;
begin
  for business_record in
    select business.id,business.owner_user_id
    from public.businesses business
    where business.status='active'
  loop
    perform private.initialize_business_inventory(
      business_record.id,business_record.owner_user_id
    );
  end loop;
end;
$$;

create or replace function private.upsert_business_product_internal(
  p_business_id uuid,
  p_name text,
  p_sku text,
  p_unit_of_measure text,
  p_sales_price numeric,
  p_purchase_cost_hint numeric,
  p_reorder_level numeric,
  p_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  clean_name text:=btrim(coalesce(p_name,''));
  clean_sku text:=upper(btrim(coalesce(p_sku,'')));
  clean_unit text:=lower(btrim(coalesce(p_unit_of_measure,'unit')));
  revenue_account_id uuid;
  inventory_account_id uuid;
  cogs_account_id uuid;
  saved_product_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.business_members membership
    where membership.business_id=p_business_id
      and membership.user_id=current_user_id
      and membership.status='active'
      and (
        membership.role in('owner','admin','manager','inventory')
        or '*'=any(membership.permissions)
        or 'inventory.manage'=any(membership.permissions)
      )
  ) then
    raise exception 'Inventory permission required.' using errcode='42501';
  end if;
  if char_length(clean_name) not between 2 and 160
    or clean_sku !~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'
    or char_length(clean_unit) not between 1 and 30
    or coalesce(p_sales_price,0)<0
    or coalesce(p_purchase_cost_hint,0)<0
    or coalesce(p_reorder_level,0)<0
  then
    raise exception 'Product values are invalid.' using errcode='22023';
  end if;

  select
    (min(account.id::text) filter(where account.system_key='sales_revenue'))::uuid,
    (min(account.id::text) filter(where account.system_key='inventory'))::uuid,
    (min(account.id::text) filter(where account.system_key='cost_of_goods_sold'))::uuid
  into revenue_account_id,inventory_account_id,cogs_account_id
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.is_active;

  if revenue_account_id is null or inventory_account_id is null or cogs_account_id is null then
    raise exception 'Required inventory accounting accounts are missing.' using errcode='23503';
  end if;

  if p_product_id is null then
    insert into public.business_products(
      business_id,sku,name,product_type,unit_of_measure,
      sales_price,purchase_cost_hint,reorder_level,
      revenue_account_id,inventory_account_id,cogs_account_id,
      status,created_by
    ) values(
      p_business_id,clean_sku,clean_name,'inventory',clean_unit,
      round(coalesce(p_sales_price,0),6),
      round(coalesce(p_purchase_cost_hint,0),6),
      round(coalesce(p_reorder_level,0),6),
      revenue_account_id,inventory_account_id,cogs_account_id,
      'active',current_user_id
    ) returning id into saved_product_id;
  else
    update public.business_products product
    set sku=clean_sku,
        name=clean_name,
        unit_of_measure=clean_unit,
        sales_price=round(coalesce(p_sales_price,0),6),
        purchase_cost_hint=round(coalesce(p_purchase_cost_hint,0),6),
        reorder_level=round(coalesce(p_reorder_level,0),6),
        updated_at=now()
    where product.id=p_product_id
      and product.business_id=p_business_id
      and product.status='active'
    returning product.id into saved_product_id;
    if saved_product_id is null then
      raise exception 'Active product not found.' using errcode='P0002';
    end if;
  end if;
  return saved_product_id;
end;
$$;

create or replace function public.upsert_business_product(
  p_business_id uuid,
  p_name text,
  p_sku text,
  p_unit_of_measure text default 'unit',
  p_sales_price numeric default 0,
  p_purchase_cost_hint numeric default 0,
  p_reorder_level numeric default 0,
  p_product_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public,private
as $$
begin
  return private.upsert_business_product_internal(
    p_business_id,p_name,p_sku,p_unit_of_measure,
    p_sales_price,p_purchase_cost_hint,p_reorder_level,p_product_id
  );
end;
$$;

create or replace function private.upsert_business_warehouse_internal(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_is_default boolean,
  p_warehouse_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();
  clean_name text:=btrim(coalesce(p_name,''));
  clean_code text:=upper(btrim(coalesce(p_code,'')));
  saved_warehouse_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.business_members membership
    where membership.business_id=p_business_id
      and membership.user_id=current_user_id
      and membership.status='active'
      and (
        membership.role in('owner','admin','manager','inventory')
        or '*'=any(membership.permissions)
        or 'inventory.manage'=any(membership.permissions)
      )
  ) then
    raise exception 'Inventory permission required.' using errcode='42501';
  end if;
  if char_length(clean_name) not between 2 and 120
    or clean_code !~ '^[A-Z0-9][A-Z0-9_-]{0,19}$'
  then
    raise exception 'Warehouse values are invalid.' using errcode='22023';
  end if;

  if coalesce(p_is_default,false) then
    update public.business_warehouses warehouse
    set is_default=false,updated_at=now()
    where warehouse.business_id=p_business_id and warehouse.is_default;
  end if;

  if p_warehouse_id is null then
    insert into public.business_warehouses(
      business_id,code,name,status,is_default,created_by
    ) values(
      p_business_id,clean_code,clean_name,'active',coalesce(p_is_default,false),current_user_id
    ) returning id into saved_warehouse_id;
  else
    update public.business_warehouses warehouse
    set code=clean_code,
        name=clean_name,
        is_default=coalesce(p_is_default,warehouse.is_default),
        updated_at=now()
    where warehouse.id=p_warehouse_id
      and warehouse.business_id=p_business_id
      and warehouse.status='active'
    returning warehouse.id into saved_warehouse_id;
    if saved_warehouse_id is null then
      raise exception 'Active warehouse not found.' using errcode='P0002';
    end if;
  end if;

  if coalesce(p_is_default,false) then
    update public.business_inventory_settings settings
    set default_warehouse_id=saved_warehouse_id,updated_at=now()
    where settings.business_id=p_business_id;
  end if;
  return saved_warehouse_id;
end;
$$;

create or replace function public.upsert_business_warehouse(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_is_default boolean default false,
  p_warehouse_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public,private
as $$
begin
  return private.upsert_business_warehouse_internal(
    p_business_id,p_name,p_code,p_is_default,p_warehouse_id
  );
end;
$$;

revoke execute on function private.initialize_business_inventory(uuid,uuid) from public,anon,authenticated;
revoke execute on function private.initialize_business_inventory_on_owner() from public,anon,authenticated;
revoke execute on function private.upsert_business_product_internal(uuid,text,text,text,numeric,numeric,numeric,uuid) from public,anon;
revoke execute on function private.upsert_business_warehouse_internal(uuid,text,text,boolean,uuid) from public,anon;
grant execute on function private.upsert_business_product_internal(uuid,text,text,text,numeric,numeric,numeric,uuid) to authenticated;
grant execute on function private.upsert_business_warehouse_internal(uuid,text,text,boolean,uuid) to authenticated;
revoke execute on function public.upsert_business_product(uuid,text,text,text,numeric,numeric,numeric,uuid) from public,anon;
revoke execute on function public.upsert_business_warehouse(uuid,text,text,boolean,uuid) from public,anon;
grant execute on function public.upsert_business_product(uuid,text,text,text,numeric,numeric,numeric,uuid) to authenticated;
grant execute on function public.upsert_business_warehouse(uuid,text,text,boolean,uuid) to authenticated;
