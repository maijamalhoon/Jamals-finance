begin;

create table public.business_notification_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  due_soon_days smallint not null default 7,
  fiscal_period_warning_days smallint not null default 14,
  receivable_alerts_enabled boolean not null default true,
  payable_alerts_enabled boolean not null default true,
  low_stock_alerts_enabled boolean not null default true,
  crm_alerts_enabled boolean not null default true,
  team_alerts_enabled boolean not null default true,
  accounting_alerts_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_notification_settings_due_days_check check (due_soon_days between 1 and 30),
  constraint business_notification_settings_period_days_check check (fiscal_period_warning_days between 1 and 60)
);

create table public.business_notification_preferences (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  sales_alerts_enabled boolean not null default true,
  purchase_alerts_enabled boolean not null default true,
  inventory_alerts_enabled boolean not null default true,
  crm_alerts_enabled boolean not null default true,
  team_alerts_enabled boolean not null default true,
  accounting_alerts_enabled boolean not null default true,
  realtime_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id,user_id)
);

create table public.business_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_key text not null,
  category text not null,
  kind text not null,
  severity text not null default 'info',
  title text not null,
  message text not null,
  action_path text not null,
  source_type text,
  source_id uuid,
  target_user_id uuid references auth.users(id) on delete cascade,
  audience_roles text[] not null default '{}'::text[],
  audience_permissions text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_notifications_event_key_check check (char_length(event_key) between 3 and 240),
  constraint business_notifications_category_check check (category in ('sales','purchases','inventory','crm','team','accounting','system')),
  constraint business_notifications_severity_check check (severity in ('critical','warning','info','success')),
  constraint business_notifications_kind_check check (char_length(kind) between 3 and 80),
  constraint business_notifications_title_check check (char_length(btrim(title)) between 3 and 200),
  constraint business_notifications_message_check check (char_length(btrim(message)) between 3 and 1000),
  constraint business_notifications_action_path_check check (char_length(action_path) between 1 and 500 and left(action_path,1)='/'),
  constraint business_notifications_metadata_check check (jsonb_typeof(metadata)='object'),
  constraint business_notifications_times_check check (expires_at is null or expires_at>starts_at),
  unique (business_id,event_key),
  unique (id,business_id)
);

create table public.business_notification_states (
  notification_id uuid not null,
  business_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (notification_id,user_id),
  foreign key (notification_id,business_id) references public.business_notifications(id,business_id) on delete cascade,
  constraint business_notification_states_snooze_check check (snoozed_until is null or snoozed_until>created_at-interval '1 minute')
);

create index business_notifications_active_idx on public.business_notifications(business_id,resolved_at,starts_at,created_at desc);
create index business_notifications_target_idx on public.business_notifications(target_user_id,created_at desc) where target_user_id is not null;
create index business_notifications_source_idx on public.business_notifications(business_id,source_type,source_id) where source_id is not null;
create index business_notification_states_user_idx on public.business_notification_states(business_id,user_id,updated_at desc);
create index business_notification_states_unread_idx on public.business_notification_states(business_id,user_id,read_at) where dismissed_at is null;
create index business_notification_preferences_user_idx on public.business_notification_preferences(user_id,business_id);

create trigger business_notification_settings_updated_at before update on public.business_notification_settings for each row execute function private.set_business_workspace_updated_at();
create trigger business_notification_preferences_updated_at before update on public.business_notification_preferences for each row execute function private.set_business_workspace_updated_at();
create trigger business_notifications_updated_at before update on public.business_notifications for each row execute function private.set_business_workspace_updated_at();
create trigger business_notification_states_updated_at before update on public.business_notification_states for each row execute function private.set_business_workspace_updated_at();

