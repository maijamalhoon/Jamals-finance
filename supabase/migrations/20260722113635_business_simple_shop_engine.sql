create table public.business_simple_shop_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  default_customer_id uuid,
  default_supplier_id uuid,
  default_warehouse_id uuid,
  default_cash_account_id uuid,
  default_expense_account_id uuid,
  next_expense_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_simple_shop_settings_customer_fk foreign key (business_id, default_customer_id)
    references public.business_contacts(business_id, id) on delete restrict,
  constraint business_simple_shop_settings_supplier_fk foreign key (business_id, default_supplier_id)
    references public.business_contacts(business_id, id) on delete restrict,
  constraint business_simple_shop_settings_warehouse_fk foreign key (business_id, default_warehouse_id)
    references public.business_warehouses(business_id, id) on delete restrict,
  constraint business_simple_shop_settings_cash_fk foreign key (business_id, default_cash_account_id)
    references public.business_chart_of_accounts(business_id, id) on delete restrict,
  constraint business_simple_shop_settings_expense_fk foreign key (business_id, default_expense_account_id)
    references public.business_chart_of_accounts(business_id, id) on delete restrict,
  constraint business_simple_shop_settings_sequence_check check (next_expense_number > 0)
);

create table public.business_simple_shop_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  expense_number bigint not null,
  expense_code text not null,
  expense_date date not null,
  description text not null,
  amount_base numeric(24,6) not null,
  expense_account_id uuid not null,
  payment_account_id uuid not null,
  reference text,
  journal_entry_id uuid,
  idempotency_key text not null,
  status text not null default 'posted',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_simple_shop_expenses_business_id_id_key unique (business_id, id),
  constraint business_simple_shop_expenses_number_key unique (business_id, expense_number),
  constraint business_simple_shop_expenses_code_key unique (business_id, expense_code),
  constraint business_simple_shop_expenses_idempotency_key unique (business_id, idempotency_key),
  constraint business_simple_shop_expenses_expense_account_fk foreign key (business_id, expense_account_id)
    references public.business_chart_of_accounts(business_id, id) on delete restrict,
  constraint business_simple_shop_expenses_payment_account_fk foreign key (business_id, payment_account_id)
    references public.business_chart_of_accounts(business_id, id) on delete restrict,
  constraint business_simple_shop_expenses_journal_fk foreign key (business_id, journal_entry_id)
    references public.business_journal_entries(business_id, id) on delete restrict,
  constraint business_simple_shop_expenses_description_check check (char_length(btrim(description)) between 2 and 300),
  constraint business_simple_shop_expenses_amount_check check (amount_base > 0),
  constraint business_simple_shop_expenses_status_check check (status in ('posted','reversed'))
);

create index business_simple_shop_settings_customer_idx on public.business_simple_shop_settings(business_id,default_customer_id);
create index business_simple_shop_settings_supplier_idx on public.business_simple_shop_settings(business_id,default_supplier_id);
create index business_simple_shop_settings_warehouse_idx on public.business_simple_shop_settings(business_id,default_warehouse_id);
create index business_simple_shop_settings_cash_idx on public.business_simple_shop_settings(business_id,default_cash_account_id);
create index business_simple_shop_settings_expense_idx on public.business_simple_shop_settings(business_id,default_expense_account_id);
create index business_simple_shop_expenses_business_date_idx on public.business_simple_shop_expenses(business_id,expense_date desc);
create index business_simple_shop_expenses_created_by_idx on public.business_simple_shop_expenses(created_by);
create index business_simple_shop_expenses_expense_account_idx on public.business_simple_shop_expenses(business_id,expense_account_id);
create index business_simple_shop_expenses_payment_account_idx on public.business_simple_shop_expenses(business_id,payment_account_id);
create index business_simple_shop_expenses_journal_idx on public.business_simple_shop_expenses(business_id,journal_entry_id);

create trigger business_simple_shop_settings_updated_at before update on public.business_simple_shop_settings
for each row execute function private.set_business_workspace_updated_at();
create trigger business_simple_shop_expenses_updated_at before update on public.business_simple_shop_expenses
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.can_view_business_simple_shop(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id
    and membership.user_id=auth.uid()
    and membership.status='active'
    and business.status='active'
    and business.workspace_mode='simple_shop'
    and (
      membership.role in ('owner','admin','accountant','manager','sales','cashier','inventory','viewer')
      or '*'=any(membership.permissions)
      or 'shop.view'=any(membership.permissions)
      or 'shop.sell'=any(membership.permissions)
      or 'shop.purchase'=any(membership.permissions)
      or 'shop.expense'=any(membership.permissions)
    )
);
$$;

