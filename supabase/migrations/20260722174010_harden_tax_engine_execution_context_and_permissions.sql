create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path=pg_catalog
as $$
select array[
 'team.view','team.manage','notifications.view','notifications.manage',
 'accounting.view','accounting.manage','tax.view','tax.manage',
 'contacts.view','contacts.manage',
 'sales.view','sales.manage','sales.collect','sales.return',
 'purchases.view','purchases.manage','purchases.pay','purchases.return',
 'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
 'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.enforce_business_tax_configuration_write()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if current_user <> 'postgres' or coalesce(current_setting('app.business_tax_configuration_write',true),'') <> 'on' then
    raise exception 'Tax configuration is managed by the tax engine.' using errcode='55000';
  end if;
  return case when tg_op='DELETE' then old else new end;
end$$;

create or replace function private.enforce_business_tax_filing_write()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if current_user <> 'postgres' or coalesce(current_setting('app.business_tax_filing_write',true),'') <> 'on' then
    raise exception 'Tax filings are managed by the tax engine.' using errcode='55000';
  end if;
  return case when tg_op='DELETE' then old else new end;
end$$;

create or replace function private.enforce_business_fiscal_period_engine_state()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare transition text:=coalesce(current_setting('app.business_period_transition',true),'');
begin
  if tg_op='INSERT' then
    if new.status<>'open' or new.closed_at is not null or new.locked_at is not null
      or new.close_journal_entry_id is not null or new.reopen_journal_entry_id is not null then
      raise exception 'New fiscal periods must start open.' using errcode='23514';
    end if;
    return new;
  end if;
  if new.business_id<>old.business_id or new.starts_on<>old.starts_on or new.ends_on<>old.ends_on then
    raise exception 'Fiscal period tenant and dates are immutable.' using errcode='23514';
  end if;
  if new.status is distinct from old.status or new.closed_by is distinct from old.closed_by
    or new.closed_at is distinct from old.closed_at or new.locked_at is distinct from old.locked_at
    or new.close_journal_entry_id is distinct from old.close_journal_entry_id
    or new.reopen_journal_entry_id is distinct from old.reopen_journal_entry_id
    or new.closing_net_income_base is distinct from old.closing_net_income_base
    or new.closing_snapshot is distinct from old.closing_snapshot
    or new.close_notes is distinct from old.close_notes
    or new.reopened_by is distinct from old.reopened_by or new.reopened_at is distinct from old.reopened_at then
    if current_user <> 'postgres' or transition not in('close','lock','reopen') then
      raise exception 'Fiscal period state is managed by the closing engine.' using errcode='55000';
    end if;
  end if;
  if transition='close' and not(old.status='open' and new.status='closed') then
    raise exception 'Invalid fiscal close transition.' using errcode='55000';
  elsif transition='lock' and not(old.status='closed' and new.status='locked') then
    raise exception 'Invalid fiscal lock transition.' using errcode='55000';
  elsif transition='reopen' and not(old.status='closed' and new.status='open') and new.status is distinct from old.status then
    raise exception 'Invalid fiscal reopen transition.' using errcode='55000';
  end if;
  return new;
end$$;

create or replace function private.save_business_tax_settings_internal(
 p_business_id uuid,p_tax_enabled boolean default null,p_registration_number text default null,
 p_filing_frequency text default null,p_prices_include_tax boolean default null,p_rounding_method text default null,
 p_default_sales_tax_code_id uuid default null,p_default_purchase_tax_code_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();r public.business_tax_settings%rowtype;
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 if p_default_sales_tax_code_id is not null and not exists(select 1 from public.business_tax_codes where id=p_default_sales_tax_code_id and business_id=p_business_id and is_active and applicability in('sales','both')) then raise exception 'Default sales tax code is invalid.' using errcode='23514';end if;
 if p_default_purchase_tax_code_id is not null and not exists(select 1 from public.business_tax_codes where id=p_default_purchase_tax_code_id and business_id=p_business_id and is_active and applicability in('purchases','both')) then raise exception 'Default purchase tax code is invalid.' using errcode='23514';end if;
 perform set_config('app.business_tax_configuration_write','on',true);
 insert into public.business_tax_settings(business_id,tax_enabled,registration_number,filing_frequency,prices_include_tax,rounding_method,default_sales_tax_code_id,default_purchase_tax_code_id,created_by,updated_by)
 values(p_business_id,coalesce(p_tax_enabled,false),nullif(btrim(coalesce(p_registration_number,'')),''),coalesce(p_filing_frequency,'monthly'),coalesce(p_prices_include_tax,false),coalesce(p_rounding_method,'per_line'),p_default_sales_tax_code_id,p_default_purchase_tax_code_id,u,u)
 on conflict(business_id) do update set
  tax_enabled=coalesce(p_tax_enabled,business_tax_settings.tax_enabled),
  registration_number=case when p_registration_number is null then business_tax_settings.registration_number else nullif(btrim(p_registration_number),'') end,
  filing_frequency=coalesce(p_filing_frequency,business_tax_settings.filing_frequency),
  prices_include_tax=coalesce(p_prices_include_tax,business_tax_settings.prices_include_tax),
  rounding_method=coalesce(p_rounding_method,business_tax_settings.rounding_method),
  default_sales_tax_code_id=coalesce(p_default_sales_tax_code_id,business_tax_settings.default_sales_tax_code_id),
  default_purchase_tax_code_id=coalesce(p_default_purchase_tax_code_id,business_tax_settings.default_purchase_tax_code_id),
  updated_by=u,updated_at=now()
 returning * into r;
 return to_jsonb(r);
end$$;

create or replace function private.upsert_business_tax_code_internal(
 p_business_id uuid,p_tax_code_id uuid default null,p_code text default null,p_name text default null,
 p_treatment text default 'standard',p_applicability text default 'both',p_rate numeric default 0,
 p_recoverable_percent numeric default 100,p_output_account_id uuid default null,p_input_account_id uuid default null,
 p_effective_from date default null,p_effective_to date default null,p_is_active boolean default true
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();cid uuid;oc uuid:=p_output_account_id;ic uuid:=p_input_account_id;old public.business_tax_codes%rowtype;used boolean;
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 if oc is null then select id into oc from public.business_chart_of_accounts where business_id=p_business_id and system_key='taxes_payable' and is_active;end if;
 if ic is null then select id into ic from public.business_chart_of_accounts where business_id=p_business_id and system_key='tax_recoverable' and is_active;end if;
 if oc is not null and not exists(select 1 from public.business_chart_of_accounts where id=oc and business_id=p_business_id and is_active and account_type='liability') then raise exception 'Output tax account must be an active liability account.' using errcode='23514';end if;
 if ic is not null and not exists(select 1 from public.business_chart_of_accounts where id=ic and business_id=p_business_id and is_active and account_type='asset') then raise exception 'Input tax account must be an active asset account.' using errcode='23514';end if;
 perform set_config('app.business_tax_configuration_write','on',true);
 if p_tax_code_id is null then
  insert into public.business_tax_codes(business_id,code,name,treatment,applicability,rate,recoverable_percent,output_account_id,input_account_id,effective_from,effective_to,is_active,created_by,updated_by)
  values(p_business_id,upper(btrim(p_code)),btrim(p_name),p_treatment,p_applicability,p_rate,p_recoverable_percent,oc,ic,p_effective_from,p_effective_to,p_is_active,u,u)
  returning id into cid;
 else
  select * into old from public.business_tax_codes where id=p_tax_code_id and business_id=p_business_id for update;
  if not found then raise exception 'Tax code not found.' using errcode='P0002';end if;
  select old.treatment='standard' and old.rate>0 and exists(
    select 1 from public.business_sales_invoice_lines where business_id=p_business_id and tax_rate=old.rate
    union all select 1 from public.business_supplier_bill_lines where business_id=p_business_id and tax_rate=old.rate
  ) into used;
  if used and (upper(btrim(p_code))<>old.code or p_treatment<>old.treatment or p_applicability<>old.applicability or p_rate<>old.rate or p_recoverable_percent<>old.recoverable_percent or oc is distinct from old.output_account_id or ic is distinct from old.input_account_id or p_effective_from is distinct from old.effective_from) then
    raise exception 'Used tax calculation fields are immutable. Create a new code for a new rate.' using errcode='55000';
  end if;
  update public.business_tax_codes set code=upper(btrim(p_code)),name=btrim(p_name),treatment=p_treatment,
    applicability=p_applicability,rate=p_rate,recoverable_percent=p_recoverable_percent,
    output_account_id=oc,input_account_id=ic,effective_from=p_effective_from,effective_to=p_effective_to,
    is_active=p_is_active,updated_by=u,updated_at=now()
  where id=p_tax_code_id and business_id=p_business_id returning id into cid;
 end if;
 return cid;
end$$;

create or replace function private.prepare_business_tax_filing_internal(
 p_business_id uuid,p_period_start date,p_period_end date,p_notes text default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();snap jsonb;fid uuid;existing_status text;
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 snap:=public.get_business_tax_snapshot(p_business_id,p_period_start,p_period_end);
 perform set_config('app.business_tax_filing_write','on',true);
 select id,status into fid,existing_status from public.business_tax_filings
 where business_id=p_business_id and period_start=p_period_start and period_end=p_period_end for update;
 if fid is not null and existing_status<>'draft' then raise exception 'Filed, paid, or void tax periods cannot be regenerated.' using errcode='55000';end if;
 insert into public.business_tax_filings(business_id,period_start,period_end,status,output_tax_base,input_tax_base,net_tax_base,source_snapshot,notes,prepared_by)
 values(p_business_id,p_period_start,p_period_end,'draft',(snap#>>'{summary,output_tax}')::numeric,(snap#>>'{summary,input_tax}')::numeric,(snap#>>'{summary,net_tax}')::numeric,snap,nullif(btrim(coalesce(p_notes,'')),''),u)
 on conflict(business_id,period_start,period_end) do update set output_tax_base=excluded.output_tax_base,
  input_tax_base=excluded.input_tax_base,net_tax_base=excluded.net_tax_base,source_snapshot=excluded.source_snapshot,
  notes=excluded.notes,prepared_by=u,updated_at=now()
 returning id into fid;
 return fid;
end$$;

create or replace function private.set_business_tax_filing_status_internal(
 p_business_id uuid,p_filing_id uuid,p_status text
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();f public.business_tax_filings%rowtype;target text:=lower(btrim(p_status));
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 select * into f from public.business_tax_filings where id=p_filing_id and business_id=p_business_id for update;
 if not found then raise exception 'Tax filing not found.' using errcode='P0002';end if;
 perform set_config('app.business_tax_filing_write','on',true);
 if target='filed' and f.status='draft' then
  update public.business_tax_filings set status='filed',filed_by=u,filed_at=now(),updated_at=now() where id=f.id returning * into f;
 elsif target='paid' and f.status='filed' then
  update public.business_tax_filings set status='paid',paid_by=u,paid_at=now(),updated_at=now() where id=f.id returning * into f;
 elsif target='void' and f.status in('draft','filed') then
  update public.business_tax_filings set status='void',updated_at=now() where id=f.id returning * into f;
 else raise exception 'Unsupported tax filing status transition.' using errcode='55000';
 end if;
 return to_jsonb(f);
end$$;

revoke all on function private.save_business_tax_settings_internal(uuid,boolean,text,text,boolean,text,uuid,uuid),
 private.upsert_business_tax_code_internal(uuid,uuid,text,text,text,text,numeric,numeric,uuid,uuid,date,date,boolean),
 private.prepare_business_tax_filing_internal(uuid,date,date,text),
 private.set_business_tax_filing_status_internal(uuid,uuid,text)
from public,anon;
grant execute on function private.save_business_tax_settings_internal(uuid,boolean,text,text,boolean,text,uuid,uuid),
 private.upsert_business_tax_code_internal(uuid,uuid,text,text,text,text,numeric,numeric,uuid,uuid,date,date,boolean),
 private.prepare_business_tax_filing_internal(uuid,date,date,text),
 private.set_business_tax_filing_status_internal(uuid,uuid,text)
to authenticated;

create or replace function public.save_business_tax_settings(
 p_business_id uuid,p_tax_enabled boolean default null,p_registration_number text default null,
 p_filing_frequency text default null,p_prices_include_tax boolean default null,p_rounding_method text default null,
 p_default_sales_tax_code_id uuid default null,p_default_purchase_tax_code_id uuid default null
)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$
begin return private.save_business_tax_settings_internal(p_business_id,p_tax_enabled,p_registration_number,p_filing_frequency,p_prices_include_tax,p_rounding_method,p_default_sales_tax_code_id,p_default_purchase_tax_code_id);end$$;

create or replace function public.upsert_business_tax_code(
 p_business_id uuid,p_tax_code_id uuid default null,p_code text default null,p_name text default null,
 p_treatment text default 'standard',p_applicability text default 'both',p_rate numeric default 0,
 p_recoverable_percent numeric default 100,p_output_account_id uuid default null,p_input_account_id uuid default null,
 p_effective_from date default null,p_effective_to date default null,p_is_active boolean default true
)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public,private as $$
begin return private.upsert_business_tax_code_internal(p_business_id,p_tax_code_id,p_code,p_name,p_treatment,p_applicability,p_rate,p_recoverable_percent,p_output_account_id,p_input_account_id,p_effective_from,p_effective_to,p_is_active);end$$;

create or replace function public.prepare_business_tax_filing(
 p_business_id uuid,p_period_start date,p_period_end date,p_notes text default null
)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public,private as $$
begin return private.prepare_business_tax_filing_internal(p_business_id,p_period_start,p_period_end,p_notes);end$$;

create or replace function public.set_business_tax_filing_status(
 p_business_id uuid,p_filing_id uuid,p_status text
)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$
begin return private.set_business_tax_filing_status_internal(p_business_id,p_filing_id,p_status);end$$;

revoke all on function public.save_business_tax_settings(uuid,boolean,text,text,boolean,text,uuid,uuid),
 public.upsert_business_tax_code(uuid,uuid,text,text,text,text,numeric,numeric,uuid,uuid,date,date,boolean),
 public.prepare_business_tax_filing(uuid,date,date,text),public.set_business_tax_filing_status(uuid,uuid,text)
from public,anon;
grant execute on function public.save_business_tax_settings(uuid,boolean,text,text,boolean,text,uuid,uuid),
 public.upsert_business_tax_code(uuid,uuid,text,text,text,text,numeric,numeric,uuid,uuid,date,date,boolean),
 public.prepare_business_tax_filing(uuid,date,date,text),public.set_business_tax_filing_status(uuid,uuid,text)
to authenticated;
