alter table public.business_fx_revaluation_lines
  add column if not exists rate_id uuid;
alter table public.business_fx_revaluation_lines
  add constraint business_fx_revaluation_lines_rate_fkey
  foreign key(business_id,rate_id) references public.business_fx_rates(business_id,id) on delete restrict;
create index if not exists business_fx_lines_rate_idx on public.business_fx_revaluation_lines(business_id,rate_id);

create or replace function private.has_business_fx_scope(p_business_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
select p_user_id is not null and exists(
  select 1 from public.business_members membership
  where membership.business_id=p_business_id
    and membership.user_id=p_user_id
    and membership.status='active'
    and (
      membership.role in ('owner','admin')
      or '*'=any(membership.permissions)
      or membership.branch_access_mode='all'
    )
);
$$;

create or replace function private.can_view_business_fx(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,private
as $$
select private.has_business_fx_scope(p_business_id,auth.uid()) and exists(
  select 1 from public.business_members membership
  where membership.business_id=p_business_id and membership.user_id=auth.uid() and membership.status='active'
    and (membership.role in ('owner','admin','accountant') or '*'=any(membership.permissions)
      or 'fx.view'=any(membership.permissions) or 'fx.manage'=any(membership.permissions) or 'fx.revalue'=any(membership.permissions))
);
$$;

create or replace function private.can_manage_business_fx(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,private
as $$
select private.has_business_fx_scope(p_business_id,auth.uid()) and exists(
  select 1 from public.business_members membership
  where membership.business_id=p_business_id and membership.user_id=auth.uid() and membership.status='active'
    and (membership.role in ('owner','admin') or '*'=any(membership.permissions) or 'fx.manage'=any(membership.permissions))
);
$$;

create or replace function private.can_revalue_business_fx(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,private
as $$
select private.has_business_fx_scope(p_business_id,auth.uid()) and exists(
  select 1 from public.business_members membership
  where membership.business_id=p_business_id and membership.user_id=auth.uid() and membership.status='active'
    and (membership.role in ('owner','admin','accountant') or '*'=any(membership.permissions)
      or 'fx.manage'=any(membership.permissions) or 'fx.revalue'=any(membership.permissions))
);
$$;

create or replace function private.business_team_permission_catalog()
returns text[] language sql immutable set search_path=pg_catalog
as $$ select array[
  'team.view','team.manage','notifications.view','notifications.manage',
  'accounting.view','accounting.manage','banking.view','banking.manage','tax.view','tax.manage',
  'budget.view','budget.manage','budget.approve','documents.view','documents.manage',
  'branches.view','branches.manage','approvals.view','approvals.request','approvals.decide','approvals.manage',
  'payroll.view','payroll.manage','payroll.process','payroll.pay',
  'assets.view','assets.manage','assets.depreciate','assets.dispose',
  'fx.view','fx.manage','fx.revalue',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[]; $$;

create or replace function private.write_business_fx_audit(
  p_business_id uuid,p_rate_id uuid,p_run_id uuid,p_action text,p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
  insert into public.business_fx_audit_log(business_id,rate_id,revaluation_run_id,action,actor_id,metadata)
  values(p_business_id,p_rate_id,p_run_id,btrim(p_action),auth.uid(),coalesce(p_metadata,'{}'::jsonb));
end;
$$;

create or replace function private.ensure_business_fx_foundation(p_business_id uuid,p_actor_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare
  v_base text;
  v_realized_gain uuid;v_realized_loss uuid;v_unrealized_gain uuid;v_unrealized_loss uuid;
begin
  select base_currency into v_base from public.businesses where id=p_business_id and status='active';
  if v_base is null then raise exception 'Active business not found.' using errcode='P0002';end if;

  select id into v_realized_gain from public.business_chart_of_accounts where business_id=p_business_id and system_key='realized_fx_gain';
  if v_realized_gain is null then
    if exists(select 1 from public.business_chart_of_accounts where business_id=p_business_id and code='4920-FX') then raise exception 'Chart code 4920-FX is already used by another account.' using errcode='23505'; end if;
    insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
    values(p_business_id,'4920-FX','Realized foreign exchange gain','revenue','foreign_exchange','credit','realized_fx_gain',false,p_actor_id)
    returning id into v_realized_gain;
  end if;

  select id into v_unrealized_gain from public.business_chart_of_accounts where business_id=p_business_id and system_key='unrealized_fx_gain';
  if v_unrealized_gain is null then
    if exists(select 1 from public.business_chart_of_accounts where business_id=p_business_id and code='4930-FX') then raise exception 'Chart code 4930-FX is already used by another account.' using errcode='23505'; end if;
    insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
    values(p_business_id,'4930-FX','Unrealized foreign exchange gain','revenue','foreign_exchange','credit','unrealized_fx_gain',false,p_actor_id)
    returning id into v_unrealized_gain;
  end if;

  select id into v_realized_loss from public.business_chart_of_accounts where business_id=p_business_id and system_key='realized_fx_loss';
  if v_realized_loss is null then
    if exists(select 1 from public.business_chart_of_accounts where business_id=p_business_id and code='6920-FX') then raise exception 'Chart code 6920-FX is already used by another account.' using errcode='23505'; end if;
    insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
    values(p_business_id,'6920-FX','Realized foreign exchange loss','expense','foreign_exchange','debit','realized_fx_loss',false,p_actor_id)
    returning id into v_realized_loss;
  end if;

  select id into v_unrealized_loss from public.business_chart_of_accounts where business_id=p_business_id and system_key='unrealized_fx_loss';
  if v_unrealized_loss is null then
    if exists(select 1 from public.business_chart_of_accounts where business_id=p_business_id and code='6930-FX') then raise exception 'Chart code 6930-FX is already used by another account.' using errcode='23505'; end if;
    insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
    values(p_business_id,'6930-FX','Unrealized foreign exchange loss','expense','foreign_exchange','debit','unrealized_fx_loss',false,p_actor_id)
    returning id into v_unrealized_loss;
  end if;

  update public.business_chart_of_accounts set allow_manual_posting=false,updated_at=now()
  where business_id=p_business_id and id in(v_realized_gain,v_unrealized_gain,v_realized_loss,v_unrealized_loss);

  insert into public.business_fx_settings(business_id,realized_gain_account_id,realized_loss_account_id,unrealized_gain_account_id,unrealized_loss_account_id,updated_by)
  values(p_business_id,v_realized_gain,v_realized_loss,v_unrealized_gain,v_unrealized_loss,p_actor_id)
  on conflict(business_id) do update set realized_gain_account_id=excluded.realized_gain_account_id,realized_loss_account_id=excluded.realized_loss_account_id,unrealized_gain_account_id=excluded.unrealized_gain_account_id,unrealized_loss_account_id=excluded.unrealized_loss_account_id,updated_by=excluded.updated_by,updated_at=now();
end;
$$;

create or replace function private.initialize_business_fx_on_owner()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private
as $$
begin
  if new.role='owner' and new.status='active' then perform private.ensure_business_fx_foundation(new.business_id,new.user_id);end if;
  return new;
end;
$$;

drop trigger if exists business_members_initialize_fx on public.business_members;
create trigger business_members_initialize_fx after insert or update of role,status on public.business_members
for each row execute function private.initialize_business_fx_on_owner();

do $$declare rec record;begin for rec in select id,owner_user_id from public.businesses where status='active' loop perform private.ensure_business_fx_foundation(rec.id,rec.owner_user_id); end loop; end$$;

create or replace function private.get_business_fx_rate_record(p_business_id uuid,p_currency text,p_rate_date date)
returns table(rate_id uuid,effective_date date,rate_to_base numeric)
language plpgsql stable security definer set search_path=pg_catalog,public
as $$
declare v_base text;v_currency text:=upper(btrim(coalesce(p_currency,'')));
begin
  select base_currency into v_base from public.businesses where id=p_business_id and status='active';
  if v_base is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  if p_rate_date is null then raise exception 'Rate date is required.' using errcode='22004';end if;
  if v_currency=v_base then return query select null::uuid,p_rate_date,1::numeric;return;end if;
  return query select rate.id,rate.rate_date,rate.rate_to_base from public.business_fx_rates rate where rate.business_id=p_business_id and rate.currency=v_currency and rate.rate_date<=p_rate_date order by rate.rate_date desc limit 1;
  if not found then raise exception 'No exchange rate is available on or before % for %.',p_rate_date,v_currency using errcode='P0002';end if;
end;
$$;

create or replace function private.upsert_business_fx_rate_internal(p_business_id uuid,p_rate_id uuid,p_currency text,p_rate_date date,p_rate_to_base numeric,p_source text,p_notes text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor uuid:=auth.uid();v_base text;v_currency text:=upper(btrim(coalesce(p_currency,'')));v_source text:=lower(btrim(coalesce(p_source,'manual')));v_id uuid;v_existing public.business_fx_rates%rowtype;
begin
  if actor is null or not private.can_manage_business_fx(p_business_id) then raise exception 'FX rate management permission required.' using errcode='42501';end if;
  select base_currency into v_base from public.businesses where id=p_business_id and status='active';
  if v_base is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  if not public.is_supported_financial_currency(v_currency) or v_currency=v_base then raise exception 'Choose a supported foreign currency different from the business base currency.' using errcode='22023';end if;
  if p_rate_date is null or p_rate_date>current_date then raise exception 'Rate date cannot be in the future.' using errcode='22008';end if;
  if coalesce(p_rate_to_base,0)<=0 then raise exception 'Exchange rate must be greater than zero.' using errcode='22023';end if;
  if v_source not in('manual','import','api') then raise exception 'Unsupported FX rate source.' using errcode='22023';end if;
  if p_rate_id is not null then select * into v_existing from public.business_fx_rates where business_id=p_business_id and id=p_rate_id for update; else select * into v_existing from public.business_fx_rates where business_id=p_business_id and currency=v_currency and rate_date=p_rate_date for update; end if;
  if found then
    if exists(select 1 from public.business_sales_payments where business_id=p_business_id and settlement_rate_id=v_existing.id) or exists(select 1 from public.business_supplier_payments where business_id=p_business_id and settlement_rate_id=v_existing.id) or exists(select 1 from public.business_fx_revaluation_lines where business_id=p_business_id and rate_id=v_existing.id) then
      if v_existing.currency<>v_currency or v_existing.rate_date<>p_rate_date or v_existing.rate_to_base<>p_rate_to_base then raise exception 'A rate used by a settlement or revaluation is immutable.' using errcode='55000'; end if;
    end if;
    update public.business_fx_rates set currency=v_currency,rate_date=p_rate_date,rate_to_base=p_rate_to_base,source=v_source,notes=nullif(btrim(coalesce(p_notes,'')),''),updated_at=now() where business_id=p_business_id and id=v_existing.id returning id into v_id;
    perform private.write_business_fx_audit(p_business_id,v_id,null,'rate_updated',jsonb_build_object('currency',v_currency,'rate_date',p_rate_date,'rate_to_base',p_rate_to_base));
  else
    insert into public.business_fx_rates(business_id,currency,rate_date,rate_to_base,source,notes,created_by) values(p_business_id,v_currency,p_rate_date,p_rate_to_base,v_source,nullif(btrim(coalesce(p_notes,'')),''),actor) returning id into v_id;
    perform private.write_business_fx_audit(p_business_id,v_id,null,'rate_created',jsonb_build_object('currency',v_currency,'rate_date',p_rate_date,'rate_to_base',p_rate_to_base));
  end if;
  return jsonb_build_object('id',v_id,'currency',v_currency,'rate_date',p_rate_date,'rate_to_base',p_rate_to_base,'source',v_source);
end;
$$;

create or replace function public.upsert_business_fx_rate(p_business_id uuid,p_rate_id uuid,p_currency text,p_rate_date date,p_rate_to_base numeric,p_source text default 'manual',p_notes text default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.upsert_business_fx_rate_internal(p_business_id,p_rate_id,p_currency,p_rate_date,p_rate_to_base,p_source,p_notes);$$;

create or replace function private.delete_business_fx_rate_internal(p_business_id uuid,p_rate_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null or not private.can_manage_business_fx(p_business_id) then raise exception 'FX rate management permission required.' using errcode='42501';end if;
  if exists(select 1 from public.business_sales_payments where business_id=p_business_id and settlement_rate_id=p_rate_id) or exists(select 1 from public.business_supplier_payments where business_id=p_business_id and settlement_rate_id=p_rate_id) or exists(select 1 from public.business_fx_revaluation_lines where business_id=p_business_id and rate_id=p_rate_id) then raise exception 'A used FX rate cannot be deleted.' using errcode='55000'; end if;
  if not exists(select 1 from public.business_fx_rates where business_id=p_business_id and id=p_rate_id) then raise exception 'FX rate not found.' using errcode='P0002';end if;
  perform private.write_business_fx_audit(p_business_id,p_rate_id,null,'rate_deleted','{}'::jsonb);
  delete from public.business_fx_rates where business_id=p_business_id and id=p_rate_id;
end;
$$;

create or replace function public.delete_business_fx_rate(p_business_id uuid,p_rate_id uuid)
returns void language sql set search_path=pg_catalog,public,private as $$select private.delete_business_fx_rate_internal(p_business_id,p_rate_id);$$;

drop policy if exists business_fx_settings_select on public.business_fx_settings;
create policy business_fx_settings_select on public.business_fx_settings for select to authenticated using(private.can_view_business_fx(business_id));
drop policy if exists business_fx_rates_select on public.business_fx_rates;
create policy business_fx_rates_select on public.business_fx_rates for select to authenticated using(private.can_view_business_fx(business_id));
drop policy if exists business_fx_runs_select on public.business_fx_revaluation_runs;
create policy business_fx_runs_select on public.business_fx_revaluation_runs for select to authenticated using(private.can_view_business_fx(business_id));
drop policy if exists business_fx_lines_select on public.business_fx_revaluation_lines;
create policy business_fx_lines_select on public.business_fx_revaluation_lines for select to authenticated using(private.can_view_business_fx(business_id));
drop policy if exists business_fx_audit_select on public.business_fx_audit_log;
create policy business_fx_audit_select on public.business_fx_audit_log for select to authenticated using(private.can_view_business_fx(business_id));

revoke execute on function private.has_business_fx_scope(uuid,uuid),private.can_view_business_fx(uuid),private.can_manage_business_fx(uuid),private.can_revalue_business_fx(uuid),private.get_business_fx_rate_record(uuid,text,date),private.ensure_business_fx_foundation(uuid,uuid),private.upsert_business_fx_rate_internal(uuid,uuid,text,date,numeric,text,text),private.delete_business_fx_rate_internal(uuid,uuid) from public,anon;
grant execute on function public.upsert_business_fx_rate(uuid,uuid,text,date,numeric,text,text),public.delete_business_fx_rate(uuid,uuid) to authenticated;
grant execute on function private.has_business_fx_scope(uuid,uuid),private.can_view_business_fx(uuid),private.can_manage_business_fx(uuid),private.can_revalue_business_fx(uuid),private.get_business_fx_rate_record(uuid,text,date),private.upsert_business_fx_rate_internal(uuid,uuid,text,date,numeric,text,text),private.delete_business_fx_rate_internal(uuid,uuid) to authenticated;
