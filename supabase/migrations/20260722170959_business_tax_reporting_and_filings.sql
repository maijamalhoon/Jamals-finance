create or replace function private.enforce_business_tax_filing_write()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if coalesce(current_setting('app.business_tax_filing_write',true),'')<>'on' then
    raise exception 'Tax filings are managed by the tax engine.' using errcode='55000';
  end if;
  return case when tg_op='DELETE' then old else new end;
end$$;
revoke all on function private.enforce_business_tax_filing_write() from public,anon,authenticated;
create trigger business_tax_filings_engine_write before insert or update or delete on public.business_tax_filings
for each row execute function private.enforce_business_tax_filing_write();

create or replace function public.get_business_tax_snapshot(
  p_business_id uuid,
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  settings_json jsonb;
  codes_json jsonb;
  filings_json jsonb;
  sales_net numeric(24,6);
  sales_tax numeric(24,6);
  sales_returns_net numeric(24,6);
  sales_returns_tax numeric(24,6);
  purchase_net numeric(24,6);
  purchase_tax numeric(24,6);
  purchase_returns_net numeric(24,6);
  purchase_returns_tax numeric(24,6);
  output_tax numeric(24,6);
  input_tax numeric(24,6);
  net_tax numeric(24,6);
  breakdown_json jsonb;
  source_counts jsonb;
begin
  if not private.can_view_business_tax(p_business_id) then
    raise exception 'Tax reporting permission required.' using errcode='42501';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end<p_period_start then
    raise exception 'Tax period is invalid.' using errcode='22008';
  end if;
  if p_period_end-p_period_start>3660 then
    raise exception 'Tax period cannot exceed ten years.' using errcode='22008';
  end if;

  select coalesce((select to_jsonb(s) from public.business_tax_settings s where s.business_id=p_business_id),'{}'::jsonb) into settings_json;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.is_active desc,c.rate,c.code),'[]'::jsonb)
  into codes_json from public.business_tax_codes c where c.business_id=p_business_id;

  select coalesce(sum(i.subtotal_base-i.discount_base),0),coalesce(sum(i.tax_base),0)
  into sales_net,sales_tax
  from public.business_sales_invoices i
  where i.business_id=p_business_id and i.status in('issued','partially_paid','paid')
    and i.invoice_date between p_period_start and p_period_end;

  select coalesce(sum(r.net_base),0),coalesce(sum(r.tax_base),0)
  into sales_returns_net,sales_returns_tax
  from public.business_sales_returns r
  where r.business_id=p_business_id and r.status='posted'
    and r.return_date between p_period_start and p_period_end;

  select coalesce(sum(b.subtotal_base-b.discount_base),0),coalesce(sum(b.tax_base),0)
  into purchase_net,purchase_tax
  from public.business_supplier_bills b
  where b.business_id=p_business_id and b.status in('issued','partially_paid','paid')
    and b.bill_date between p_period_start and p_period_end;

  select coalesce(sum(r.net_base),0),coalesce(sum(r.tax_base),0)
  into purchase_returns_net,purchase_returns_tax
  from public.business_purchase_returns r
  where r.business_id=p_business_id and r.status='posted'
    and r.return_date between p_period_start and p_period_end;

  output_tax:=sales_tax-sales_returns_tax;
  input_tax:=purchase_tax-purchase_returns_tax;
  net_tax:=output_tax-input_tax;

  with rate_rows as (
    select 'sales'::text source_kind,l.tax_rate rate,sum(l.net_base) taxable_base,sum(l.tax_base) tax_base
    from public.business_sales_invoice_lines l join public.business_sales_invoices i
      on i.business_id=l.business_id and i.id=l.invoice_id
    where l.business_id=p_business_id and i.status in('issued','partially_paid','paid')
      and i.invoice_date between p_period_start and p_period_end group by l.tax_rate
    union all
    select 'sales_return',l.tax_rate,-sum(r.net_base),-sum(r.tax_base)
    from public.business_sales_return_lines r join public.business_sales_returns h
      on h.business_id=r.business_id and h.id=r.return_id
    join public.business_sales_invoice_lines l on l.business_id=r.business_id and l.id=r.invoice_line_id
    where r.business_id=p_business_id and h.status='posted'
      and h.return_date between p_period_start and p_period_end group by l.tax_rate
    union all
    select 'purchase',l.tax_rate,sum(l.net_base),sum(l.tax_base)
    from public.business_supplier_bill_lines l join public.business_supplier_bills b
      on b.business_id=l.business_id and b.id=l.bill_id
    where l.business_id=p_business_id and b.status in('issued','partially_paid','paid')
      and b.bill_date between p_period_start and p_period_end group by l.tax_rate
    union all
    select 'purchase_return',l.tax_rate,-sum(r.net_base),-sum(r.tax_base)
    from public.business_purchase_return_lines r join public.business_purchase_returns h
      on h.business_id=r.business_id and h.id=r.return_id
    join public.business_supplier_bill_lines l on l.business_id=r.business_id and l.id=r.bill_line_id
    where r.business_id=p_business_id and h.status='posted'
      and h.return_date between p_period_start and p_period_end group by l.tax_rate
  ), grouped as (
    select source_kind,rate,sum(taxable_base)::numeric(24,6) taxable_base,sum(tax_base)::numeric(24,6) tax_base
    from rate_rows group by source_kind,rate
  )
  select coalesce(jsonb_agg(jsonb_build_object('source_kind',source_kind,'rate',rate,'taxable_base',taxable_base,'tax_base',tax_base)
    order by source_kind,rate),'[]'::jsonb) into breakdown_json from grouped;

  select jsonb_build_object(
    'sales_invoices',(select count(*) from public.business_sales_invoices where business_id=p_business_id and status in('issued','partially_paid','paid') and invoice_date between p_period_start and p_period_end),
    'sales_returns',(select count(*) from public.business_sales_returns where business_id=p_business_id and status='posted' and return_date between p_period_start and p_period_end),
    'supplier_bills',(select count(*) from public.business_supplier_bills where business_id=p_business_id and status in('issued','partially_paid','paid') and bill_date between p_period_start and p_period_end),
    'purchase_returns',(select count(*) from public.business_purchase_returns where business_id=p_business_id and status='posted' and return_date between p_period_start and p_period_end)
  ) into source_counts;

  select coalesce(jsonb_agg(to_jsonb(f) order by f.period_end desc),'[]'::jsonb)
  into filings_json from public.business_tax_filings f where f.business_id=p_business_id;

  return jsonb_build_object(
    'business_id',p_business_id,'period_start',p_period_start,'period_end',p_period_end,
    'settings',settings_json,'tax_codes',codes_json,
    'summary',jsonb_build_object(
      'sales_taxable_base',sales_net-sales_returns_net,'purchase_taxable_base',purchase_net-purchase_returns_net,
      'gross_output_tax',sales_tax,'sales_return_tax',sales_returns_tax,'output_tax',output_tax,
      'gross_input_tax',purchase_tax,'purchase_return_tax',purchase_returns_tax,'input_tax',input_tax,
      'net_tax',net_tax,'payable',greatest(net_tax,0),'credit',greatest(-net_tax,0)
    ),
    'rate_breakdown',breakdown_json,'source_counts',source_counts,'filings',filings_json
  );