create or replace function private.can_sell_business_simple_shop(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=auth.uid() and membership.status='active'
    and business.status='active' and business.workspace_mode='simple_shop'
    and (membership.role in ('owner','admin','manager','sales','cashier') or '*'=any(membership.permissions) or 'shop.sell'=any(membership.permissions))
);
$$;

create or replace function private.can_purchase_business_simple_shop(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=auth.uid() and membership.status='active'
    and business.status='active' and business.workspace_mode='simple_shop'
    and (membership.role in ('owner','admin','manager','inventory') or '*'=any(membership.permissions) or 'shop.purchase'=any(membership.permissions))
);
$$;

create or replace function private.can_expense_business_simple_shop(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=auth.uid() and membership.status='active'
    and business.status='active' and business.workspace_mode='simple_shop'
    and (membership.role in ('owner','admin','manager','cashier') or '*'=any(membership.permissions) or 'shop.expense'=any(membership.permissions))
);
$$;

revoke all on function private.can_view_business_simple_shop(uuid) from public,anon;
revoke all on function private.can_sell_business_simple_shop(uuid) from public,anon;
revoke all on function private.can_purchase_business_simple_shop(uuid) from public,anon;
revoke all on function private.can_expense_business_simple_shop(uuid) from public,anon;
grant execute on function private.can_view_business_simple_shop(uuid) to authenticated,service_role;
grant execute on function private.can_sell_business_simple_shop(uuid) to authenticated,service_role;
grant execute on function private.can_purchase_business_simple_shop(uuid) to authenticated,service_role;
grant execute on function private.can_expense_business_simple_shop(uuid) to authenticated,service_role;

alter table public.business_simple_shop_settings enable row level security;
alter table public.business_simple_shop_expenses enable row level security;
create policy business_simple_shop_settings_select on public.business_simple_shop_settings for select to authenticated
using ((select private.can_view_business_simple_shop(business_id)));
create policy business_simple_shop_expenses_select on public.business_simple_shop_expenses for select to authenticated
using ((select private.can_view_business_simple_shop(business_id)));
revoke all on public.business_simple_shop_settings,public.business_simple_shop_expenses from public,anon,authenticated;
grant select on public.business_simple_shop_settings,public.business_simple_shop_expenses to authenticated,service_role;
grant all on public.business_simple_shop_settings,public.business_simple_shop_expenses to postgres;