create or replace function private.business_team_permission_catalog()
returns text[] language sql immutable security invoker set search_path='pg_catalog' as $$
select array[
 'team.view','team.manage','notifications.view','notifications.manage',
 'accounting.view','accounting.manage','contacts.view','contacts.manage',
 'sales.view','sales.manage','sales.collect','sales.return',
 'purchases.view','purchases.manage','purchases.pay','purchases.return',
 'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
 'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.can_view_business_notifications(p_business_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
select exists(
  select 1 from public.business_members m
  join public.businesses b on b.id=m.business_id and b.status='active'
  where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active'
);
$$;

create or replace function private.can_manage_business_notifications(p_business_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
select exists(
  select 1 from public.business_members m
  join public.businesses b on b.id=m.business_id and b.status='active'
  where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active'
    and (m.role in ('owner','admin') or '*'=any(m.permissions) or 'notifications.manage'=any(m.permissions))
);
$$;

create or replace function private.business_notification_visible_to_current_user(
  p_business_id uuid,
  p_target_user_id uuid,
  p_audience_roles text[],
  p_audience_permissions text[]
)
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
select exists(
  select 1 from public.business_members m
  join public.businesses b on b.id=m.business_id and b.status='active'
  where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active'
    and (
      p_target_user_id=auth.uid()
      or (
        p_target_user_id is null
        and (
          (coalesce(cardinality(p_audience_roles),0)=0 and coalesce(cardinality(p_audience_permissions),0)=0)
          or m.role=any(coalesce(p_audience_roles,'{}'::text[]))
          or '*'=any(m.permissions)
          or m.permissions && coalesce(p_audience_permissions,'{}'::text[])
        )
      )
    )
);
$$;

create or replace function private.upsert_business_notification(
  p_business_id uuid,
  p_event_key text,
  p_category text,
  p_kind text,
  p_severity text,
  p_title text,
  p_message text,
  p_action_path text,
  p_source_type text default null,
  p_source_id uuid default null,
  p_target_user_id uuid default null,
  p_audience_roles text[] default '{}'::text[],
  p_audience_permissions text[] default '{}'::text[],
  p_metadata jsonb default '{}'::jsonb,
  p_starts_at timestamptz default now(),
  p_expires_at timestamptz default null,
  p_created_by uuid default null
)
returns uuid language plpgsql security definer set search_path='pg_catalog','public' as $$
declare notification_id uuid;
begin
  insert into public.business_notifications(
    business_id,event_key,category,kind,severity,title,message,action_path,
    source_type,source_id,target_user_id,audience_roles,audience_permissions,
    metadata,starts_at,expires_at,created_by
  ) values(
    p_business_id,left(p_event_key,240),p_category,p_kind,p_severity,left(btrim(p_title),200),left(btrim(p_message),1000),left(p_action_path,500),
    p_source_type,p_source_id,p_target_user_id,coalesce(p_audience_roles,'{}'::text[]),coalesce(p_audience_permissions,'{}'::text[]),
    coalesce(p_metadata,'{}'::jsonb),coalesce(p_starts_at,now()),p_expires_at,p_created_by
  )
  on conflict (business_id,event_key) do update set
    category=excluded.category,kind=excluded.kind,severity=excluded.severity,title=excluded.title,
    message=excluded.message,action_path=excluded.action_path,source_type=excluded.source_type,
    source_id=excluded.source_id,target_user_id=excluded.target_user_id,
    audience_roles=excluded.audience_roles,audience_permissions=excluded.audience_permissions,
    metadata=excluded.metadata,starts_at=excluded.starts_at,expires_at=excluded.expires_at,
    resolved_at=null,updated_at=now()
  returning id into notification_id;
  return notification_id;
end;
$$;

create or replace function private.refresh_business_notifications_internal(p_business_id uuid,p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare
  business_record record;
  settings_record record;
  source_record record;
  today_date date;
  active_keys text[]:='{}'::text[];
  event_key text;
  remaining_amount numeric;
  notification_count integer:=0;
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then
    raise exception 'Business notification access required.' using errcode='42501';
  end if;

  select id,name,slug,base_currency,timezone,workspace_mode into business_record
  from public.businesses where id=p_business_id and status='active';
  if not found then raise exception 'Active business not found.' using errcode='P0002'; end if;

  insert into public.business_notification_settings(business_id)
  values(p_business_id) on conflict (business_id) do nothing;
  select * into settings_record from public.business_notification_settings where business_id=p_business_id;
  today_date:=(p_now at time zone business_record.timezone)::date;

  if settings_record.receivable_alerts_enabled then
    for source_record in
      select i.id,i.invoice_code,i.due_date,i.status,greatest(i.total_base-i.paid_base-i.returned_base,0) remaining
      from public.business_sales_invoices i
      where i.business_id=p_business_id and i.status in ('issued','partially_paid')
        and greatest(i.total_base-i.paid_base-i.returned_base,0)>0
        and i.due_date<=today_date+settings_record.due_soon_days
    loop
      event_key:='receivable_due:'||source_record.id::text;
      active_keys:=array_append(active_keys,event_key);
      remaining_amount:=source_record.remaining;
      perform private.upsert_business_notification(
        p_business_id,event_key,'sales',
        case when source_record.due_date<today_date then 'invoice_overdue' when source_record.due_date=today_date then 'invoice_due_today' else 'invoice_due_soon' end,
        case when source_record.due_date<today_date then 'critical' else 'warning' end,
        case when source_record.due_date<today_date then source_record.invoice_code||' is overdue' when source_record.due_date=today_date then source_record.invoice_code||' is due today' else source_record.invoice_code||' is due soon' end,
        'Outstanding receivable: '||remaining_amount::text||' '||business_record.base_currency||'. Due '||source_record.due_date::text||'.',
        '/business/'||business_record.slug||'/sales','sales_invoice',source_record.id,null,
        array['owner','admin','accountant','manager','sales','cashier','viewer'],
        array['sales.view','sales.manage','sales.collect','shop.sell','reports.view'],
        jsonb_build_object('managed_by','refresh','due_date',source_record.due_date,'remaining_base',remaining_amount),p_now,null,null
      );
      notification_count:=notification_count+1;
    end loop;
  end if;

  if settings_record.payable_alerts_enabled then
    for source_record in
      select b.id,coalesce(b.bill_code,'Supplier bill') bill_code,b.due_date,b.status,greatest(b.total_base-b.paid_base-b.returned_base,0) remaining
      from public.business_supplier_bills b
      where b.business_id=p_business_id and b.status in ('issued','partially_paid')
        and greatest(b.total_base-b.paid_base-b.returned_base,0)>0
        and b.due_date<=today_date+settings_record.due_soon_days
    loop
      event_key:='payable_due:'||source_record.id::text;
      active_keys:=array_append(active_keys,event_key);
      remaining_amount:=source_record.remaining;
      perform private.upsert_business_notification(
        p_business_id,event_key,'purchases',
        case when source_record.due_date<today_date then 'bill_overdue' when source_record.due_date=today_date then 'bill_due_today' else 'bill_due_soon' end,
        case when source_record.due_date<today_date then 'critical' else 'warning' end,
        case when source_record.due_date<today_date then source_record.bill_code||' is overdue' when source_record.due_date=today_date then source_record.bill_code||' is due today' else source_record.bill_code||' is due soon' end,
        'Outstanding payable: '||remaining_amount::text||' '||business_record.base_currency||'. Due '||source_record.due_date::text||'.',
        '/business/'||business_record.slug||'/purchases','supplier_bill',source_record.id,null,
        array['owner','admin','accountant','manager','inventory','viewer'],
        array['purchases.view','purchases.manage','purchases.pay','shop.purchase','reports.view'],
        jsonb_build_object('managed_by','refresh','due_date',source_record.due_date,'remaining_base',remaining_amount),p_now,null,null
      );
      notification_count:=notification_count+1;
    end loop;
  end if;

  if settings_record.low_stock_alerts_enabled then
    for source_record in
      select p.id,p.name,p.sku,p.reorder_level,coalesce(sum(i.quantity_on_hand),0) quantity_on_hand
      from public.business_products p
      left join public.business_inventory_balances i on i.business_id=p.business_id and i.product_id=p.id
      where p.business_id=p_business_id and p.status='active' and p.product_type='inventory' and p.reorder_level>0
      group by p.id,p.name,p.sku,p.reorder_level
      having coalesce(sum(i.quantity_on_hand),0)<=p.reorder_level
    loop
      event_key:='low_stock:'||source_record.id::text;
      active_keys:=array_append(active_keys,event_key);
      perform private.upsert_business_notification(
        p_business_id,event_key,'inventory','low_stock',
        case when source_record.quantity_on_hand<=0 then 'critical' else 'warning' end,
        case when source_record.quantity_on_hand<=0 then source_record.name||' is out of stock' else source_record.name||' is low in stock' end,
        'Available '||source_record.quantity_on_hand::text||'; reorder level '||source_record.reorder_level::text||'.',
        '/business/'||business_record.slug||case when business_record.workspace_mode='simple_shop' then '/shop' else '/inventory' end,
        'product',source_record.id,null,
        array['owner','admin','manager','inventory','cashier','viewer'],
        array['inventory.view','inventory.manage','shop.view','shop.purchase'],
        jsonb_build_object('managed_by','refresh','sku',source_record.sku,'quantity_on_hand',source_record.quantity_on_hand,'reorder_level',source_record.reorder_level),p_now,null,null
      );
      notification_count:=notification_count+1;
    end loop;
  end if;

  if settings_record.crm_alerts_enabled and business_record.workspace_mode='advanced_company' then
    for source_record in
      select a.id,a.subject,a.due_at,a.assigned_to
      from public.business_crm_activities a
      where a.business_id=p_business_id and a.status='open' and a.due_at is not null
        and a.due_at<=p_now+make_interval(days=>settings_record.due_soon_days)
    loop
      event_key:='crm_activity_due:'||source_record.id::text;
      active_keys:=array_append(active_keys,event_key);
      perform private.upsert_business_notification(
        p_business_id,event_key,'crm',
        case when source_record.due_at<p_now then 'crm_activity_overdue' else 'crm_activity_due' end,
        case when source_record.due_at<p_now then 'critical' else 'warning' end,
        case when source_record.due_at<p_now then source_record.subject||' is overdue' else source_record.subject||' is approaching' end,
        'CRM follow-up scheduled for '||source_record.due_at::text||'.',
        '/business/'||business_record.slug||'/crm','crm_activity',source_record.id,source_record.assigned_to,
        array['owner','admin','manager','sales','viewer'],array['crm.view','crm.manage'],
        jsonb_build_object('managed_by','refresh','due_at',source_record.due_at),p_now,null,null
      );
      notification_count:=notification_count+1;
    end loop;
  end if;

  if settings_record.accounting_alerts_enabled and business_record.workspace_mode='advanced_company' then
    for source_record in
      select f.id,f.name,f.ends_on from public.business_fiscal_periods f
      where f.business_id=p_business_id and f.status='open' and f.starts_on<=today_date
        and f.ends_on<=today_date+settings_record.fiscal_period_warning_days
    loop
      event_key:='fiscal_period:'||source_record.id::text;
      active_keys:=array_append(active_keys,event_key);
      perform private.upsert_business_notification(
        p_business_id,event_key,'accounting',
        case when source_record.ends_on<today_date then 'fiscal_period_past_due' else 'fiscal_period_ending' end,
        case when source_record.ends_on<today_date then 'critical' else 'info' end,
        case when source_record.ends_on<today_date then source_record.name||' remains open' else source_record.name||' is ending soon' end,
        'Fiscal period ends '||source_record.ends_on::text||'. Review and close it after posting is complete.',
        '/business/'||business_record.slug||'/accounting','fiscal_period',source_record.id,null,
        array['owner','admin','accountant','manager','viewer'],array['accounting.view','accounting.manage','reports.view'],
        jsonb_build_object('managed_by','refresh','ends_on',source_record.ends_on),p_now,null,null
      );
      notification_count:=notification_count+1;
    end loop;
  end if;

  if settings_record.team_alerts_enabled then
    for source_record in
      select i.id,i.email,i.delivery_status,i.expires_at,i.invited_by
      from public.business_invitations i
      where i.business_id=p_business_id and i.status='pending'
        and (i.delivery_status='failed' or i.expires_at<=p_now+interval '1 day')
    loop
      event_key:='team_invitation:'||source_record.id::text;
      active_keys:=array_append(active_keys,event_key);
      perform private.upsert_business_notification(
        p_business_id,event_key,'team',
        case when source_record.delivery_status='failed' then 'invitation_delivery_failed' else 'invitation_expiring' end,
        'warning',
        case when source_record.delivery_status='failed' then 'Invitation email failed' else 'Invitation expires soon' end,
        source_record.email||case when source_record.delivery_status='failed' then ' needs a secure copy-link or resend.' else ' invitation expires at '||source_record.expires_at::text||'.' end,
        '/business/'||business_record.slug||'/team','business_invitation',source_record.id,source_record.invited_by,
        array['owner','admin'],array['team.manage','notifications.manage'],
        jsonb_build_object('managed_by','refresh','email',source_record.email,'expires_at',source_record.expires_at),p_now,null,null
      );
      notification_count:=notification_count+1;
    end loop;
  end if;

  update public.business_notifications
  set resolved_at=p_now,updated_at=now()
  where business_id=p_business_id and resolved_at is null
    and metadata->>'managed_by'='refresh'
    and not (event_key=any(active_keys));

  return jsonb_build_object('active_generated',notification_count,'active_keys',cardinality(active_keys));
end;
$$;

create or replace function private.business_notification_category_enabled(p_category text,p_preferences public.business_notification_preferences)
returns boolean language sql immutable security invoker set search_path='pg_catalog','public' as $$
select p_preferences.in_app_enabled and case p_category
  when 'sales' then p_preferences.sales_alerts_enabled
  when 'purchases' then p_preferences.purchase_alerts_enabled
  when 'inventory' then p_preferences.inventory_alerts_enabled
  when 'crm' then p_preferences.crm_alerts_enabled
  when 'team' then p_preferences.team_alerts_enabled
  when 'accounting' then p_preferences.accounting_alerts_enabled
  else true end;
$$;

create or replace function private.get_business_notifications_snapshot_internal(p_business_id uuid,p_limit integer default 100,p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare result jsonb; prefs public.business_notification_preferences; safe_limit integer:=least(200,greatest(1,coalesce(p_limit,100)));
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then
    raise exception 'Business notification access required.' using errcode='42501';
  end if;
  perform private.refresh_business_notifications_internal(p_business_id,p_now);
  insert into public.business_notification_preferences(business_id,user_id) values(p_business_id,auth.uid()) on conflict (business_id,user_id) do nothing;
  select * into prefs from public.business_notification_preferences where business_id=p_business_id and user_id=auth.uid();

  with visible as (
    select n.*,s.read_at,s.dismissed_at,s.snoozed_until
    from public.business_notifications n
    left join public.business_notification_states s on s.notification_id=n.id and s.user_id=auth.uid()
    where n.business_id=p_business_id and n.resolved_at is null and n.starts_at<=p_now
      and (n.expires_at is null or n.expires_at>p_now)
      and s.dismissed_at is null
      and (s.snoozed_until is null or s.snoozed_until<=p_now)
      and private.business_notification_visible_to_current_user(n.business_id,n.target_user_id,n.audience_roles,n.audience_permissions)
      and private.business_notification_category_enabled(n.category,prefs)
  ), ordered as (
    select * from visible order by case severity when 'critical' then 0 when 'warning' then 1 when 'info' then 2 else 3 end,created_at desc limit safe_limit
  )
  select jsonb_build_object(
    'business',(select jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'workspace_mode',b.workspace_mode,'timezone',b.timezone) from public.businesses b where b.id=p_business_id),
    'summary',jsonb_build_object(
      'active',(select count(*) from visible),
      'unread',(select count(*) from visible where read_at is null),
      'critical',(select count(*) from visible where severity='critical'),
      'snoozed',(select count(*) from public.business_notification_states s join public.business_notifications n on n.id=s.notification_id where s.business_id=p_business_id and s.user_id=auth.uid() and s.snoozed_until>p_now and n.resolved_at is null)
    ),
    'category_counts',coalesce((select jsonb_object_agg(category,total) from (select category,count(*) total from visible group by category) c),'{}'::jsonb),
    'notifications',coalesce((select jsonb_agg(jsonb_build_object(
      'id',o.id,'event_key',o.event_key,'category',o.category,'kind',o.kind,'severity',o.severity,
      'title',o.title,'message',o.message,'action_path',o.action_path,'source_type',o.source_type,'source_id',o.source_id,
      'metadata',o.metadata,'starts_at',o.starts_at,'expires_at',o.expires_at,'created_at',o.created_at,
      'read',o.read_at is not null,'read_at',o.read_at,'snoozed_until',o.snoozed_until
    ) order by case o.severity when 'critical' then 0 when 'warning' then 1 when 'info' then 2 else 3 end,o.created_at desc) from ordered o),'[]'::jsonb),
    'preferences',to_jsonb(prefs)-'created_at'-'updated_at',
    'settings',(select to_jsonb(s)-'created_at'-'updated_at' from public.business_notification_settings s where s.business_id=p_business_id),
    'can_manage',private.can_manage_business_notifications(p_business_id)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_business_notifications_snapshot(p_business_id uuid,p_limit integer default 100)
returns jsonb language sql volatile security invoker set search_path='pg_catalog','public','private' as $$
select private.get_business_notifications_snapshot_internal(p_business_id,p_limit,now());
$$;

create or replace function private.set_business_notification_state_internal(p_business_id uuid,p_notification_id uuid,p_action text,p_snoozed_until timestamptz default null)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare action_name text:=lower(btrim(coalesce(p_action,''))); notification_record record;
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then raise exception 'Business notification access required.' using errcode='42501'; end if;
  select * into notification_record from public.business_notifications n where n.id=p_notification_id and n.business_id=p_business_id
    and private.business_notification_visible_to_current_user(n.business_id,n.target_user_id,n.audience_roles,n.audience_permissions);
  if not found then raise exception 'Notification not found.' using errcode='P0002'; end if;
  if action_name not in ('read','unread','dismiss','snooze','restore') then raise exception 'Unsupported notification action.' using errcode='22023'; end if;
  if action_name='snooze' and (p_snoozed_until is null or p_snoozed_until<=now() or p_snoozed_until>now()+interval '30 days') then raise exception 'Snooze must be within the next 30 days.' using errcode='22023'; end if;

  insert into public.business_notification_states(notification_id,business_id,user_id,read_at,dismissed_at,snoozed_until)
  values(p_notification_id,p_business_id,auth.uid(),
    case when action_name='read' then now() else null end,
    case when action_name='dismiss' then now() else null end,
    case when action_name='snooze' then p_snoozed_until else null end)
  on conflict(notification_id,user_id) do update set
    read_at=case when action_name='read' then now() when action_name='unread' then null else public.business_notification_states.read_at end,
    dismissed_at=case when action_name='dismiss' then now() when action_name='restore' then null else public.business_notification_states.dismissed_at end,
    snoozed_until=case when action_name='snooze' then p_snoozed_until when action_name='restore' then null else public.business_notification_states.snoozed_until end,
    updated_at=now();
  return jsonb_build_object('notification_id',p_notification_id,'action',action_name);
end;
$$;

create or replace function public.set_business_notification_state(p_business_id uuid,p_notification_id uuid,p_action text,p_snoozed_until timestamptz default null)
returns jsonb language sql volatile security invoker set search_path='pg_catalog','public','private' as $$
select private.set_business_notification_state_internal(p_business_id,p_notification_id,p_action,p_snoozed_until);
$$;

create or replace function private.mark_all_business_notifications_read_internal(p_business_id uuid)
returns integer language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare affected integer;
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then raise exception 'Business notification access required.' using errcode='42501'; end if;
  insert into public.business_notification_states(notification_id,business_id,user_id,read_at)
  select n.id,n.business_id,auth.uid(),now() from public.business_notifications n
  where n.business_id=p_business_id and n.resolved_at is null and n.starts_at<=now() and (n.expires_at is null or n.expires_at>now())
    and private.business_notification_visible_to_current_user(n.business_id,n.target_user_id,n.audience_roles,n.audience_permissions)
  on conflict(notification_id,user_id) do update set read_at=now(),updated_at=now();
  get diagnostics affected=row_count;
  return affected;
end;
$$;

create or replace function public.mark_all_business_notifications_read(p_business_id uuid)
returns integer language sql volatile security invoker set search_path='pg_catalog','public','private' as $$
select private.mark_all_business_notifications_read_internal(p_business_id);
$$;

create or replace function private.update_business_notification_preferences_internal(p_business_id uuid,p_preferences jsonb)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare result public.business_notification_preferences;
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then raise exception 'Business notification access required.' using errcode='42501'; end if;
  if p_preferences is null or jsonb_typeof(p_preferences)<>'object' then raise exception 'Preferences must be an object.' using errcode='22023'; end if;
  insert into public.business_notification_preferences(
    business_id,user_id,in_app_enabled,sales_alerts_enabled,purchase_alerts_enabled,inventory_alerts_enabled,
    crm_alerts_enabled,team_alerts_enabled,accounting_alerts_enabled,realtime_enabled
  ) values(
    p_business_id,auth.uid(),
    coalesce((p_preferences->>'in_app_enabled')::boolean,true),coalesce((p_preferences->>'sales_alerts_enabled')::boolean,true),
    coalesce((p_preferences->>'purchase_alerts_enabled')::boolean,true),coalesce((p_preferences->>'inventory_alerts_enabled')::boolean,true),
    coalesce((p_preferences->>'crm_alerts_enabled')::boolean,true),coalesce((p_preferences->>'team_alerts_enabled')::boolean,true),
    coalesce((p_preferences->>'accounting_alerts_enabled')::boolean,true),coalesce((p_preferences->>'realtime_enabled')::boolean,true)
  ) on conflict(business_id,user_id) do update set
    in_app_enabled=excluded.in_app_enabled,sales_alerts_enabled=excluded.sales_alerts_enabled,
    purchase_alerts_enabled=excluded.purchase_alerts_enabled,inventory_alerts_enabled=excluded.inventory_alerts_enabled,
    crm_alerts_enabled=excluded.crm_alerts_enabled,team_alerts_enabled=excluded.team_alerts_enabled,
    accounting_alerts_enabled=excluded.accounting_alerts_enabled,realtime_enabled=excluded.realtime_enabled,updated_at=now()
  returning * into result;
  return to_jsonb(result)-'created_at'-'updated_at';
end;
$$;

create or replace function public.update_business_notification_preferences(p_business_id uuid,p_preferences jsonb)
returns jsonb language sql volatile security invoker set search_path='pg_catalog','public','private' as $$
select private.update_business_notification_preferences_internal(p_business_id,p_preferences);
$$;

create or replace function private.update_business_notification_settings_internal(p_business_id uuid,p_settings jsonb)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare result public.business_notification_settings;
begin
  if auth.uid() is null or not private.can_manage_business_notifications(p_business_id) then raise exception 'Notification management permission required.' using errcode='42501'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'Settings must be an object.' using errcode='22023'; end if;
  insert into public.business_notification_settings(
    business_id,due_soon_days,fiscal_period_warning_days,receivable_alerts_enabled,payable_alerts_enabled,
    low_stock_alerts_enabled,crm_alerts_enabled,team_alerts_enabled,accounting_alerts_enabled,updated_by
  ) values(
    p_business_id,coalesce((p_settings->>'due_soon_days')::smallint,7),coalesce((p_settings->>'fiscal_period_warning_days')::smallint,14),
    coalesce((p_settings->>'receivable_alerts_enabled')::boolean,true),coalesce((p_settings->>'payable_alerts_enabled')::boolean,true),
    coalesce((p_settings->>'low_stock_alerts_enabled')::boolean,true),coalesce((p_settings->>'crm_alerts_enabled')::boolean,true),
    coalesce((p_settings->>'team_alerts_enabled')::boolean,true),coalesce((p_settings->>'accounting_alerts_enabled')::boolean,true),auth.uid()
  ) on conflict(business_id) do update set
    due_soon_days=excluded.due_soon_days,fiscal_period_warning_days=excluded.fiscal_period_warning_days,
    receivable_alerts_enabled=excluded.receivable_alerts_enabled,payable_alerts_enabled=excluded.payable_alerts_enabled,
    low_stock_alerts_enabled=excluded.low_stock_alerts_enabled,crm_alerts_enabled=excluded.crm_alerts_enabled,
    team_alerts_enabled=excluded.team_alerts_enabled,accounting_alerts_enabled=excluded.accounting_alerts_enabled,
    updated_by=auth.uid(),updated_at=now()
  returning * into result;
  perform private.refresh_business_notifications_internal(p_business_id,now());
  return to_jsonb(result)-'created_at'-'updated_at';
end;
$$;

create or replace function public.update_business_notification_settings(p_business_id uuid,p_settings jsonb)
returns jsonb language sql volatile security invoker set search_path='pg_catalog','public','private' as $$
select private.update_business_notification_settings_internal(p_business_id,p_settings);
$$;

create or replace function private.business_payment_notification_trigger()
returns trigger language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare slug text; amount numeric; category_name text; action_route text; title_text text; permission_list text[]; role_list text[];
begin
  if new.status<>'posted' or (tg_op='UPDATE' and old.status='posted') then return new; end if;
  select b.slug into slug from public.businesses b where b.id=new.business_id;
  if tg_table_name='business_sales_payments' then
    amount:=new.amount_base;category_name:='sales';action_route:='/business/'||slug||'/sales';title_text:='Customer payment received';
    permission_list:=array['sales.view','sales.manage','sales.collect','reports.view'];role_list:=array['owner','admin','accountant','manager','sales','cashier','viewer'];
  else
    amount:=new.amount_base;category_name:='purchases';action_route:='/business/'||slug||'/purchases';title_text:='Supplier payment posted';
    permission_list:=array['purchases.view','purchases.manage','purchases.pay','reports.view'];role_list:=array['owner','admin','accountant','manager','viewer'];
  end if;
  perform private.upsert_business_notification(new.business_id,'payment:'||tg_table_name||':'||new.id::text,category_name,'payment_posted','success',title_text,
    'Posted amount: '||amount::text||' in base currency.',action_route,tg_table_name,new.id,null,role_list,permission_list,
    jsonb_build_object('managed_by','event','payment_date',new.payment_date,'amount_base',amount),coalesce(new.posted_at,new.created_at),null,new.created_by);
  return new;
end;
$$;

create trigger business_sales_payments_notification after insert or update of status on public.business_sales_payments for each row execute function private.business_payment_notification_trigger();
create trigger business_supplier_payments_notification after insert or update of status on public.business_supplier_payments for each row execute function private.business_payment_notification_trigger();

create or replace function private.business_team_notification_trigger()
returns trigger language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare slug text; title_text text; severity_text text:='info'; target_id uuid:=null;
begin
  select b.slug into slug from public.businesses b where b.id=new.business_id;
  title_text:=case new.action
    when 'invitation_accepted' then 'Team invitation accepted'
    when 'invitation_failed' then 'Invitation email failed'
    when 'member_suspended' then 'Team member suspended'
    when 'member_reactivated' then 'Team member reactivated'
    when 'member_revoked' then 'Team member removed'
    when 'ownership_transferred' then 'Business ownership transferred'
    else 'Team access updated' end;
  if new.action in ('invitation_failed','member_suspended','member_revoked') then severity_text:='warning'; end if;
  if new.action='ownership_transferred' then target_id:=new.target_user_id; end if;
  perform private.upsert_business_notification(new.business_id,'team_audit:'||new.id::text,'team',new.action,severity_text,title_text,
    'A team access event was recorded. Open Team & Permissions for details.','/business/'||slug||'/team','team_audit',null,target_id,
    array['owner','admin'],array['team.view','team.manage','notifications.manage'],jsonb_build_object('managed_by','event','audit_id',new.id,'action',new.action),new.created_at,null,new.actor_user_id);
  return new;
end;
$$;
create trigger business_team_audit_notification after insert on public.business_team_audit_log for each row execute function private.business_team_notification_trigger();

alter table public.business_notification_settings enable row level security;
alter table public.business_notification_preferences enable row level security;
alter table public.business_notifications enable row level security;
alter table public.business_notification_states enable row level security;

revoke all on public.business_notification_settings,public.business_notification_preferences,public.business_notifications,public.business_notification_states from public,anon,authenticated;
grant select on public.business_notification_settings,public.business_notification_preferences,public.business_notifications,public.business_notification_states to authenticated,service_role;
grant all on public.business_notification_settings,public.business_notification_preferences,public.business_notifications,public.business_notification_states to postgres,service_role;

create policy business_notification_settings_select on public.business_notification_settings for select to authenticated using ((select private.can_view_business_notifications(business_id)));
create policy business_notification_preferences_select on public.business_notification_preferences for select to authenticated using ((select auth.uid())=user_id and (select private.can_view_business_notifications(business_id)));
create policy business_notifications_select on public.business_notifications for select to authenticated using ((select private.business_notification_visible_to_current_user(business_id,target_user_id,audience_roles,audience_permissions)));
create policy business_notification_states_select on public.business_notification_states for select to authenticated using ((select auth.uid())=user_id and (select private.can_view_business_notifications(business_id)));

revoke all on function private.business_team_permission_catalog() from public,anon;
revoke all on function private.can_view_business_notifications(uuid),private.can_manage_business_notifications(uuid),private.business_notification_visible_to_current_user(uuid,uuid,text[],text[]),private.upsert_business_notification(uuid,text,text,text,text,text,text,text,text,uuid,uuid,text[],text[],jsonb,timestamptz,timestamptz,uuid),private.refresh_business_notifications_internal(uuid,timestamptz),private.business_notification_category_enabled(text,public.business_notification_preferences),private.get_business_notifications_snapshot_internal(uuid,integer,timestamptz),private.set_business_notification_state_internal(uuid,uuid,text,timestamptz),private.mark_all_business_notifications_read_internal(uuid),private.update_business_notification_preferences_internal(uuid,jsonb),private.update_business_notification_settings_internal(uuid,jsonb) from public,anon;
revoke all on function private.business_payment_notification_trigger(),private.business_team_notification_trigger() from public,anon,authenticated;
grant execute on function private.business_team_permission_catalog(),private.can_view_business_notifications(uuid),private.can_manage_business_notifications(uuid),private.business_notification_visible_to_current_user(uuid,uuid,text[],text[]),private.refresh_business_notifications_internal(uuid,timestamptz),private.business_notification_category_enabled(text,public.business_notification_preferences),private.get_business_notifications_snapshot_internal(uuid,integer,timestamptz),private.set_business_notification_state_internal(uuid,uuid,text,timestamptz),private.mark_all_business_notifications_read_internal(uuid),private.update_business_notification_preferences_internal(uuid,jsonb),private.update_business_notification_settings_internal(uuid,jsonb) to authenticated,service_role;
grant execute on function private.upsert_business_notification(uuid,text,text,text,text,text,text,text,text,uuid,uuid,text[],text[],jsonb,timestamptz,timestamptz,uuid) to service_role;

revoke all on function public.get_business_notifications_snapshot(uuid,integer),public.set_business_notification_state(uuid,uuid,text,timestamptz),public.mark_all_business_notifications_read(uuid),public.update_business_notification_preferences(uuid,jsonb),public.update_business_notification_settings(uuid,jsonb) from public,anon;
grant execute on function public.get_business_notifications_snapshot(uuid,integer),public.set_business_notification_state(uuid,uuid,text,timestamptz),public.mark_all_business_notifications_read(uuid),public.update_business_notification_preferences(uuid,jsonb),public.update_business_notification_settings(uuid,jsonb) to authenticated,service_role;

update public.businesses set module_config=module_config||'{"notifications":true}'::jsonb where status='active';

insert into public.business_notification_settings(business_id)
select id from public.businesses on conflict(business_id) do nothing;

DO $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='business_notifications') then
    alter publication supabase_realtime add table public.business_notifications;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='business_notification_states') then
    alter publication supabase_realtime add table public.business_notification_states;
  end if;
end $$;

commit;
