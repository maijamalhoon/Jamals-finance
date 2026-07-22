create or replace function private.upsert_business_crm_lead_internal(
  p_business_id uuid,
  p_lead_id uuid,
  p_display_name text,
  p_company_name text,
  p_email text,
  p_phone text,
  p_source text,
  p_currency text,
  p_estimated_value numeric,
  p_owner_user_id uuid,
  p_status text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
#variable_conflict use_variable
declare
  current_user_id uuid:=auth.uid();
  clean_name text:=btrim(coalesce(p_display_name,''));
  clean_company text:=nullif(btrim(coalesce(p_company_name,'')),'');
  clean_email text:=nullif(lower(btrim(coalesce(p_email,''))),'');
  clean_phone text:=nullif(btrim(coalesce(p_phone,'')),'');
  normalized_source text:=lower(btrim(coalesce(p_source,'other')));
  normalized_currency text:=upper(btrim(coalesce(p_currency,'')));
  normalized_status text:=lower(btrim(coalesce(p_status,'new')));
  assigned_number bigint;
  saved_id uuid;
  existing_status text;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_manage_business_crm(p_business_id) then raise exception 'CRM management permission required.' using errcode='42501'; end if;
  if not exists(select 1 from public.businesses business where business.id=p_business_id and business.status='active' and business.workspace_mode='advanced_company' and coalesce((business.module_config->>'crm')::boolean,false)) then
    raise exception 'CRM is not enabled for this active company.' using errcode='P0002';
  end if;
  if char_length(clean_name) not between 2 and 160 then raise exception 'Lead name must contain 2 to 160 characters.' using errcode='22023'; end if;
  if normalized_source not in ('referral','website','social','phone','walk_in','campaign','partner','other') then raise exception 'Unsupported lead source.' using errcode='22023'; end if;
  if normalized_status not in ('new','contacted','qualified','disqualified') then raise exception 'Lead conversion must use the dedicated conversion action.' using errcode='22023'; end if;
  if not public.is_supported_financial_currency(normalized_currency) then raise exception 'Unsupported lead currency.' using errcode='22023'; end if;
  if coalesce(p_estimated_value,0)<0 then raise exception 'Estimated value cannot be negative.' using errcode='22023'; end if;
  if p_owner_user_id is not null and not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=p_owner_user_id and membership.status='active') then
    raise exception 'Lead owner must be an active company member.' using errcode='23503';
  end if;

  if p_lead_id is null then
    update public.business_crm_settings settings
    set next_lead_number=settings.next_lead_number+1,updated_at=now()
    where settings.business_id=p_business_id
    returning settings.next_lead_number-1 into assigned_number;
    if assigned_number is null then raise exception 'CRM numbering settings are missing.' using errcode='23503'; end if;

    insert into public.business_crm_leads(
      business_id,lead_number,lead_code,display_name,company_name,email,phone,source,status,
      currency,estimated_value,owner_user_id,notes,created_by
    ) values (
      p_business_id,assigned_number,'LEAD-'||lpad(assigned_number::text,6,'0'),clean_name,clean_company,
      clean_email,clean_phone,normalized_source,normalized_status,normalized_currency,
      round(coalesce(p_estimated_value,0),6),p_owner_user_id,nullif(btrim(coalesce(p_notes,'')),''),current_user_id
    ) returning id into saved_id;
  else
    select lead.status into existing_status
    from public.business_crm_leads lead
    where lead.business_id=p_business_id and lead.id=p_lead_id
    for update;
    if existing_status is null then raise exception 'CRM lead not found.' using errcode='P0002'; end if;
    if existing_status='converted' then raise exception 'Converted leads cannot be edited.' using errcode='23514'; end if;

    update public.business_crm_leads lead
    set display_name=clean_name,company_name=clean_company,email=clean_email,phone=clean_phone,
        source=normalized_source,status=normalized_status,currency=normalized_currency,
        estimated_value=round(coalesce(p_estimated_value,0),6),owner_user_id=p_owner_user_id,
        notes=nullif(btrim(coalesce(p_notes,'')),'')
    where lead.business_id=p_business_id and lead.id=p_lead_id
    returning lead.id into saved_id;
  end if;
  return saved_id;
end;
$$;