create or replace function private.initialize_business_simple_shop(p_business_id uuid,p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  business_currency text;
  default_customer uuid;
  default_supplier uuid;
  default_warehouse uuid;
  default_cash uuid;
  default_expense uuid;
begin
  select business.base_currency into business_currency
  from public.businesses business
  where business.id=p_business_id and business.owner_user_id=p_owner_id and business.status='active' and business.workspace_mode='simple_shop';
  if business_currency is null then raise exception 'Simple shop owner verification failed.' using errcode='42501'; end if;

  select contact.id into default_customer from public.business_contacts contact
  where contact.business_id=p_business_id and contact.notes='[system:simple_shop_walk_in]' limit 1;
  if default_customer is null then
    insert into public.business_contacts(
      business_id,contact_type,display_name,currency,credit_limit,payment_terms_days,billing_address,shipping_address,notes,status,created_by
    ) values (p_business_id,'customer','Walk-in Customer',business_currency,0,0,'{}'::jsonb,'{}'::jsonb,'[system:simple_shop_walk_in]','active',p_owner_id)
    returning id into default_customer;
  end if;

  select contact.id into default_supplier from public.business_contacts contact
  where contact.business_id=p_business_id and contact.notes='[system:simple_shop_cash_supplier]' limit 1;
  if default_supplier is null then
    insert into public.business_contacts(
      business_id,contact_type,display_name,currency,credit_limit,payment_terms_days,billing_address,shipping_address,notes,status,created_by
    ) values (p_business_id,'supplier','Cash Purchase Supplier',business_currency,0,0,'{}'::jsonb,'{}'::jsonb,'[system:simple_shop_cash_supplier]','active',p_owner_id)
    returning id into default_supplier;
  end if;

  select settings.default_warehouse_id into default_warehouse
  from public.business_inventory_settings settings where settings.business_id=p_business_id;
  if default_warehouse is null then
    select warehouse.id into default_warehouse from public.business_warehouses warehouse
    where warehouse.business_id=p_business_id and warehouse.status='active'
    order by warehouse.is_default desc,warehouse.created_at limit 1;
  end if;
  select account.id into default_cash from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='cash' and account.is_active limit 1;
  select account.id into default_expense from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.system_key='operating_expenses' and account.is_active limit 1;
  if default_warehouse is null or default_cash is null or default_expense is null then
    raise exception 'Simple shop accounting or warehouse foundation is incomplete.' using errcode='23503';
  end if;

  insert into public.business_simple_shop_settings(
    business_id,default_customer_id,default_supplier_id,default_warehouse_id,default_cash_account_id,default_expense_account_id
  ) values (p_business_id,default_customer,default_supplier,default_warehouse,default_cash,default_expense)
  on conflict(business_id) do update set
    default_customer_id=coalesce(public.business_simple_shop_settings.default_customer_id,excluded.default_customer_id),
    default_supplier_id=coalesce(public.business_simple_shop_settings.default_supplier_id,excluded.default_supplier_id),
    default_warehouse_id=coalesce(public.business_simple_shop_settings.default_warehouse_id,excluded.default_warehouse_id),
    default_cash_account_id=coalesce(public.business_simple_shop_settings.default_cash_account_id,excluded.default_cash_account_id),
    default_expense_account_id=coalesce(public.business_simple_shop_settings.default_expense_account_id,excluded.default_expense_account_id),
    updated_at=now();
end;
$$;
revoke all on function private.initialize_business_simple_shop(uuid,uuid) from public,anon,authenticated;
grant execute on function private.initialize_business_simple_shop(uuid,uuid) to service_role;

create or replace function public.create_business_workspace_with_mode(
  p_name text,
  p_business_type text,
  p_workspace_mode text default 'advanced_company',
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security invoker
set search_path='pg_catalog','public','private'
as $$
declare
  current_user_id uuid:=auth.uid();
  clean_name text:=btrim(coalesce(p_name,''));
  normalized_type text:=lower(btrim(coalesce(p_business_type,'')));
  normalized_mode text:=lower(btrim(coalesce(p_workspace_mode,'advanced_company')));
  normalized_country text:=nullif(upper(btrim(coalesce(p_country_code,''))),'');
  normalized_currency text:=upper(btrim(coalesce(p_base_currency,'PKR')));
  normalized_timezone text:=btrim(coalesce(p_timezone,'UTC'));
  base_slug text;
  generated_slug text;
  created_business_id uuid;
  modules jsonb;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if char_length(clean_name)<2 or char_length(clean_name)>120 then raise exception 'Business name must contain 2 to 120 characters.' using errcode='22023'; end if;
  if normalized_type not in('retail','wholesale','services','manufacturing','restaurant','ecommerce','construction','professional_services','other') then raise exception 'Unsupported business type.' using errcode='22023'; end if;
  if normalized_mode not in('advanced_company','simple_shop') then raise exception 'Unsupported workspace mode.' using errcode='22023'; end if;
  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then raise exception 'Country code must use two ISO letters.' using errcode='22023'; end if;
  if not public.is_supported_financial_currency(normalized_currency) then raise exception 'Unsupported base currency.' using errcode='22023'; end if;
  if normalized_timezone='' or not exists(select 1 from pg_catalog.pg_timezone_names where name=normalized_timezone) then raise exception 'Unsupported timezone.' using errcode='22023'; end if;

  base_slug:=btrim(regexp_replace(lower(clean_name),'[^a-z0-9]+','-','g'),'-');
  if base_slug='' then base_slug:='business'; end if;
  generated_slug:=base_slug||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8);
  modules:=case when normalized_mode='simple_shop' then
    jsonb_build_object('accounting',true,'contacts',true,'sales',true,'purchases',true,'inventory',true,'crm',false,'reports',true,'simple_shop',true)
  else
    jsonb_build_object('accounting',true,'contacts',true,'sales',true,'purchases',true,'inventory',normalized_type in('retail','wholesale','manufacturing','restaurant','ecommerce'),'crm',true,'reports',true,'simple_shop',false)
  end;

  insert into public.businesses(owner_user_id,name,slug,business_type,country_code,base_currency,timezone,module_config,workspace_mode)
  values(current_user_id,clean_name,generated_slug,normalized_type,normalized_country,normalized_currency,normalized_timezone,modules,normalized_mode)
  returning id into created_business_id;
  insert into public.business_members(business_id,user_id,role,status,permissions,invited_by,joined_at)
  values(created_business_id,current_user_id,'owner','active',array['*']::text[],current_user_id,now());
  if normalized_mode='simple_shop' then perform private.initialize_business_simple_shop(created_business_id,current_user_id); end if;
  insert into public.business_workspace_preferences(user_id,default_workspace,active_business_id,onboarding_choice)
  values(current_user_id,'business',created_business_id,'business')
  on conflict(user_id) do update set default_workspace=excluded.default_workspace,active_business_id=excluded.active_business_id,onboarding_choice=excluded.onboarding_choice,updated_at=now();
  return created_business_id;
end;
$$;
revoke all on function public.create_business_workspace_with_mode(text,text,text,text,text,text) from public,anon;
grant execute on function public.create_business_workspace_with_mode(text,text,text,text,text,text) to authenticated,service_role;

-- Extend existing operational permissions only inside Simple Shop workspaces.
do $$
declare definition text; old_text text; new_text text;
begin
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='create_business_sales_invoice_internal' limit 1;
  old_text:='membership.role in (''owner'', ''admin'', ''accountant'', ''manager'', ''sales'')';
  new_text:='(membership.role in (''owner'', ''admin'', ''accountant'', ''manager'', ''sales'') or (membership.role = ''cashier'' and exists(select 1 from public.businesses shop_business where shop_business.id=p_business_id and shop_business.workspace_mode=''simple_shop'')) or ''shop.sell'' = any(membership.permissions))';
  if position(old_text in definition)=0 then raise exception 'Sales invoice permission patch target not found.'; end if;
  execute replace(definition,old_text,new_text);
end $$;

do $$
declare definition text; old_text text; new_text text;
begin
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='create_business_supplier_bill_internal' limit 1;
  old_text:='role in(''owner'',''admin'',''accountant'',''manager'')';
  new_text:='(role in(''owner'',''admin'',''accountant'',''manager'') or (role=''inventory'' and exists(select 1 from public.businesses shop_business where shop_business.id=p_business_id and shop_business.workspace_mode=''simple_shop'')) or ''shop.purchase''=any(permissions))';
  if position(old_text in definition)=0 then raise exception 'Supplier bill permission patch target not found.'; end if;
  execute replace(definition,old_text,new_text);
end $$;

do $$
declare definition text; old_text text; new_text text;
begin
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='record_business_supplier_payment_internal' limit 1;
  old_text:='membership.role in(''owner'',''admin'',''accountant'',''manager'')';
  new_text:='(membership.role in(''owner'',''admin'',''accountant'',''manager'') or (membership.role=''inventory'' and exists(select 1 from public.businesses shop_business where shop_business.id=p_business_id and shop_business.workspace_mode=''simple_shop'')) or ''shop.purchase''=any(membership.permissions))';
  if position(old_text in definition)=0 then raise exception 'Supplier payment permission patch target not found.'; end if;
  execute replace(definition,old_text,new_text);
end $$;

do $$
declare definition text; old_text text; new_text text;
begin
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='post_business_journal_entry_internal' limit 1;
  old_text:='role in(''owner'',''admin'',''accountant'',''manager'') or ''*''=any(permissions) or ''purchases.manage''=any(permissions) or ''purchases.pay''=any(permissions)';
  new_text:='(role in(''owner'',''admin'',''accountant'',''manager'') or (role=''inventory'' and exists(select 1 from public.businesses shop_business where shop_business.id=p_business_id and shop_business.workspace_mode=''simple_shop'')) or ''*''=any(permissions) or ''purchases.manage''=any(permissions) or ''purchases.pay''=any(permissions) or ''shop.purchase''=any(permissions))';
  if position(old_text in definition)=0 then raise exception 'Purchase journal permission patch target not found.'; end if;
  execute replace(definition,old_text,new_text);
end $$;

create or replace function private.create_business_simple_shop_sale_internal(
  p_business_id uuid,p_customer_id uuid,p_sale_date date,p_lines jsonb,p_paid_now boolean,
  p_payment_account_id uuid,p_notes text,p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  settings_record record;
  customer_uuid uuid;
  invoice_uuid uuid;
  payment_uuid uuid;
  invoice_total numeric(24,6);
  clean_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_sell_business_simple_shop(p_business_id) then raise exception 'Simple shop sales permission required.' using errcode='42501'; end if;
  if p_sale_date is null then raise exception 'Sale date is required.' using errcode='22004'; end if;
  if clean_key is null then raise exception 'Sale request key is required.' using errcode='22023'; end if;
  select settings.* into settings_record from public.business_simple_shop_settings settings where settings.business_id=p_business_id;
  if not found then raise exception 'Simple shop settings are missing.' using errcode='23503'; end if;
  customer_uuid:=coalesce(p_customer_id,settings_record.default_customer_id);
  if not coalesce(p_paid_now,true) and customer_uuid=settings_record.default_customer_id then
    raise exception 'Credit sales require a named customer.' using errcode='22023';
  end if;
  invoice_uuid:=private.create_business_stock_sales_invoice_internal(
    p_business_id,customer_uuid,p_sale_date,p_sale_date,null,1,p_notes,p_lines,'shop-sale:'||clean_key
  );
  select invoice.total_transaction into invoice_total from public.business_sales_invoices invoice
  where invoice.business_id=p_business_id and invoice.id=invoice_uuid;
  if coalesce(p_paid_now,true) then
    payment_uuid:=private.record_business_sales_payment_internal(
      p_business_id,invoice_uuid,p_sale_date,invoice_total,coalesce(p_payment_account_id,settings_record.default_cash_account_id),
      'Quick sale '||clean_key,'shop-sale-payment:'||clean_key
    );
  end if;
  return jsonb_build_object('invoice_id',invoice_uuid,'payment_id',payment_uuid,'total',invoice_total,'paid_now',coalesce(p_paid_now,true));
end;
$$;

create or replace function public.create_business_simple_shop_sale(
  p_business_id uuid,p_customer_id uuid default null,p_sale_date date default current_date,p_lines jsonb default '[]'::jsonb,
  p_paid_now boolean default true,p_payment_account_id uuid default null,p_notes text default null,p_idempotency_key text default null
)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private'
as $$ select private.create_business_simple_shop_sale_internal(p_business_id,p_customer_id,p_sale_date,p_lines,p_paid_now,p_payment_account_id,p_notes,p_idempotency_key); $$;

create or replace function private.create_business_simple_shop_purchase_internal(
  p_business_id uuid,p_supplier_id uuid,p_purchase_date date,p_supplier_document_number text,p_lines jsonb,p_paid_now boolean,
  p_payment_account_id uuid,p_notes text,p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  settings_record record;
  supplier_uuid uuid;
  bill_uuid uuid;
  payment_uuid uuid;
  bill_total numeric(24,6);
  clean_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_purchase_business_simple_shop(p_business_id) then raise exception 'Simple shop purchasing permission required.' using errcode='42501'; end if;
  if p_purchase_date is null then raise exception 'Purchase date is required.' using errcode='22004'; end if;
  if clean_key is null then raise exception 'Purchase request key is required.' using errcode='22023'; end if;
  select settings.* into settings_record from public.business_simple_shop_settings settings where settings.business_id=p_business_id;
  if not found then raise exception 'Simple shop settings are missing.' using errcode='23503'; end if;
  supplier_uuid:=coalesce(p_supplier_id,settings_record.default_supplier_id);
  if not coalesce(p_paid_now,true) and supplier_uuid=settings_record.default_supplier_id then
    raise exception 'Credit purchases require a named supplier.' using errcode='22023';
  end if;
  bill_uuid:=private.create_business_stock_supplier_bill_internal(
    p_business_id,supplier_uuid,p_purchase_date,p_purchase_date,p_supplier_document_number,null,1,p_notes,p_lines,'shop-purchase:'||clean_key
  );
  select bill.total_transaction into bill_total from public.business_supplier_bills bill
  where bill.business_id=p_business_id and bill.id=bill_uuid;
  if coalesce(p_paid_now,true) then
    payment_uuid:=private.record_business_supplier_payment_internal(
      p_business_id,bill_uuid,p_purchase_date,bill_total,coalesce(p_payment_account_id,settings_record.default_cash_account_id),
      'Quick purchase '||clean_key,'shop-purchase-payment:'||clean_key
    );
  end if;
  return jsonb_build_object('bill_id',bill_uuid,'payment_id',payment_uuid,'total',bill_total,'paid_now',coalesce(p_paid_now,true));
end;
$$;

create or replace function public.create_business_simple_shop_purchase(
  p_business_id uuid,p_supplier_id uuid default null,p_purchase_date date default current_date,p_supplier_document_number text default null,
  p_lines jsonb default '[]'::jsonb,p_paid_now boolean default true,p_payment_account_id uuid default null,p_notes text default null,p_idempotency_key text default null
)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private'
as $$ select private.create_business_simple_shop_purchase_internal(p_business_id,p_supplier_id,p_purchase_date,p_supplier_document_number,p_lines,p_paid_now,p_payment_account_id,p_notes,p_idempotency_key); $$;

create or replace function private.create_business_simple_shop_expense_internal(
  p_business_id uuid,p_expense_date date,p_description text,p_amount numeric,p_expense_account_id uuid,
  p_payment_account_id uuid,p_reference text,p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  current_user_id uuid:=auth.uid();
  settings_record record;
  business_currency text;
  rounding_scale smallint;
  expense_uuid uuid;
  existing_record record;
  assigned_number bigint;
  expense_amount numeric(24,6);
  selected_expense_account uuid;
  selected_payment_account uuid;
  selected_period uuid;
  journal_uuid uuid;
  clean_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
  clean_description text:=btrim(coalesce(p_description,''));
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_expense_business_simple_shop(p_business_id) then raise exception 'Simple shop expense permission required.' using errcode='42501'; end if;
  if clean_key is null then raise exception 'Expense request key is required.' using errcode='22023'; end if;
  select expense.* into existing_record from public.business_simple_shop_expenses expense
  where expense.business_id=p_business_id and expense.idempotency_key=clean_key;
  if found then return jsonb_build_object('expense_id',existing_record.id,'journal_id',existing_record.journal_entry_id,'amount',existing_record.amount_base); end if;
  if p_expense_date is null then raise exception 'Expense date is required.' using errcode='22004'; end if;
  if char_length(clean_description) not between 2 and 300 then raise exception 'Expense description must contain 2 to 300 characters.' using errcode='22023'; end if;
  select settings.* into settings_record from public.business_simple_shop_settings settings where settings.business_id=p_business_id for update;
  if not found then raise exception 'Simple shop settings are missing.' using errcode='23503'; end if;
  select business.base_currency,accounting.rounding_scale into business_currency,rounding_scale
  from public.businesses business join public.business_accounting_settings accounting on accounting.business_id=business.id
  where business.id=p_business_id and business.status='active' and business.workspace_mode='simple_shop';
  if business_currency is null then raise exception 'Active simple shop not found.' using errcode='P0002'; end if;
  expense_amount:=round(coalesce(p_amount,0),rounding_scale);
  if expense_amount<=0 then raise exception 'Expense amount must be greater than zero.' using errcode='22023'; end if;
  selected_expense_account:=coalesce(p_expense_account_id,settings_record.default_expense_account_id);
  selected_payment_account:=coalesce(p_payment_account_id,settings_record.default_cash_account_id);
  if not exists(select 1 from public.business_chart_of_accounts account where account.business_id=p_business_id and account.id=selected_expense_account and account.is_active and account.account_type='expense' and account.allow_manual_posting) then
    raise exception 'Expense account is invalid.' using errcode='23514';
  end if;
  if not exists(select 1 from public.business_chart_of_accounts account where account.business_id=p_business_id and account.id=selected_payment_account and account.is_active and account.system_key in('cash','bank')) then
    raise exception 'Payment account must be cash or bank.' using errcode='23514';
  end if;
  select period.id into selected_period from public.business_fiscal_periods period
  where period.business_id=p_business_id and period.status='open' and p_expense_date between period.starts_on and period.ends_on
  order by period.starts_on desc limit 1;
  if selected_period is null then raise exception 'No open fiscal period contains the expense date.' using errcode='22008'; end if;

  assigned_number:=settings_record.next_expense_number;
  update public.business_simple_shop_settings set next_expense_number=next_expense_number+1 where business_id=p_business_id;
  insert into public.business_simple_shop_expenses(
    business_id,expense_number,expense_code,expense_date,description,amount_base,expense_account_id,payment_account_id,reference,idempotency_key,status,created_by
  ) values (
    p_business_id,assigned_number,'EXP-'||lpad(assigned_number::text,6,'0'),p_expense_date,clean_description,expense_amount,
    selected_expense_account,selected_payment_account,nullif(btrim(coalesce(p_reference,'')),''),clean_key,'posted',current_user_id
  ) returning id into expense_uuid;

  insert into public.business_journal_entries(
    business_id,entry_date,fiscal_period_id,source_type,source_id,reference,description,status,transaction_currency,exchange_rate,created_by
  ) values (
    p_business_id,p_expense_date,selected_period,'manual',expense_uuid,'SHOP-EXP-'||assigned_number::text,clean_description,'draft',business_currency,1,current_user_id
  ) returning id into journal_uuid;
  insert into public.business_journal_lines(business_id,journal_entry_id,line_number,account_id,description,debit_transaction,credit_transaction) values
    (p_business_id,journal_uuid,1,selected_expense_account,clean_description,expense_amount,0),
    (p_business_id,journal_uuid,2,selected_payment_account,'Cash or bank payment',0,expense_amount);
  update public.business_journal_entries set status='posted' where business_id=p_business_id and id=journal_uuid;
  update public.business_simple_shop_expenses set journal_entry_id=journal_uuid where business_id=p_business_id and id=expense_uuid;
  return jsonb_build_object('expense_id',expense_uuid,'journal_id',journal_uuid,'amount',expense_amount);
end;
$$;

create or replace function public.create_business_simple_shop_expense(
  p_business_id uuid,p_expense_date date default current_date,p_description text default null,p_amount numeric default 0,
  p_expense_account_id uuid default null,p_payment_account_id uuid default null,p_reference text default null,p_idempotency_key text default null
)
returns jsonb language sql security invoker set search_path='pg_catalog','public','private'
as $$ select private.create_business_simple_shop_expense_internal(p_business_id,p_expense_date,p_description,p_amount,p_expense_account_id,p_payment_account_id,p_reference,p_idempotency_key); $$;

create or replace function private.get_business_simple_shop_snapshot_internal(p_business_id uuid,p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  report_date date:=coalesce(p_date,current_date);
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_view_business_simple_shop(p_business_id) then raise exception 'Simple shop access required.' using errcode='42501'; end if;
  select jsonb_build_object(
    'settings',(select to_jsonb(settings) from public.business_simple_shop_settings settings where settings.business_id=p_business_id),
    'products',coalesce((select jsonb_agg(jsonb_build_object(
      'id',product.id,'sku',product.sku,'name',product.name,'unit',product.unit_of_measure,'sales_price',product.sales_price,
      'purchase_cost_hint',product.purchase_cost_hint,'reorder_level',product.reorder_level,'revenue_account_id',product.revenue_account_id,
      'inventory_account_id',product.inventory_account_id,'quantity_on_hand',coalesce(stock.quantity_on_hand,0),'inventory_value',coalesce(stock.inventory_value_base,0)
    ) order by product.name) from public.business_products product
    left join lateral (select sum(balance.quantity_on_hand) quantity_on_hand,sum(balance.inventory_value_base) inventory_value_base from public.business_inventory_balances balance where balance.business_id=product.business_id and balance.product_id=product.id) stock on true
    where product.business_id=p_business_id and product.status='active'),'[]'::jsonb),
    'customers',coalesce((select jsonb_agg(jsonb_build_object('id',contact.id,'name',contact.display_name,'currency',contact.currency,'terms',contact.payment_terms_days) order by contact.display_name)
      from public.business_contacts contact where contact.business_id=p_business_id and contact.status='active' and contact.contact_type in('customer','both')),'[]'::jsonb),
    'suppliers',coalesce((select jsonb_agg(jsonb_build_object('id',contact.id,'name',contact.display_name,'currency',contact.currency,'terms',contact.payment_terms_days) order by contact.display_name)
      from public.business_contacts contact where contact.business_id=p_business_id and contact.status='active' and contact.contact_type in('supplier','both')),'[]'::jsonb),
    'payment_accounts',coalesce((select jsonb_agg(jsonb_build_object('id',account.id,'code',account.code,'name',account.name,'system_key',account.system_key) order by account.code)
      from public.business_chart_of_accounts account where account.business_id=p_business_id and account.is_active and account.system_key in('cash','bank')),'[]'::jsonb),
    'expense_accounts',coalesce((select jsonb_agg(jsonb_build_object('id',account.id,'code',account.code,'name',account.name,'system_key',account.system_key) order by account.code)
      from public.business_chart_of_accounts account where account.business_id=p_business_id and account.is_active and account.account_type='expense' and account.allow_manual_posting),'[]'::jsonb),
    'metrics',jsonb_build_object(
      'gross_sales',coalesce((select sum(invoice.total_base) from public.business_sales_invoices invoice where invoice.business_id=p_business_id and invoice.invoice_date=report_date and invoice.status<>'draft'),0),
      'sales_returns',coalesce((select sum(return_doc.total_base) from public.business_sales_returns return_doc where return_doc.business_id=p_business_id and return_doc.return_date=report_date and return_doc.status='posted'),0),
      'purchases',coalesce((select sum(bill.total_base) from public.business_supplier_bills bill where bill.business_id=p_business_id and bill.bill_date=report_date and bill.status<>'draft'),0),
      'purchase_returns',coalesce((select sum(return_doc.total_base) from public.business_purchase_returns return_doc where return_doc.business_id=p_business_id and return_doc.return_date=report_date and return_doc.status='posted'),0),
      'cash_received',coalesce((select sum(payment.amount_base) from public.business_sales_payments payment where payment.business_id=p_business_id and payment.payment_date=report_date and payment.status='posted'),0),
      'supplier_paid',coalesce((select sum(payment.amount_base) from public.business_supplier_payments payment where payment.business_id=p_business_id and payment.payment_date=report_date and payment.status='posted'),0),
      'expenses',coalesce((select sum(expense.amount_base) from public.business_simple_shop_expenses expense where expense.business_id=p_business_id and expense.expense_date=report_date and expense.status='posted'),0),
      'cash_balance',coalesce((select sum(line.debit_base-line.credit_base) from public.business_journal_lines line join public.business_journal_entries entry on entry.business_id=line.business_id and entry.id=line.journal_entry_id join public.business_chart_of_accounts account on account.business_id=line.business_id and account.id=line.account_id where line.business_id=p_business_id and entry.status in('posted','reversed') and entry.entry_date<=report_date and account.system_key in('cash','bank')),0),
      'receivables',coalesce((select sum(invoice.total_base-invoice.paid_base-invoice.returned_base) from public.business_sales_invoices invoice where invoice.business_id=p_business_id and invoice.status in('issued','partially_paid')),0),
      'payables',coalesce((select sum(bill.total_base-bill.paid_base-bill.returned_base) from public.business_supplier_bills bill where bill.business_id=p_business_id and bill.status in('issued','partially_paid')),0),
      'profit',coalesce((select sum(case when account.account_type='revenue' then line.credit_base-line.debit_base when account.account_type='expense' then line.credit_base-line.debit_base else 0 end) from public.business_journal_lines line join public.business_journal_entries entry on entry.business_id=line.business_id and entry.id=line.journal_entry_id join public.business_chart_of_accounts account on account.business_id=line.business_id and account.id=line.account_id where line.business_id=p_business_id and entry.status in('posted','reversed') and entry.entry_date=report_date),0),
      'low_stock_count',coalesce((select count(*) from public.business_products product left join lateral (select sum(balance.quantity_on_hand) quantity_on_hand from public.business_inventory_balances balance where balance.business_id=product.business_id and balance.product_id=product.id) stock on true where product.business_id=p_business_id and product.status='active' and coalesce(stock.quantity_on_hand,0)<=product.reorder_level),0)
    ),
    'recent_sales',coalesce((select jsonb_agg(row_data order by row_data->>'created_at' desc) from (select jsonb_build_object('id',invoice.id,'code',invoice.invoice_code,'date',invoice.invoice_date,'total',invoice.total_base,'paid',invoice.paid_base,'returned',invoice.returned_base,'status',invoice.status,'customer_id',invoice.customer_id,'created_at',invoice.created_at) row_data from public.business_sales_invoices invoice where invoice.business_id=p_business_id and invoice.status<>'draft' order by invoice.created_at desc limit 20) recent),'[]'::jsonb),
    'recent_purchases',coalesce((select jsonb_agg(row_data order by row_data->>'created_at' desc) from (select jsonb_build_object('id',bill.id,'code',bill.bill_code,'date',bill.bill_date,'total',bill.total_base,'paid',bill.paid_base,'returned',bill.returned_base,'status',bill.status,'supplier_id',bill.supplier_id,'created_at',bill.created_at) row_data from public.business_supplier_bills bill where bill.business_id=p_business_id and bill.status<>'draft' order by bill.created_at desc limit 20) recent),'[]'::jsonb),
    'recent_expenses',coalesce((select jsonb_agg(jsonb_build_object('id',expense.id,'code',expense.expense_code,'date',expense.expense_date,'description',expense.description,'amount',expense.amount_base,'created_at',expense.created_at) order by expense.created_at desc) from public.business_simple_shop_expenses expense where expense.business_id=p_business_id limit 20),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_business_simple_shop_snapshot(p_business_id uuid,p_date date default current_date)
returns jsonb language sql stable security invoker set search_path='pg_catalog','public','private'
as $$ select private.get_business_simple_shop_snapshot_internal(p_business_id,p_date); $$;

revoke all on function private.create_business_simple_shop_sale_internal(uuid,uuid,date,jsonb,boolean,uuid,text,text) from public,anon;
revoke all on function private.create_business_simple_shop_purchase_internal(uuid,uuid,date,text,jsonb,boolean,uuid,text,text) from public,anon;
revoke all on function private.create_business_simple_shop_expense_internal(uuid,date,text,numeric,uuid,uuid,text,text) from public,anon;
revoke all on function private.get_business_simple_shop_snapshot_internal(uuid,date) from public,anon;
grant execute on function private.create_business_simple_shop_sale_internal(uuid,uuid,date,jsonb,boolean,uuid,text,text) to authenticated,service_role;
grant execute on function private.create_business_simple_shop_purchase_internal(uuid,uuid,date,text,jsonb,boolean,uuid,text,text) to authenticated,service_role;
grant execute on function private.create_business_simple_shop_expense_internal(uuid,date,text,numeric,uuid,uuid,text,text) to authenticated,service_role;
grant execute on function private.get_business_simple_shop_snapshot_internal(uuid,date) to authenticated,service_role;

revoke all on function public.create_business_simple_shop_sale(uuid,uuid,date,jsonb,boolean,uuid,text,text) from public,anon;
revoke all on function public.create_business_simple_shop_purchase(uuid,uuid,date,text,jsonb,boolean,uuid,text,text) from public,anon;
revoke all on function public.create_business_simple_shop_expense(uuid,date,text,numeric,uuid,uuid,text,text) from public,anon;
revoke all on function public.get_business_simple_shop_snapshot(uuid,date) from public,anon;
grant execute on function public.create_business_simple_shop_sale(uuid,uuid,date,jsonb,boolean,uuid,text,text) to authenticated,service_role;
grant execute on function public.create_business_simple_shop_purchase(uuid,uuid,date,text,jsonb,boolean,uuid,text,text) to authenticated,service_role;
grant execute on function public.create_business_simple_shop_expense(uuid,date,text,numeric,uuid,uuid,text,text) to authenticated,service_role;
grant execute on function public.get_business_simple_shop_snapshot(uuid,date) to authenticated,service_role;
