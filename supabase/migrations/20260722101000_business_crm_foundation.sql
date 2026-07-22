create table public.business_crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_pipelines_business_id_id_key unique (business_id, id),
  constraint business_crm_pipelines_business_name_key unique (business_id, name),
  constraint business_crm_pipelines_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint business_crm_pipelines_status_check check (status in ('active','archived'))
);

create unique index business_crm_pipelines_one_default_idx
  on public.business_crm_pipelines(business_id)
  where is_default and status='active';

create table public.business_crm_stages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  pipeline_id uuid not null,
  name text not null,
  position smallint not null,
  probability numeric(5,2) not null default 0,
  category text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_stages_business_id_id_key unique (business_id, id),
  constraint business_crm_stages_pipeline_position_key unique (pipeline_id, position),
  constraint business_crm_stages_pipeline_name_key unique (pipeline_id, name),
  constraint business_crm_stages_pipeline_fk foreign key (business_id, pipeline_id)
    references public.business_crm_pipelines(business_id, id) on delete cascade,
  constraint business_crm_stages_name_check check (char_length(btrim(name)) between 2 and 80),
  constraint business_crm_stages_position_check check (position between 1 and 100),
  constraint business_crm_stages_probability_check check (probability between 0 and 100),
  constraint business_crm_stages_category_check check (category in ('open','won','lost'))
);

create table public.business_crm_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  default_pipeline_id uuid,
  next_lead_number bigint not null default 1,
  next_opportunity_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_settings_pipeline_fk foreign key (business_id, default_pipeline_id)
    references public.business_crm_pipelines(business_id, id) on delete restrict,
  constraint business_crm_settings_lead_number_check check (next_lead_number > 0),
  constraint business_crm_settings_opportunity_number_check check (next_opportunity_number > 0)
);

create table public.business_crm_leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_number bigint not null,
  lead_code text not null,
  display_name text not null,
  company_name text,
  email text,
  phone text,
  source text not null default 'other',
  status text not null default 'new',
  currency text not null,
  estimated_value numeric(24,6) not null default 0,
  owner_user_id uuid references auth.users(id) on delete set null,
  converted_contact_id uuid,
  notes text,
  next_follow_up_at timestamptz,
  converted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_leads_business_id_id_key unique (business_id, id),
  constraint business_crm_leads_number_key unique (business_id, lead_number),
  constraint business_crm_leads_code_key unique (business_id, lead_code),
  constraint business_crm_leads_contact_fk foreign key (business_id, converted_contact_id)
    references public.business_contacts(business_id, id) on delete restrict,
  constraint business_crm_leads_name_check check (char_length(btrim(display_name)) between 2 and 160),
  constraint business_crm_leads_company_check check (company_name is null or char_length(btrim(company_name)) between 2 and 200),
  constraint business_crm_leads_email_check check (email is null or char_length(btrim(email)) between 3 and 320),
  constraint business_crm_leads_phone_check check (phone is null or char_length(btrim(phone)) between 3 and 40),
  constraint business_crm_leads_source_check check (source in ('referral','website','social','phone','walk_in','campaign','partner','other')),
  constraint business_crm_leads_status_check check (status in ('new','contacted','qualified','converted','disqualified')),
  constraint business_crm_leads_currency_check check (public.is_supported_financial_currency(currency)),
  constraint business_crm_leads_value_check check (estimated_value >= 0),
  constraint business_crm_leads_conversion_check check (
    (status='converted' and converted_contact_id is not null and converted_at is not null)
    or (status<>'converted')
  )
);

create table public.business_crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_number bigint not null,
  opportunity_code text not null,
  pipeline_id uuid not null,
  stage_id uuid not null,
  lead_id uuid,
  contact_id uuid,
  title text not null,
  amount numeric(24,6) not null default 0,
  currency text not null,
  probability numeric(5,2) not null default 0,
  expected_close_date date,
  owner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open',
  lost_reason text,
  notes text,
  next_follow_up_at timestamptz,
  invoice_id uuid,
  won_at timestamptz,
  lost_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_opportunities_business_id_id_key unique (business_id, id),
  constraint business_crm_opportunities_number_key unique (business_id, opportunity_number),
  constraint business_crm_opportunities_code_key unique (business_id, opportunity_code),
  constraint business_crm_opportunities_pipeline_fk foreign key (business_id, pipeline_id)
    references public.business_crm_pipelines(business_id, id) on delete restrict,
  constraint business_crm_opportunities_stage_fk foreign key (business_id, stage_id)
    references public.business_crm_stages(business_id, id) on delete restrict,
  constraint business_crm_opportunities_lead_fk foreign key (business_id, lead_id)
    references public.business_crm_leads(business_id, id) on delete restrict,
  constraint business_crm_opportunities_contact_fk foreign key (business_id, contact_id)
    references public.business_contacts(business_id, id) on delete restrict,
  constraint business_crm_opportunities_invoice_fk foreign key (business_id, invoice_id)
    references public.business_sales_invoices(business_id, id) on delete restrict,
  constraint business_crm_opportunities_title_check check (char_length(btrim(title)) between 2 and 200),
  constraint business_crm_opportunities_amount_check check (amount >= 0),
  constraint business_crm_opportunities_currency_check check (public.is_supported_financial_currency(currency)),
  constraint business_crm_opportunities_probability_check check (probability between 0 and 100),
  constraint business_crm_opportunities_status_check check (status in ('open','won','lost')),
  constraint business_crm_opportunities_party_check check (lead_id is not null or contact_id is not null),
  constraint business_crm_opportunities_state_check check (
    (status='open' and won_at is null and lost_at is null)
    or (status='won' and won_at is not null and lost_at is null)
    or (status='lost' and lost_at is not null and won_at is null)
  )
);