create or replace function public.upsert_business_crm_lead(
  p_business_id uuid,
  p_lead_id uuid default null,
  p_display_name text default null,
  p_company_name text default null,
  p_email text default null,
  p_phone text default null,
  p_source text default 'other',
  p_currency text default null,
  p_estimated_value numeric default 0,
  p_owner_user_id uuid default null,
  p_status text default 'new',
  p_notes text default null
)
returns uuid
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
select private.upsert_business_crm_lead_internal(
  p_business_id,p_lead_id,p_display_name,p_company_name,p_email,p_phone,p_source,p_currency,
  p_estimated_value,p_owner_user_id,p_status,p_notes
);
$$;

create or replace function private.upsert_business_crm_opportunity_internal(
  p_business_id uuid,
  p_opportunity_id uuid,
  p_lead_id uuid,
  p_contact_id uuid,
  p_pipeline_id uuid,
  p_stage_id uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_probability numeric,
  p_expected_close_date date,
  p_owner_user_id uuid,
  p_lost_reason text,
  p_notes text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
#variable_conflict use_variable
declare
  current_user_id uuid:=auth.uid();
  clean_title text:=btrim(coalesce(p_title,''));
  normalized_currency text:=upper(btrim(coalesce(p_currency,'')));
  selected_pipeline_id uuid:=p_pipeline_id;
  selected_stage_id uuid:=p_stage_id;
  stage_record record;
  lead_record record;
  saved_id uuid;
  assigned_number bigint;
  existing_invoice_id uuid;
  existing_status text;
  line_item jsonb;
  line_number smallint:=0;
  product_uuid uuid;
  warehouse_uuid uuid;
  revenue_uuid uuid;
  line_description text;
  line_quantity numeric(24,6);
  line_unit_price numeric(24,6);
  line_discount numeric(9,6);
  line_tax numeric(9,6);
  computed_amount numeric(24,6):=0;
  final_amount numeric(24,6);
  final_probability numeric(5,2);
  final_contact_id uuid:=p_contact_id;
  final_status text;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_manage_business_crm(p_business_id) then raise exception 'CRM management permission required.' using errcode='42501'; end if;
  if char_length(clean_title) not between 2 and 200 then raise exception 'Opportunity title must contain 2 to 200 characters.' using errcode='22023'; end if;
  if not public.is_supported_financial_currency(normalized_currency) then raise exception 'Unsupported opportunity currency.' using errcode='22023'; end if;
  if coalesce(p_amount,0)<0 then raise exception 'Opportunity amount cannot be negative.' using errcode='22023'; end if;
  if p_probability is not null and p_probability not between 0 and 100 then raise exception 'Opportunity probability must be between 0 and 100.' using errcode='22023'; end if;
  if p_owner_user_id is not null and not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=p_owner_user_id and membership.status='active') then
    raise exception 'Opportunity owner must be an active company member.' using errcode='23503';
  end if;
  if p_lead_id is null and p_contact_id is null then raise exception 'Opportunity requires a lead or customer.' using errcode='22023'; end if;

  if p_lead_id is not null then
    select lead.status,lead.converted_contact_id into lead_record
    from public.business_crm_leads lead
    where lead.business_id=p_business_id and lead.id=p_lead_id;
    if not found then raise exception 'CRM lead not found.' using errcode='P0002'; end if;
    final_contact_id:=coalesce(final_contact_id,lead_record.converted_contact_id);
  end if;
  if final_contact_id is not null and not exists(select 1 from public.business_contacts contact where contact.business_id=p_business_id and contact.id=final_contact_id and contact.status='active' and contact.contact_type in ('customer','both')) then
    raise exception 'Active CRM customer not found.' using errcode='P0002';
  end if;

  if selected_pipeline_id is null then
    select settings.default_pipeline_id into selected_pipeline_id from public.business_crm_settings settings where settings.business_id=p_business_id;
  end if;
  if selected_pipeline_id is null then raise exception 'Default CRM pipeline is missing.' using errcode='23503'; end if;
  if selected_stage_id is null then
    select stage.id into selected_stage_id
    from public.business_crm_stages stage
    where stage.business_id=p_business_id and stage.pipeline_id=selected_pipeline_id and stage.category='open'
    order by stage.position limit 1;
  end if;

  select stage.id,stage.pipeline_id,stage.probability,stage.category,stage.name into stage_record
  from public.business_crm_stages stage
  join public.business_crm_pipelines pipeline on pipeline.business_id=stage.business_id and pipeline.id=stage.pipeline_id and pipeline.status='active'
  where stage.business_id=p_business_id and stage.id=selected_stage_id and stage.pipeline_id=selected_pipeline_id;
  if not found then raise exception 'CRM pipeline stage not found.' using errcode='P0002'; end if;

  if jsonb_typeof(coalesce(p_lines,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_lines,'[]'::jsonb))>100 then
    raise exception 'Opportunity lines must be an array containing at most 100 items.' using errcode='22023';
  end if;

  for line_item in select value from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) loop
    line_number:=line_number+1;
    begin
      product_uuid:=nullif(line_item->>'product_id','')::uuid;
      warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
      revenue_uuid:=nullif(line_item->>'revenue_account_id','')::uuid;
      line_quantity:=coalesce(nullif(line_item->>'quantity','')::numeric,0);
      line_unit_price:=coalesce(nullif(line_item->>'unit_price','')::numeric,0);
      line_discount:=coalesce(nullif(line_item->>'discount_percent','')::numeric,0);
      line_tax:=coalesce(nullif(line_item->>'tax_rate','')::numeric,0);
    exception when invalid_text_representation then
      raise exception 'Opportunity lines contain invalid product, warehouse, account, or numeric values.' using errcode='22023';
    end;
    line_description:=btrim(coalesce(line_item->>'description',''));
    if char_length(line_description) not between 2 and 500 or line_quantity<=0 or line_unit_price<0 or line_discount not between 0 and 100 or line_tax not between 0 and 100 then
      raise exception 'Opportunity line values are invalid.' using errcode='22023';
    end if;
    if (product_uuid is null)<>(warehouse_uuid is null) then raise exception 'Inventory opportunity lines require both product and warehouse.' using errcode='22023'; end if;
    if product_uuid is not null and not exists(
      select 1 from public.business_products product join public.business_warehouses warehouse on warehouse.business_id=product.business_id and warehouse.id=warehouse_uuid
      where product.business_id=p_business_id and product.id=product_uuid and product.status='active' and warehouse.status='active'
    ) then raise exception 'Active opportunity product or warehouse not found.' using errcode='P0002'; end if;
    if revenue_uuid is not null and not exists(select 1 from public.business_chart_of_accounts account where account.business_id=p_business_id and account.id=revenue_uuid and account.is_active and account.account_type='revenue') then
      raise exception 'Opportunity revenue account is invalid.' using errcode='23514';
    end if;
    computed_amount:=computed_amount+round((line_quantity*line_unit_price)*(1-line_discount/100)*(1+line_tax/100),6);
  end loop;

  final_amount:=case when line_number>0 then computed_amount else round(coalesce(p_amount,0),6) end;
  final_probability:=coalesce(p_probability,stage_record.probability);
  final_status:=stage_record.category;

  if p_opportunity_id is null then
    update public.business_crm_settings settings
    set next_opportunity_number=settings.next_opportunity_number+1,updated_at=now()
    where settings.business_id=p_business_id
    returning settings.next_opportunity_number-1 into assigned_number;
    if assigned_number is null then raise exception 'CRM opportunity numbering settings are missing.' using errcode='23503'; end if;

    insert into public.business_crm_opportunities(
      business_id,opportunity_number,opportunity_code,pipeline_id,stage_id,lead_id,contact_id,title,amount,
      currency,probability,expected_close_date,owner_user_id,status,lost_reason,notes,won_at,lost_at,created_by
    ) values (
      p_business_id,assigned_number,'OPP-'||lpad(assigned_number::text,6,'0'),selected_pipeline_id,selected_stage_id,
      p_lead_id,final_contact_id,clean_title,final_amount,normalized_currency,final_probability,p_expected_close_date,
      p_owner_user_id,final_status,case when final_status='lost' then nullif(btrim(coalesce(p_lost_reason,'')),'') else null end,
      nullif(btrim(coalesce(p_notes,'')),''),case when final_status='won' then now() end,case when final_status='lost' then now() end,current_user_id
    ) returning id into saved_id;
  else
    select opportunity.invoice_id,opportunity.status into existing_invoice_id,existing_status
    from public.business_crm_opportunities opportunity
    where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id
    for update;
    if existing_status is null then raise exception 'CRM opportunity not found.' using errcode='P0002'; end if;
    if existing_invoice_id is not null then raise exception 'Invoiced opportunities cannot be edited.' using errcode='23514'; end if;

    update public.business_crm_opportunities opportunity
    set pipeline_id=selected_pipeline_id,stage_id=selected_stage_id,lead_id=p_lead_id,contact_id=final_contact_id,
        title=clean_title,amount=final_amount,currency=normalized_currency,probability=final_probability,
        expected_close_date=p_expected_close_date,owner_user_id=p_owner_user_id,status=final_status,
        lost_reason=case when final_status='lost' then nullif(btrim(coalesce(p_lost_reason,'')),'') else null end,
        notes=nullif(btrim(coalesce(p_notes,'')),''),
        won_at=case when final_status='won' then coalesce(opportunity.won_at,now()) else null end,
        lost_at=case when final_status='lost' then coalesce(opportunity.lost_at,now()) else null end
    where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id
    returning opportunity.id into saved_id;
    delete from public.business_crm_opportunity_lines line where line.business_id=p_business_id and line.opportunity_id=saved_id;
  end if;

  line_number:=0;
  for line_item in select value from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) loop
    line_number:=line_number+1;
    product_uuid:=nullif(line_item->>'product_id','')::uuid;
    warehouse_uuid:=nullif(line_item->>'warehouse_id','')::uuid;
    revenue_uuid:=nullif(line_item->>'revenue_account_id','')::uuid;
    insert into public.business_crm_opportunity_lines(
      business_id,opportunity_id,line_number,product_id,warehouse_id,description,quantity,unit_price,
      discount_percent,tax_rate,revenue_account_id
    ) values (
      p_business_id,saved_id,line_number,product_uuid,warehouse_uuid,btrim(line_item->>'description'),
      (line_item->>'quantity')::numeric,(line_item->>'unit_price')::numeric,
      coalesce(nullif(line_item->>'discount_percent','')::numeric,0),coalesce(nullif(line_item->>'tax_rate','')::numeric,0),revenue_uuid
    );
  end loop;
  return saved_id;