end$$;

create or replace function public.prepare_business_tax_filing(
  p_business_id uuid,p_period_start date,p_period_end date,p_notes text default null
)
returns uuid
language plpgsql security invoker set search_path=pg_catalog,public
as $$
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
  on conflict(business_id,period_start,period_end) do update set
    output_tax_base=excluded.output_tax_base,input_tax_base=excluded.input_tax_base,net_tax_base=excluded.net_tax_base,
    source_snapshot=excluded.source_snapshot,notes=excluded.notes,prepared_by=u,updated_at=now()
  returning id into fid;
  return fid;
end$$;

create or replace function public.set_business_tax_filing_status(
  p_business_id uuid,p_filing_id uuid,p_status text
)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare u uuid:=auth.uid();f public.business_tax_filings%rowtype;target text:=lower(btrim(p_status));
begin
  if not private.can_manage_business_tax(p_business_id) then raise exception 'Tax management permission required.' using errcode='42501';end if;
  select * into f from public.business_tax_filings where id=p_filing_id and business_id=p_business_id for update;
  perform set_config('app.business_tax_filing_write','on',true);
  if not found then raise exception 'Tax filing not found.' using errcode='P0002';end if;
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

revoke all on function public.get_business_tax_snapshot(uuid,date,date),public.prepare_business_tax_filing(uuid,date,date,text),public.set_business_tax_filing_status(uuid,uuid,text) from public,anon;
grant execute on function public.get_business_tax_snapshot(uuid,date,date),public.prepare_business_tax_filing(uuid,date,date,text),public.set_business_tax_filing_status(uuid,uuid,text) to authenticated;
