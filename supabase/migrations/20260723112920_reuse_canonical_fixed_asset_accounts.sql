create or replace function private.ensure_business_asset_foundation(p_business_id uuid,p_actor_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare
  v_base_currency text;
  asset_account_id uuid;
  accumulated_account_id uuid;
  expense_account_id uuid;
  gain_account_id uuid;
  loss_account_id uuid;
begin
  select business.base_currency into v_base_currency
  from public.businesses business
  where business.id=p_business_id and business.status='active';
  if v_base_currency is null then raise exception 'Active business not found.' using errcode='P0002';end if;

  select id into asset_account_id
  from public.business_chart_of_accounts
  where business_id=p_business_id and system_key='fixed_assets';
  if asset_account_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by
    ) values(
      p_business_id,'1500-FA','Property, plant and equipment','asset','fixed_asset','debit','fixed_assets',false,p_actor_id
    ) on conflict(business_id,code) do nothing;
    select id into asset_account_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='fixed_assets';
  end if;
  if asset_account_id is not null then
    update public.business_chart_of_accounts
    set name='Property, plant and equipment',account_type='asset',account_subtype='fixed_asset',normal_balance='debit',allow_manual_posting=false,updated_at=now()
    where business_id=p_business_id and id=asset_account_id;
  end if;

  select id into accumulated_account_id
  from public.business_chart_of_accounts
  where business_id=p_business_id and system_key='accumulated_depreciation';
  if accumulated_account_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by
    ) values(
      p_business_id,'1590-FA','Accumulated depreciation','asset','contra_asset','credit','accumulated_depreciation',false,p_actor_id
    ) on conflict(business_id,code) do nothing;
    select id into accumulated_account_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='accumulated_depreciation';
  end if;

  select id into expense_account_id
  from public.business_chart_of_accounts
  where business_id=p_business_id and system_key='depreciation_expense';
  if expense_account_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by
    ) values(
      p_business_id,'6600-FA','Depreciation expense','expense','depreciation','debit','depreciation_expense',false,p_actor_id
    ) on conflict(business_id,code) do nothing;
    select id into expense_account_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='depreciation_expense';
  end if;
  if expense_account_id is not null then
    update public.business_chart_of_accounts
    set name='Depreciation expense',account_type='expense',account_subtype='depreciation',normal_balance='debit',allow_manual_posting=false,updated_at=now()
    where business_id=p_business_id and id=expense_account_id;
  end if;

  select id into gain_account_id
  from public.business_chart_of_accounts
  where business_id=p_business_id and system_key='gain_on_asset_disposal';
  if gain_account_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by
    ) values(
      p_business_id,'4910-FA','Gain on disposal of assets','revenue','asset_disposal','credit','gain_on_asset_disposal',false,p_actor_id
    ) on conflict(business_id,code) do nothing;
    select id into gain_account_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='gain_on_asset_disposal';
  end if;

  select id into loss_account_id
  from public.business_chart_of_accounts
  where business_id=p_business_id and system_key='loss_on_asset_disposal';
  if loss_account_id is null then
    insert into public.business_chart_of_accounts(
      business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by
    ) values(
      p_business_id,'6910-FA','Loss on disposal of assets','expense','asset_disposal','debit','loss_on_asset_disposal',false,p_actor_id
    ) on conflict(business_id,code) do nothing;
    select id into loss_account_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='loss_on_asset_disposal';
  end if;

  if asset_account_id is null or accumulated_account_id is null or expense_account_id is null or gain_account_id is null or loss_account_id is null then
    raise exception 'Fixed asset accounting foundation could not be initialized without changing an existing chart code.' using errcode='23503';
  end if;

  perform set_config('app.business_asset_action','settings_write',true);
  insert into public.business_asset_settings(business_id,gain_on_disposal_account_id,loss_on_disposal_account_id,updated_by)
  values(p_business_id,gain_account_id,loss_account_id,p_actor_id)
  on conflict(business_id) do update set
    gain_on_disposal_account_id=excluded.gain_on_disposal_account_id,
    loss_on_disposal_account_id=excluded.loss_on_disposal_account_id,
    updated_by=excluded.updated_by;

  perform set_config('app.business_asset_action','category_write',true);
  insert into public.business_asset_categories(
    business_id,code,name,description,asset_account_id,accumulated_depreciation_account_id,depreciation_expense_account_id,
    default_useful_life_months,default_residual_rate,created_by,updated_by
  ) values(
    p_business_id,'GENERAL','General fixed assets','Default fixed asset category.',asset_account_id,accumulated_account_id,expense_account_id,
    60,0,p_actor_id,p_actor_id
  ) on conflict(business_id,code) do nothing;
end;
$$;

do $$declare rec record;begin
  for rec in select id,owner_user_id from public.businesses where status='active' loop
    perform private.ensure_business_asset_foundation(rec.id,rec.owner_user_id);
  end loop;
end$$;