end;
$$;

create or replace function public.upsert_business_crm_opportunity(
  p_business_id uuid,
  p_opportunity_id uuid default null,
  p_lead_id uuid default null,
  p_contact_id uuid default null,
  p_pipeline_id uuid default null,
  p_stage_id uuid default null,
  p_title text default null,
  p_amount numeric default 0,
  p_currency text default null,
  p_probability numeric default null,
  p_expected_close_date date default null,
  p_owner_user_id uuid default null,
  p_lost_reason text default null,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
select private.upsert_business_crm_opportunity_internal(
  p_business_id,p_opportunity_id,p_lead_id,p_contact_id,p_pipeline_id,p_stage_id,p_title,p_amount,
  p_currency,p_probability,p_expected_close_date,p_owner_user_id,p_lost_reason,p_notes,p_lines
);
$$;

create or replace function private.move_business_crm_opportunity_stage_internal(
  p_business_id uuid,p_opportunity_id uuid,p_stage_id uuid,p_lost_reason text
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
#variable_conflict use_variable
declare
  current_user_id uuid:=auth.uid();
  opportunity_record record;
  stage_record record;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_manage_business_crm(p_business_id) then raise exception 'CRM management permission required.' using errcode='42501'; end if;
  select opportunity.* into opportunity_record from public.business_crm_opportunities opportunity
  where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id for update;
  if not found then raise exception 'CRM opportunity not found.' using errcode='P0002'; end if;
  if opportunity_record.invoice_id is not null then raise exception 'Invoiced opportunity stage is locked.' using errcode='23514'; end if;
  select stage.* into stage_record from public.business_crm_stages stage
  where stage.business_id=p_business_id and stage.id=p_stage_id and stage.pipeline_id=opportunity_record.pipeline_id;
  if not found then raise exception 'CRM stage not found in this pipeline.' using errcode='P0002'; end if;

  update public.business_crm_opportunities opportunity
  set stage_id=p_stage_id,probability=stage_record.probability,status=stage_record.category,
      lost_reason=case when stage_record.category='lost' then nullif(btrim(coalesce(p_lost_reason,'')),'') else null end,
      won_at=case when stage_record.category='won' then coalesce(opportunity.won_at,now()) else null end,
      lost_at=case when stage_record.category='lost' then coalesce(opportunity.lost_at,now()) else null end
  where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id;

  insert into public.business_crm_activities(
    business_id,lead_id,opportunity_id,contact_id,activity_type,subject,details,status,completed_at,assigned_to,created_by
  ) values (
    p_business_id,opportunity_record.lead_id,p_opportunity_id,opportunity_record.contact_id,'note',
    'Moved to '||stage_record.name,nullif(btrim(coalesce(p_lost_reason,'')),''),'completed',now(),opportunity_record.owner_user_id,current_user_id
  );
  return p_opportunity_id;
end;
$$;

create or replace function public.move_business_crm_opportunity_stage(
  p_business_id uuid,p_opportunity_id uuid,p_stage_id uuid,p_lost_reason text default null
)
returns uuid
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
select private.move_business_crm_opportunity_stage_internal(p_business_id,p_opportunity_id,p_stage_id,p_lost_reason);
$$;

create or replace function private.upsert_business_crm_activity_internal(
  p_business_id uuid,p_activity_id uuid,p_lead_id uuid,p_opportunity_id uuid,p_contact_id uuid,
  p_activity_type text,p_subject text,p_details text,p_due_at timestamptz,p_assigned_to uuid,p_status text
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
#variable_conflict use_variable
declare
  current_user_id uuid:=auth.uid();
  normalized_type text:=lower(btrim(coalesce(p_activity_type,'')));
  normalized_status text:=lower(btrim(coalesce(p_status,'open')));
  clean_subject text:=btrim(coalesce(p_subject,''));
  saved_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_manage_business_crm(p_business_id) then raise exception 'CRM management permission required.' using errcode='42501'; end if;
  if p_lead_id is null and p_opportunity_id is null and p_contact_id is null then raise exception 'CRM activity requires a lead, opportunity, or customer.' using errcode='22023'; end if;
  if normalized_type not in ('note','call','email','meeting','task') then raise exception 'Unsupported CRM activity type.' using errcode='22023'; end if;
  if normalized_status not in ('open','completed','cancelled') then raise exception 'Unsupported CRM activity status.' using errcode='22023'; end if;
  if char_length(clean_subject) not between 2 and 200 then raise exception 'Activity subject must contain 2 to 200 characters.' using errcode='22023'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=p_assigned_to and membership.status='active') then
    raise exception 'Activity owner must be an active company member.' using errcode='23503';
  end if;
  if p_lead_id is not null and not exists(select 1 from public.business_crm_leads lead where lead.business_id=p_business_id and lead.id=p_lead_id) then raise exception 'CRM lead not found.' using errcode='P0002'; end if;
  if p_opportunity_id is not null and not exists(select 1 from public.business_crm_opportunities opportunity where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id) then raise exception 'CRM opportunity not found.' using errcode='P0002'; end if;
  if p_contact_id is not null and not exists(select 1 from public.business_contacts contact where contact.business_id=p_business_id and contact.id=p_contact_id and contact.status<>'archived') then raise exception 'CRM contact not found.' using errcode='P0002'; end if;

  if p_activity_id is null then
    insert into public.business_crm_activities(
      business_id,lead_id,opportunity_id,contact_id,activity_type,subject,details,status,due_at,completed_at,assigned_to,created_by
    ) values (
      p_business_id,p_lead_id,p_opportunity_id,p_contact_id,normalized_type,clean_subject,
      nullif(btrim(coalesce(p_details,'')),''),normalized_status,p_due_at,
      case when normalized_status='completed' then now() end,p_assigned_to,current_user_id
    ) returning id into saved_id;
  else
    update public.business_crm_activities activity
    set lead_id=p_lead_id,opportunity_id=p_opportunity_id,contact_id=p_contact_id,activity_type=normalized_type,
        subject=clean_subject,details=nullif(btrim(coalesce(p_details,'')),''),status=normalized_status,
        due_at=p_due_at,completed_at=case when normalized_status='completed' then coalesce(activity.completed_at,now()) else null end,
        assigned_to=p_assigned_to
    where activity.business_id=p_business_id and activity.id=p_activity_id
    returning activity.id into saved_id;
    if saved_id is null then raise exception 'CRM activity not found.' using errcode='P0002'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.upsert_business_crm_activity(
  p_business_id uuid,p_activity_id uuid default null,p_lead_id uuid default null,p_opportunity_id uuid default null,
  p_contact_id uuid default null,p_activity_type text default 'task',p_subject text default null,p_details text default null,
  p_due_at timestamptz default null,p_assigned_to uuid default null,p_status text default 'open'
)
returns uuid
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
select private.upsert_business_crm_activity_internal(
  p_business_id,p_activity_id,p_lead_id,p_opportunity_id,p_contact_id,p_activity_type,p_subject,p_details,
  p_due_at,p_assigned_to,p_status
);
$$;

create or replace function private.convert_business_crm_lead_to_customer_internal(
  p_business_id uuid,p_lead_id uuid,p_create_opportunity boolean
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
#variable_conflict use_variable
declare
  current_user_id uuid:=auth.uid();
  lead_record record;
  created_contact_id uuid;
  created_opportunity_id uuid;
  pipeline_uuid uuid;
  qualified_stage record;
  assigned_number bigint;
  contact_name text;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_manage_business_crm(p_business_id) then raise exception 'CRM management permission required.' using errcode='42501'; end if;
  if not exists(
    select 1 from public.business_members membership
    where membership.business_id=p_business_id and membership.user_id=current_user_id and membership.status='active'
      and (membership.role in ('owner','admin','manager','sales') or '*'=any(membership.permissions) or 'contacts.manage'=any(membership.permissions) or 'sales.manage'=any(membership.permissions))
  ) then raise exception 'Contact conversion permission required.' using errcode='42501'; end if;

  select lead.* into lead_record from public.business_crm_leads lead
  where lead.business_id=p_business_id and lead.id=p_lead_id for update;
  if not found then raise exception 'CRM lead not found.' using errcode='P0002'; end if;
  if lead_record.status='converted' then
    return jsonb_build_object('contact_id',lead_record.converted_contact_id,'opportunity_id',lead_record.converted_opportunity_id,'already_converted',true);
  end if;

  contact_name:=coalesce(lead_record.company_name,lead_record.display_name);
  created_contact_id:=private.upsert_business_contact_internal(
    p_business_id,'customer',contact_name,lead_record.company_name,lead_record.email,lead_record.phone,null,
    lead_record.currency,0,0,'{}'::jsonb,'{}'::jsonb,
    concat_ws(E'\n',lead_record.notes,'CRM contact person: '||lead_record.display_name),null
  );

  if coalesce(p_create_opportunity,true) then
    select settings.default_pipeline_id into pipeline_uuid from public.business_crm_settings settings where settings.business_id=p_business_id;
    select stage.* into qualified_stage from public.business_crm_stages stage
    where stage.business_id=p_business_id and stage.pipeline_id=pipeline_uuid and stage.category='open'
    order by case when lower(stage.name)='qualified' then 0 else 1 end,stage.position limit 1;
    if qualified_stage.id is null then raise exception 'Qualified CRM stage is missing.' using errcode='23503'; end if;
    update public.business_crm_settings settings
    set next_opportunity_number=settings.next_opportunity_number+1,updated_at=now()
    where settings.business_id=p_business_id
    returning settings.next_opportunity_number-1 into assigned_number;

    insert into public.business_crm_opportunities(
      business_id,opportunity_number,opportunity_code,pipeline_id,stage_id,lead_id,contact_id,title,amount,
      currency,probability,owner_user_id,status,notes,created_by
    ) values (
      p_business_id,assigned_number,'OPP-'||lpad(assigned_number::text,6,'0'),pipeline_uuid,qualified_stage.id,p_lead_id,
      created_contact_id,'Opportunity - '||contact_name,lead_record.estimated_value,lead_record.currency,
      qualified_stage.probability,lead_record.owner_user_id,'open',lead_record.notes,current_user_id
    ) returning id into created_opportunity_id;
  end if;

  update public.business_crm_leads lead
  set status='converted',converted_contact_id=created_contact_id,converted_opportunity_id=created_opportunity_id,converted_at=now()
  where lead.business_id=p_business_id and lead.id=p_lead_id;

  insert into public.business_crm_activities(
    business_id,lead_id,opportunity_id,contact_id,activity_type,subject,details,status,completed_at,assigned_to,created_by
  ) values (
    p_business_id,p_lead_id,created_opportunity_id,created_contact_id,'note','Lead converted to customer',
    case when created_opportunity_id is null then 'Customer record created.' else 'Customer and opportunity records created.' end,
    'completed',now(),lead_record.owner_user_id,current_user_id
  );

  return jsonb_build_object('contact_id',created_contact_id,'opportunity_id',created_opportunity_id,'already_converted',false);
end;
$$;

create or replace function public.convert_business_crm_lead_to_customer(
  p_business_id uuid,p_lead_id uuid,p_create_opportunity boolean default true
)
returns jsonb
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
select private.convert_business_crm_lead_to_customer_internal(p_business_id,p_lead_id,p_create_opportunity);
$$;

create or replace function private.convert_business_crm_opportunity_to_invoice_internal(
  p_business_id uuid,p_opportunity_id uuid,p_invoice_date date,p_due_date date,p_exchange_rate numeric,p_notes text
)
returns uuid
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
#variable_conflict use_variable
declare
  current_user_id uuid:=auth.uid();
  opportunity_record record;
  lead_record record;
  invoice_lines jsonb;
  created_invoice_id uuid;
  won_stage_id uuid;
  customer_uuid uuid;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_manage_business_crm(p_business_id) then raise exception 'CRM management permission required.' using errcode='42501'; end if;
  if not exists(
    select 1 from public.business_members membership
    where membership.business_id=p_business_id and membership.user_id=current_user_id and membership.status='active'
      and (membership.role in ('owner','admin','accountant','manager','sales') or '*'=any(membership.permissions) or 'sales.manage'=any(membership.permissions))
  ) then raise exception 'Sales invoice permission required.' using errcode='42501'; end if;
  if p_invoice_date is null or p_due_date is null or p_due_date<p_invoice_date then raise exception 'Invoice and due dates are invalid.' using errcode='22008'; end if;
  if p_exchange_rate is null or p_exchange_rate<=0 then raise exception 'Exchange rate must be greater than zero.' using errcode='22023'; end if;

  select opportunity.* into opportunity_record from public.business_crm_opportunities opportunity
  where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id for update;
  if not found then raise exception 'CRM opportunity not found.' using errcode='P0002'; end if;
  if opportunity_record.invoice_id is not null then return opportunity_record.invoice_id; end if;
  customer_uuid:=opportunity_record.contact_id;
  if customer_uuid is null and opportunity_record.lead_id is not null then
    select lead.* into lead_record from public.business_crm_leads lead where lead.business_id=p_business_id and lead.id=opportunity_record.lead_id;
    customer_uuid:=lead_record.converted_contact_id;
  end if;
  if customer_uuid is null then raise exception 'Convert the lead to a customer before invoicing.' using errcode='23503'; end if;
  if not exists(select 1 from public.business_contacts contact where contact.business_id=p_business_id and contact.id=customer_uuid and contact.status='active' and contact.contact_type in ('customer','both')) then
    raise exception 'Active opportunity customer not found.' using errcode='P0002';
  end if;

  select jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'product_id',line.product_id,'warehouse_id',line.warehouse_id,'description',line.description,
      'quantity',line.quantity,'unit_price',line.unit_price,'discount_percent',line.discount_percent,
      'tax_rate',line.tax_rate,'revenue_account_id',line.revenue_account_id
    )) order by line.line_number
  ) into invoice_lines
  from public.business_crm_opportunity_lines line
  where line.business_id=p_business_id and line.opportunity_id=p_opportunity_id;
  if invoice_lines is null or jsonb_array_length(invoice_lines)<1 then raise exception 'Opportunity requires at least one line before invoicing.' using errcode='22023'; end if;

  created_invoice_id:=private.create_business_stock_sales_invoice_internal(
    p_business_id,customer_uuid,p_invoice_date,p_due_date,opportunity_record.currency,p_exchange_rate,
    concat_ws(E'\n',nullif(btrim(coalesce(p_notes,'')),''),'CRM opportunity '||opportunity_record.opportunity_code),
    invoice_lines,'crm-opportunity:'||p_opportunity_id::text
  );

  select stage.id into won_stage_id from public.business_crm_stages stage
  where stage.business_id=p_business_id and stage.pipeline_id=opportunity_record.pipeline_id and stage.category='won'
  order by stage.position limit 1;
  if won_stage_id is null then raise exception 'Won CRM stage is missing.' using errcode='23503'; end if;

  update public.business_crm_opportunities opportunity
  set contact_id=customer_uuid,stage_id=won_stage_id,status='won',probability=100,invoice_id=created_invoice_id,
      won_at=coalesce(opportunity.won_at,now()),lost_at=null,lost_reason=null
  where opportunity.business_id=p_business_id and opportunity.id=p_opportunity_id;

  if opportunity_record.lead_id is not null then
    update public.business_crm_leads lead
    set status='converted',converted_contact_id=customer_uuid,converted_opportunity_id=coalesce(lead.converted_opportunity_id,p_opportunity_id),converted_at=coalesce(lead.converted_at,now())
    where lead.business_id=p_business_id and lead.id=opportunity_record.lead_id and lead.status<>'converted';
  end if;

  insert into public.business_crm_activities(
    business_id,lead_id,opportunity_id,contact_id,activity_type,subject,details,status,completed_at,assigned_to,created_by
  ) values (
    p_business_id,opportunity_record.lead_id,p_opportunity_id,customer_uuid,'note','Opportunity converted to invoice',
    'Sales invoice created from '||opportunity_record.opportunity_code,'completed',now(),opportunity_record.owner_user_id,current_user_id
  );
  return created_invoice_id;