alter table public.business_crm_leads add column converted_opportunity_id uuid;
alter table public.business_crm_leads add constraint business_crm_leads_opportunity_fk
  foreign key (business_id, converted_opportunity_id)
  references public.business_crm_opportunities(business_id, id) on delete restrict;

create table public.business_crm_opportunity_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid not null,
  line_number smallint not null,
  product_id uuid,
  warehouse_id uuid,
  description text not null,
  quantity numeric(24,6) not null default 1,
  unit_price numeric(24,6) not null default 0,
  discount_percent numeric(9,6) not null default 0,
  tax_rate numeric(9,6) not null default 0,
  revenue_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_opportunity_lines_business_id_id_key unique (business_id, id),
  constraint business_crm_opportunity_lines_line_key unique (opportunity_id, line_number),
  constraint business_crm_opportunity_lines_opportunity_fk foreign key (business_id, opportunity_id)
    references public.business_crm_opportunities(business_id, id) on delete cascade,
  constraint business_crm_opportunity_lines_product_fk foreign key (business_id, product_id)
    references public.business_products(business_id, id) on delete restrict,
  constraint business_crm_opportunity_lines_warehouse_fk foreign key (business_id, warehouse_id)
    references public.business_warehouses(business_id, id) on delete restrict,
  constraint business_crm_opportunity_lines_revenue_fk foreign key (business_id, revenue_account_id)
    references public.business_chart_of_accounts(business_id, id) on delete restrict,
  constraint business_crm_opportunity_lines_number_check check (line_number between 1 and 100),
  constraint business_crm_opportunity_lines_description_check check (char_length(btrim(description)) between 2 and 500),
  constraint business_crm_opportunity_lines_quantity_check check (quantity > 0),
  constraint business_crm_opportunity_lines_price_check check (unit_price >= 0),
  constraint business_crm_opportunity_lines_discount_check check (discount_percent between 0 and 100),
  constraint business_crm_opportunity_lines_tax_check check (tax_rate between 0 and 100),
  constraint business_crm_opportunity_lines_inventory_pair_check check (
    (product_id is null and warehouse_id is null) or (product_id is not null and warehouse_id is not null)
  )
);

create table public.business_crm_activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid,
  opportunity_id uuid,
  contact_id uuid,
  activity_type text not null,
  subject text not null,
  details text,
  status text not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_crm_activities_business_id_id_key unique (business_id, id),
  constraint business_crm_activities_lead_fk foreign key (business_id, lead_id)
    references public.business_crm_leads(business_id, id) on delete cascade,
  constraint business_crm_activities_opportunity_fk foreign key (business_id, opportunity_id)
    references public.business_crm_opportunities(business_id, id) on delete cascade,
  constraint business_crm_activities_contact_fk foreign key (business_id, contact_id)
    references public.business_contacts(business_id, id) on delete cascade,
  constraint business_crm_activities_type_check check (activity_type in ('note','call','email','meeting','task')),
  constraint business_crm_activities_subject_check check (char_length(btrim(subject)) between 2 and 200),
  constraint business_crm_activities_status_check check (status in ('open','completed','cancelled')),
  constraint business_crm_activities_target_check check (lead_id is not null or opportunity_id is not null or contact_id is not null),
  constraint business_crm_activities_completion_check check (
    (status='completed' and completed_at is not null) or (status<>'completed' and completed_at is null)
  )
);

