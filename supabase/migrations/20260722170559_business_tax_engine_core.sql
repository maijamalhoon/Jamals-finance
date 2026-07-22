create or replace function private.can_view_business_tax(p_business_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public as $$
  select auth.uid() is not null and exists(
    select 1 from public.business_members m
    where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active'
      and (m.role in('owner','admin','accountant','manager','viewer') or '*'=any(m.permissions)
        or 'tax.view'=any(m.permissions) or 'tax.manage'=any(m.permissions)
        or 'accounting.view'=any(m.permissions) or 'reports.view'=any(m.permissions))
  )
$$;
create or replace function private.can_manage_business_tax(p_business_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public as $$
  select auth.uid() is not null and exists(
    select 1 from public.business_members m
    where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active'
      and (m.role in('owner','admin','accountant') or '*'=any(m.permissions)
        or 'tax.manage'=any(m.permissions) or 'accounting.manage'=any(m.permissions))
  )
$$;
revoke all on function private.can_view_business_tax(uuid),private.can_manage_business_tax(uuid) from public,anon;
grant execute on function private.can_view_business_tax(uuid),private.can_manage_business_tax(uuid) to authenticated;

create table public.business_tax_codes(
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 code text not null, name text not null, treatment text not null default 'standard', applicability text not null default 'both',
 rate numeric(9,6) not null default 0, recoverable_percent numeric(9,6) not null default 100,
 output_account_id uuid, input_account_id uuid, effective_from date, effective_to date, is_active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(code ~ '^[A-Z0-9][A-Z0-9._-]{0,19}$'), check(char_length(btrim(name)) between 2 and 120),
 check(treatment in('standard','zero_rated','exempt','out_of_scope')), check(applicability in('sales','purchases','both')),
 check(rate between 0 and 100 and ((treatment='standard' and rate>0) or (treatment<>'standard' and rate=0))),
 check(recoverable_percent between 0 and 100), check(effective_to is null or effective_from is null or effective_to>=effective_from),
 unique(business_id,code), unique(business_id,id),
 foreign key(business_id,output_account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict,
 foreign key(business_id,input_account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict
);
create table public.business_tax_settings(
 business_id uuid primary key references public.businesses(id) on delete cascade, tax_enabled boolean not null default false,
 registration_number text, filing_frequency text not null default 'monthly', prices_include_tax boolean not null default false,
 rounding_method text not null default 'per_line', default_sales_tax_code_id uuid, default_purchase_tax_code_id uuid,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(registration_number is null or char_length(btrim(registration_number)) between 2 and 80),
 check(filing_frequency in('monthly','quarterly','annual')), check(rounding_method in('per_line','per_document')),
 foreign key(business_id,default_sales_tax_code_id) references public.business_tax_codes(business_id,id) on delete restrict,
 foreign key(business_id,default_purchase_tax_code_id) references public.business_tax_codes(business_id,id) on delete restrict
);
create table public.business_tax_filings(
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 period_start date not null, period_end date not null, status text not null default 'draft',
 output_tax_base numeric(24,6) not null default 0,input_tax_base numeric(24,6) not null default 0,net_tax_base numeric(24,6) not null default 0,
 source_snapshot jsonb not null default '{}'::jsonb, notes text, prepared_by uuid not null references auth.users(id) on delete restrict,
 filed_by uuid references auth.users(id) on delete set null,filed_at timestamptz,paid_by uuid references auth.users(id) on delete set null,paid_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(period_start<=period_end),check(status in('draft','filed','paid','void')),check(notes is null or char_length(notes)<=2000),
 check((status='draft' and filed_at is null and paid_at is null) or (status='filed' and filed_at is not null and paid_at is null)
   or (status='paid' and filed_at is not null and paid_at is not null) or status='void'),
 unique(business_id,period_start,period_end),unique(business_id,id)
);
create index business_tax_codes_lookup_idx on public.business_tax_codes(business_id,is_active,applicability,rate);
create index business_tax_filings_period_idx on public.business_tax_filings(business_id,period_end desc,status);
create index business_tax_codes_created_by_idx on public.business_tax_codes(created_by) where created_by is not null;
create index business_tax_codes_updated_by_idx on public.business_tax_codes(updated_by) where updated_by is not null;
create index business_tax_filings_prepared_by_idx on public.business_tax_filings(prepared_by);
create index business_tax_filings_filed_by_idx on public.business_tax_filings(filed_by) where filed_by is not null;
create index business_tax_filings_paid_by_idx on public.business_tax_filings(paid_by) where paid_by is not null;
create trigger business_tax_codes_set_updated_at before update on public.business_tax_codes for each row execute function private.set_business_workspace_updated_at();
create trigger business_tax_settings_set_updated_at before update on public.business_tax_settings for each row execute function private.set_business_workspace_updated_at();
create trigger business_tax_filings_set_updated_at before update on public.business_tax_filings for each row execute function private.set_business_workspace_updated_at();
alter table public.business_tax_codes enable row level security;alter table public.business_tax_settings enable row level security;alter table public.business_tax_filings enable row level security;
create policy business_tax_codes_select on public.business_tax_codes for select to authenticated using((select private.can_view_business_tax(business_id)));
create policy business_tax_codes_insert on public.business_tax_codes for insert to authenticated with check((select private.can_manage_business_tax(business_id)) and created_by=auth.uid());
create policy business_tax_codes_update on public.business_tax_codes for update to authenticated using((select private.can_manage_business_tax(business_id))) with check((select private.can_manage_business_tax(business_id)) and updated_by=auth.uid());
create policy business_tax_codes_delete on public.business_tax_codes for delete to authenticated using((select private.can_manage_business_tax(business_id)));
create policy business_tax_settings_select on public.business_tax_settings for select to authenticated using((select private.can_view_business_tax(business_id)));
create policy business_tax_settings_insert on public.business_tax_settings for insert to authenticated with check((select private.can_manage_business_tax(business_id)) and created_by=auth.uid());
create policy business_tax_settings_update on public.business_tax_settings for update to authenticated using((select private.can_manage_business_tax(business_id))) with check((select private.can_manage_business_tax(business_id)) and updated_by=auth.uid());
create policy business_tax_filings_select on public.business_tax_filings for select to authenticated using((select private.can_view_business_tax(business_id)));
create policy business_tax_filings_insert on public.business_tax_filings for insert to authenticated with check((select private.can_manage_business_tax(business_id)) and prepared_by=auth.uid());
create policy business_tax_filings_update on public.business_tax_filings for update to authenticated using((select private.can_manage_business_tax(business_id))) with check((select private.can_manage_business_tax(business_id)));
create policy business_tax_filings_delete on public.business_tax_filings for delete to authenticated using(status='draft' and (select private.can_manage_business_tax(business_id)));
grant select,insert,update,delete on public.business_tax_codes,public.business_tax_filings to authenticated;
grant select,insert,update on public.business_tax_settings to authenticated;revoke all on public.business_tax_codes,public.business_tax_settings,public.business_tax_filings from anon;

create or replace function private.initialize_business_tax_defaults(p_business_id uuid,p_owner_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare out_id uuid;in_id uuid;
begin
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
create or replace function private.initialize_business_tax_on_owner() returns trigger language plpgsql security definer set search_path=pg_catalog,public,private as $$begin if new.role='owner' and new.status='active' then perform private.initialize_business_tax_defaults(new.business_id,new.user_id);end if;return new;end$$;
revoke all on function private.initialize_business_tax_on_owner() from public,anon,authenticated;
create trigger zz_business_tax_initialize_after_owner_membership after insert or update of role,status on public.business_members for each row execute function private.initialize_business_tax_on_owner();
select private.initialize_business_tax_defaults(id,owner_user_id) from public.businesses where status='active';

create or replace function public.calculate_business_tax(p_business_id uuid,p_tax_code_id uuid,p_amount numeric,p_tax_inclusive boolean default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare c public.business_tax_codes%rowtype;s smallint;i boolean;n numeric(24,6);t numeric(24,6);g numeric(24,6);
begin
 if not private.can_view_business_tax(p_business_id) then raise exception 'Tax reporting permission required.' using errcode='42501';end if;
 if p_amount is null or p_amount<0 then raise exception 'Amount must be zero or greater.' using errcode='22023';end if;
 select * into c from public.business_tax_codes where id=p_tax_code_id and business_id=p_business_id and is_active;if not found then raise exception 'Active tax code not found.' using errcode='P0002';end if;
 select a.rounding_scale,coalesce(p_tax_inclusive,x.prices_include_tax,false) into s,i from public.business_accounting_settings a left join public.business_tax_settings x using(business_id) where a.business_id=p_business_id;
 if c.treatment='standard' and c.rate>0 then if i then g:=round(p_amount,s);n:=round(g/(1+c.rate/100),s);t:=g-n;else n:=round(p_amount,s);t:=round(n*c.rate/100,s);g:=n+t;end if;else n:=round(p_amount,s);t:=0;g:=n;end if;
 return jsonb_build_object('tax_code_id',c.id,'code',c.code,'name',c.name,'treatment',c.treatment,'rate',c.rate,'tax_inclusive',i,'taxable_amount',n,'tax_amount',t,'total_amount',g);
end$$;

create or replace function public.save_business_tax_settings(p_business_id uuid,p_tax_enabled boolean default null,p_registration_number text default null,p_filing_frequency text default null,p_prices_include_tax boolean default null,p_rounding_method text default null,p_default_sales_tax_code_id uuid default null,p_default_purchase_tax_code_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();r public.business_tax_settings%rowtype;
begin
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
 if p_default_sales_tax_code_id is not null and not exists(select 1 from public.business_tax_codes where id=p_default_sales_tax_code_id and business_id=p_business_id and is_active and applicability in('sales','both')) then raise exception 'Default sales tax code is invalid.' using errcode='23514';end if;
 if p_default_purchase_tax_code_id is not null and not exists(select 1 from public.business_tax_codes where id=p_default_purchase_tax_code_id and business_id=p_business_id and is_active and applicability in('purchases','both')) then raise exception 'Default purchase tax code is invalid.' using errcode='23514';end if;
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
 if p_tax_code_id is null then insert into public.business_tax_codes(business_id,code,name,treatment,applicability,rate,recoverable_percent,output_account_id,input_account_id,effective_from,effective_to,is_active,created_by,updated_by) values(p_business_id,upper(btrim(p_code)),btrim(p_name),p_treatment,p_applicability,p_rate,p_recoverable_percent,oc,ic,p_effective_from,p_effective_to,p_is_active,u,u) returning id into cid;
 else select * into old from public.business_tax_codes where id=p_tax_code_id and business_id=p_business_id for update;if not found then raise exception 'Tax code not found.' using errcode='P0002';end if;
  select old.treatment='standard' and old.rate>0 and exists(select 1 from public.business_sales_invoice_lines where business_id=p_business_id and tax_rate=old.rate union all select 1 from public.business_supplier_bill_lines where business_id=p_business_id and tax_rate=old.rate) into used;
  if used and (upper(btrim(p_code))<>old.code or p_treatment<>old.treatment or p_applicability<>old.applicability or p_rate<>old.rate or p_recoverable_percent<>old.recoverable_percent or oc is distinct from old.output_account_id or ic is distinct from old.input_account_id or p_effective_from is distinct from old.effective_from) then raise exception 'Used tax calculation fields are immutable. Create a new code for a new rate.' using errcode='55000';end if;
  update public.business_tax_codes set code=upper(btrim(p_code)),name=btrim(p_name),treatment=p_treatment,applicability=p_applicability,rate=p_rate,recoverable_percent=p_recoverable_percent,output_account_id=oc,input_account_id=ic,effective_from=p_effective_from,effective_to=p_effective_to,is_active=p_is_active,updated_by=u,updated_at=now() where id=p_tax_code_id and business_id=p_business_id returning id into cid;
 end if;return cid;
end$$;

revoke all on function public.calculate_business_tax(uuid,uuid,numeric,boolean),public.save_business_tax_settings(uuid,boolean,text,text,boolean,text,uuid,uuid),public.upsert_business_tax_code(uuid,uuid,text,text,text,text,numeric,numeric,uuid,uuid,date,date,boolean) from public,anon;
grant execute on function public.calculate_business_tax(uuid,uuid,numeric,boolean),public.save_business_tax_settings(uuid,boolean,text,text,boolean,text,uuid,uuid),public.upsert_business_tax_code(uuid,uuid,text,text,text,text,numeric,numeric,uuid,uuid,date,date,boolean) to authenticated;