end;
$$;

create or replace function public.convert_business_crm_opportunity_to_invoice(
  p_business_id uuid,p_opportunity_id uuid,p_invoice_date date,p_due_date date,
  p_exchange_rate numeric default 1,p_notes text default null
)
returns uuid
language sql
security invoker
set search_path='pg_catalog','public','private'
as $$
select private.convert_business_crm_opportunity_to_invoice_internal(
  p_business_id,p_opportunity_id,p_invoice_date,p_due_date,p_exchange_rate,p_notes
);
$$;

revoke all on function private.upsert_business_crm_lead_internal(uuid,uuid,text,text,text,text,text,text,numeric,uuid,text,text) from public,anon;
revoke all on function private.upsert_business_crm_opportunity_internal(uuid,uuid,uuid,uuid,uuid,uuid,text,numeric,text,numeric,date,uuid,text,text,jsonb) from public,anon;
revoke all on function private.move_business_crm_opportunity_stage_internal(uuid,uuid,uuid,text) from public,anon;
revoke all on function private.upsert_business_crm_activity_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,timestamptz,uuid,text) from public,anon;
revoke all on function private.convert_business_crm_lead_to_customer_internal(uuid,uuid,boolean) from public,anon;
revoke all on function private.convert_business_crm_opportunity_to_invoice_internal(uuid,uuid,date,date,numeric,text) from public,anon;
grant execute on function private.upsert_business_crm_lead_internal(uuid,uuid,text,text,text,text,text,text,numeric,uuid,text,text) to authenticated,service_role;
grant execute on function private.upsert_business_crm_opportunity_internal(uuid,uuid,uuid,uuid,uuid,uuid,text,numeric,text,numeric,date,uuid,text,text,jsonb) to authenticated,service_role;
grant execute on function private.move_business_crm_opportunity_stage_internal(uuid,uuid,uuid,text) to authenticated,service_role;
grant execute on function private.upsert_business_crm_activity_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,timestamptz,uuid,text) to authenticated,service_role;
grant execute on function private.convert_business_crm_lead_to_customer_internal(uuid,uuid,boolean) to authenticated,service_role;
grant execute on function private.convert_business_crm_opportunity_to_invoice_internal(uuid,uuid,date,date,numeric,text) to authenticated,service_role;