create index business_crm_stages_business_pipeline_idx on public.business_crm_stages(business_id,pipeline_id,position);
create index business_crm_leads_business_status_idx on public.business_crm_leads(business_id,status,created_at desc);
create index business_crm_leads_owner_idx on public.business_crm_leads(business_id,owner_user_id,status);
create index business_crm_leads_follow_up_idx on public.business_crm_leads(business_id,next_follow_up_at) where next_follow_up_at is not null and status not in ('converted','disqualified');
create index business_crm_opportunities_business_stage_idx on public.business_crm_opportunities(business_id,stage_id,status);
create index business_crm_opportunities_owner_idx on public.business_crm_opportunities(business_id,owner_user_id,status);
create index business_crm_opportunities_close_idx on public.business_crm_opportunities(business_id,expected_close_date) where status='open';
create index business_crm_opportunities_follow_up_idx on public.business_crm_opportunities(business_id,next_follow_up_at) where next_follow_up_at is not null and status='open';
create index business_crm_opportunity_lines_product_idx on public.business_crm_opportunity_lines(business_id,product_id) where product_id is not null;
create index business_crm_activities_business_due_idx on public.business_crm_activities(business_id,status,due_at) where due_at is not null;
create index business_crm_activities_lead_idx on public.business_crm_activities(business_id,lead_id,created_at desc) where lead_id is not null;
create index business_crm_activities_opportunity_idx on public.business_crm_activities(business_id,opportunity_id,created_at desc) where opportunity_id is not null;

