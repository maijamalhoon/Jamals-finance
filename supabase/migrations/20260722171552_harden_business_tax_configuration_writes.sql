create or replace function private.enforce_business_tax_configuration_write()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if coalesce(current_setting('app.business_tax_configuration_write',true),'')<>'on' then
    raise exception 'Tax configuration is managed by the tax engine.' using errcode='55000';
  end if;
  return case when tg_op='DELETE' then old else new end;
end$$;
revoke all on function private.enforce_business_tax_configuration_write() from public,anon,authenticated;
create trigger business_tax_codes_engine_write before insert or update or delete on public.business_tax_codes
for each row execute function private.enforce_business_tax_configuration_write();
create trigger business_tax_settings_engine_write before insert or update or delete on public.business_tax_settings
for each row execute function private.enforce_business_tax_configuration_write();

create or replace function private.initialize_business_tax_defaults(p_business_id uuid,p_owner_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare out_id uuid;in_id uuid;
begin
 perform set_config('app.business_tax_configuration_write','on',true);
 if not exists(select 1 from public.businesses b where b.id=p_business_id and b.owner_user_id=p_owner_id and b.status='active') then raise exception 'Business owner verification failed.' using errcode='42501';end if;
 select id into out_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='taxes_payable' and is_active;
 select id into in_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='tax_recoverable' and is_active;
 insert into public.business_tax_settings(business_id,created_by,updated_by) values(p_business_id,p_owner_id,p_owner_id) on conflict do nothing;
 insert into public.business_tax_codes(business_id,code,name,treatment,applicability,rate,recoverable_percent,output_account_id,input_account_id,created_by,updated_by)
 values(p_business_id,'ZERO','Zero-rated','zero_rated','both',0,100,out_id,in_id,p_owner_id,p_owner_id),
       (p_business_id,'EXEMPT','Exempt','exempt','both',0,0,out_id,in_id,p_owner_id,p_owner_id)
 on conflict(business_id,code) do nothing;
end$$;
revoke all on function private.initialize_business_tax_defaults(uuid,uuid) from public,anon,authenticated;

create or replace function public.save_business_tax_settings(p_business_id uuid,p_tax_enabled boolean default null,p_registration_number text default null,p_filing_frequency text default null,p_prices_include_tax boolean default null,p_rounding_method text default null,p_default_sales_tax_code_id uuid default null,p_default_purchase_tax_code_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();r public.business_tax_settings%rowtype;
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 if p_default_sales_tax_code_id is not null and not exists(select 1 from public.business_tax_codes where id=p_default_sales_tax_code_id and business_id=p_business_id and is_active and applicability in('sales','both')) then raise exception 'Default sales tax code is invalid.' using errcode='23514';end if;
 if p_default_purchase_tax_code_id is not null and not exists(select 1 from public.business_tax_codes where id=p_default_purchase_tax_code_id and business_id=p_business_id and is_active and applicability in('purchases','both')) then raise exception 'Default purchase tax code is invalid.' using errcode='23514';end if;
 perform set_config('app.business_tax_configuration_write','on',true);
 insert into public.business_tax_settings(business_id,tax_enabled,registration_number,filing_frequency,prices_include_tax,rounding_method,default_sales_tax_code_id,default_purchase_tax_code_id,created_by,updated_by)
 values(p_business_id,coalesce(p_tax_enabled,false),nullif(btrim(coalesce(p_registration_number,'')),''),coalesce(p_filing_frequency,'monthly'),coalesce(p_prices_include_tax,false),coalesce(p_rounding_method,'per_line'),p_default_sales_tax_code_id,p_default_purchase_tax_code_id,u,u)
 on conflict(business_id) do update set tax_enabled=coalesce(p_tax_enabled,business_tax_settings.tax_enabled),registration_number=case when p_registration_number is null then business_tax_settings.registration_number else nullif(btrim(p_registration_number),'') end,filing_frequency=coalesce(p_filing_frequency,business_tax_settings.filing_frequency),prices_include_tax=coalesce(p_prices_include_tax,business_tax_settings.prices_include_tax),rounding_method=coalesce(p_rounding_method,business_tax_settings.rounding_method),default_sales_tax_code_id=coalesce(p_default_sales_tax_code_id,business_tax_settings.default_sales_tax_code_id),default_purchase_tax_code_id=coalesce(p_default_purchase_tax_code_id,business_tax_settings.default_purchase_tax_code_id),updated_by=u,updated_at=now() returning * into r;
 return to_jsonb(r);
end$$;

create or replace function public.upsert_business_tax_code(p_business_id uuid,p_tax_code_id uuid default null,p_code text default null,p_name text default null,p_treatment text default 'standard',p_applicability text default 'both',p_rate numeric default 0,p_recoverable_percent numeric default 100,p_output_account_id uuid default null,p_input_account_id uuid default null,p_effective_from date default null,p_effective_to date default null,p_is_active boolean default true)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();cid uuid;oc uuid:=p_output_account_id;ic uuid:=p_input_account_id;old public.business_tax_codes%rowtype;used boolean;
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 if oc is null then select id into oc from public.business_chart_of_accounts where business_id=p_business_id and system_key='taxes_payable' and is_active;end if;
 if ic is null then select id into ic from public.business_chart_of_accounts where business_id=p_business_id and system_key='tax_recoverable' and is_active;end if;
 if oc is not null and not exists(select 1 from public.business_chart_of_accounts where id=oc and business_id=p_business_id and is_active and account_type='liability') then raise exception 'Output tax account must be an active liability account.' using errcode='23514';end if;
 if ic is not null and not exists(select 1 from public.business_chart_of_accounts where id=ic and business_id=p_business_id and is_active and account_type='asset') then raise exception 'Input tax account must be an active asset account.' using errcode='23514';end if;
 perform set_config('app.business_tax_configuration_write','on',true);
 if p_tax_code_id is null then insert into public.business_tax_codes(business_id,code,name,treatment,applicability,rate,recoverable_percent,output_account_id,input_account_id,effective_from,effective_to,is_active,created_by,updated_by) values(p_business_id,upper(btrim(p_code)),btrim(p_name),p_treatment,p_applicability,p_rate,p_recoverable_percent,oc,ic,p_effective_from,p_effective_to,p_is_active,u,u) returning id into cid;
 else select * into old from public.business_tax_codes where id=p_tax_code_id and business_id=p_business_id for update;if not found then raise exception 'Tax code not found.' using errcode='P0002';end if;
  select old.treatment='standard' and old.rate>0 and exists(select 1 from public.business_sales_invoice_lines where business_id=p_business_id and tax_rate=old.rate union all select 1 from public.business_supplier_bill_lines where business_id=p_business_id and tax_rate=old.rate) into used;
  if used and (upper(btrim(p_code))<>old.code or p_treatment<>old.treatment or p_applicability<>old.applicability or p_rate<>old.rate or p_recoverable_percent<>old.recoverable_percent or oc is distinct from old.output_account_id or ic is distinct from old.input_account_id or p_effective_from is distinct from old.effective_from) then raise exception 'Used tax calculation fields are immutable. Create a new code for a new rate.' using errcode='55000';end if;
  update public.business_tax_codes set code=upper(btrim(p_code)),name=btrim(p_name),treatment=p_treatment,applicability=p_applicability,rate=p_rate,recoverable_percent=p_recoverable_percent,output_account_id=oc,input_account_id=ic,effective_from=p_effective_from,effective_to=p_effective_to,is_active=p_is_active,updated_by=u,updated_at=now() where id=p_tax_code_id and business_id=p_business_id returning id into cid;
 end if;return cid;
end$$;