revoke all on function public.upsert_business_crm_lead(uuid,uuid,text,text,text,text,text,text,numeric,uuid,text,text) from public,anon;
revoke all on function public.upsert_business_crm_opportunity(uuid,uuid,uuid,uuid,uuid,uuid,text,numeric,text,numeric,date,uuid,text,text,jsonb) from public,anon;
revoke all on function public.move_business_crm_opportunity_stage(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.upsert_business_crm_activity(uuid,uuid,uuid,uuid,uuid,text,text,text,timestamptz,uuid,text) from public,anon;
revoke all on function public.convert_business_crm_lead_to_customer(uuid,uuid,boolean) from public,anon;
revoke all on function public.convert_business_crm_opportunity_to_invoice(uuid,uuid,date,date,numeric,text) from public,anon;
grant execute on function public.upsert_business_crm_lead(uuid,uuid,text,text,text,text,text,text,numeric,uuid,text,text) to authenticated,service_role;
grant execute on function public.upsert_business_crm_opportunity(uuid,uuid,uuid,uuid,uuid,uuid,text,numeric,text,numeric,date,uuid,text,text,jsonb) to authenticated,service_role;
grant execute on function public.move_business_crm_opportunity_stage(uuid,uuid,uuid,text) to authenticated,service_role;
grant execute on function public.upsert_business_crm_activity(uuid,uuid,uuid,uuid,uuid,text,text,text,timestamptz,uuid,text) to authenticated,service_role;
grant execute on function public.convert_business_crm_lead_to_customer(uuid,uuid,boolean) to authenticated,service_role;
grant execute on function public.convert_business_crm_opportunity_to_invoice(uuid,uuid,date,date,numeric,text) to authenticated,service_role;