create trigger business_crm_pipelines_updated_at before update on public.business_crm_pipelines
for each row execute function private.set_business_workspace_updated_at();
create trigger business_crm_stages_updated_at before update on public.business_crm_stages
for each row execute function private.set_business_workspace_updated_at();
create trigger business_crm_settings_updated_at before update on public.business_crm_settings
for each row execute function private.set_business_workspace_updated_at();
create trigger business_crm_leads_updated_at before update on public.business_crm_leads
for each row execute function private.set_business_workspace_updated_at();
create trigger business_crm_opportunities_updated_at before update on public.business_crm_opportunities
for each row execute function private.set_business_workspace_updated_at();
create trigger business_crm_opportunity_lines_updated_at before update on public.business_crm_opportunity_lines
for each row execute function private.set_business_workspace_updated_at();
create trigger business_crm_activities_updated_at before update on public.business_crm_activities
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.can_view_business_crm(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select exists(
  select 1 from public.business_members membership
  where membership.business_id=p_business_id
    and membership.user_id=auth.uid()
    and membership.status='active'
    and (
      membership.role in ('owner','admin','accountant','manager','sales','viewer')
      or '*'=any(membership.permissions)
      or 'crm.view'=any(membership.permissions)
      or 'crm.manage'=any(membership.permissions)
    )
);
$$;

create or replace function private.can_manage_business_crm(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select exists(
  select 1 from public.business_members membership
  where membership.business_id=p_business_id
    and membership.user_id=auth.uid()
    and membership.status='active'
    and (
      membership.role in ('owner','admin','manager','sales')
      or '*'=any(membership.permissions)
      or 'crm.manage'=any(membership.permissions)
    )
);
$$;

revoke all on function private.can_view_business_crm(uuid) from public, anon;
revoke all on function private.can_manage_business_crm(uuid) from public, anon;
grant execute on function private.can_view_business_crm(uuid) to authenticated, service_role;
grant execute on function private.can_manage_business_crm(uuid) to authenticated, service_role;

alter table public.business_crm_pipelines enable row level security;
alter table public.business_crm_stages enable row level security;
alter table public.business_crm_settings enable row level security;
alter table public.business_crm_leads enable row level security;
alter table public.business_crm_opportunities enable row level security;
alter table public.business_crm_opportunity_lines enable row level security;
alter table public.business_crm_activities enable row level security;

create policy business_crm_pipelines_select on public.business_crm_pipelines for select to authenticated
using ((select private.can_view_business_crm(business_id)));
create policy business_crm_stages_select on public.business_crm_stages for select to authenticated
using ((select private.can_view_business_crm(business_id)));
create policy business_crm_settings_select on public.business_crm_settings for select to authenticated
using ((select private.can_view_business_crm(business_id)));
create policy business_crm_leads_select on public.business_crm_leads for select to authenticated
using ((select private.can_view_business_crm(business_id)));
create policy business_crm_opportunities_select on public.business_crm_opportunities for select to authenticated
using ((select private.can_view_business_crm(business_id)));
create policy business_crm_opportunity_lines_select on public.business_crm_opportunity_lines for select to authenticated
using ((select private.can_view_business_crm(business_id)));
create policy business_crm_activities_select on public.business_crm_activities for select to authenticated
using ((select private.can_view_business_crm(business_id)));

revoke all on public.business_crm_pipelines, public.business_crm_stages, public.business_crm_settings,
  public.business_crm_leads, public.business_crm_opportunities, public.business_crm_opportunity_lines,
  public.business_crm_activities from public, anon, authenticated;
grant select on public.business_crm_pipelines, public.business_crm_stages, public.business_crm_settings,
  public.business_crm_leads, public.business_crm_opportunities, public.business_crm_opportunity_lines,
  public.business_crm_activities to authenticated, service_role;
grant all on public.business_crm_pipelines, public.business_crm_stages, public.business_crm_settings,
  public.business_crm_leads, public.business_crm_opportunities, public.business_crm_opportunity_lines,
  public.business_crm_activities to postgres;

create or replace function private.initialize_business_crm(p_business_id uuid, p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  pipeline_uuid uuid;
begin
  if not exists(
    select 1 from public.businesses business
    where business.id=p_business_id and business.owner_user_id=p_owner_id and business.status='active'
  ) then
    raise exception 'Business owner verification failed.' using errcode='42501';
  end if;

  update public.businesses
  set module_config=jsonb_set(coalesce(module_config,'{}'::jsonb),'{crm}','true'::jsonb,true)
  where id=p_business_id and workspace_mode='advanced_company';

  select pipeline.id into pipeline_uuid
  from public.business_crm_pipelines pipeline
  where pipeline.business_id=p_business_id and pipeline.is_default and pipeline.status='active'
  limit 1;

  if pipeline_uuid is null then
    insert into public.business_crm_pipelines(business_id,name,is_default,status,created_by)
    values(p_business_id,'Sales pipeline',true,'active',p_owner_id)
    returning id into pipeline_uuid;

    insert into public.business_crm_stages(business_id,pipeline_id,name,position,probability,category) values
      (p_business_id,pipeline_uuid,'New lead',1,10,'open'),
      (p_business_id,pipeline_uuid,'Qualified',2,30,'open'),
      (p_business_id,pipeline_uuid,'Proposal',3,55,'open'),
      (p_business_id,pipeline_uuid,'Negotiation',4,75,'open'),
      (p_business_id,pipeline_uuid,'Won',5,100,'won'),
      (p_business_id,pipeline_uuid,'Lost',6,0,'lost');
  end if;

  insert into public.business_crm_settings(business_id,default_pipeline_id)
  values(p_business_id,pipeline_uuid)
  on conflict(business_id) do update
  set default_pipeline_id=coalesce(public.business_crm_settings.default_pipeline_id,excluded.default_pipeline_id),
      updated_at=now();
end;
$$;

revoke all on function private.initialize_business_crm(uuid,uuid) from public, anon, authenticated;
grant execute on function private.initialize_business_crm(uuid,uuid) to service_role;

create or replace function private.initialize_business_crm_after_owner_membership()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
begin
  if new.role='owner' and new.status='active' then
    perform private.initialize_business_crm(new.business_id,new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function private.initialize_business_crm_after_owner_membership() from public, anon, authenticated;

create trigger business_crm_initialize_after_owner_membership
after insert or update of role,status on public.business_members
for each row execute function private.initialize_business_crm_after_owner_membership();

create or replace function private.refresh_business_crm_follow_up()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare
  target_business uuid:=coalesce(new.business_id,old.business_id);
  target_lead uuid:=coalesce(new.lead_id,old.lead_id);
  target_opportunity uuid:=coalesce(new.opportunity_id,old.opportunity_id);
begin
  if target_lead is not null then
    update public.business_crm_leads lead
    set next_follow_up_at=(
      select min(activity.due_at)
      from public.business_crm_activities activity
      where activity.business_id=target_business
        and activity.lead_id=target_lead
        and activity.status='open'
        and activity.due_at is not null
    )
    where lead.business_id=target_business and lead.id=target_lead;
  end if;

  if target_opportunity is not null then
    update public.business_crm_opportunities opportunity
    set next_follow_up_at=(
      select min(activity.due_at)
      from public.business_crm_activities activity
      where activity.business_id=target_business
        and activity.opportunity_id=target_opportunity
        and activity.status='open'
        and activity.due_at is not null
    )
    where opportunity.business_id=target_business and opportunity.id=target_opportunity;
  end if;
  return coalesce(new,old);
end;
$$;

revoke all on function private.refresh_business_crm_follow_up() from public, anon, authenticated;
create trigger business_crm_activities_refresh_follow_up
after insert or update or delete on public.business_crm_activities
for each row execute function private.refresh_business_crm_follow_up();

do $$
declare owner_record record;
begin
  for owner_record in
    select business.id as business_id,business.owner_user_id
    from public.businesses business
    where business.status='active' and business.workspace_mode='advanced_company'
  loop
    perform private.initialize_business_crm(owner_record.business_id,owner_record.owner_user_id);
  end loop;
end;
$$;
