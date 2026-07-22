create or replace function private.mark_all_business_notifications_read_internal(p_business_id uuid)
returns integer language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare affected integer;
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then raise exception 'Business notification access required.' using errcode='42501'; end if;
  insert into public.business_notification_states(notification_id,business_id,user_id,read_at)
  select n.id,n.business_id,auth.uid(),now() from public.business_notifications n
  left join public.business_notification_states s on s.notification_id=n.id and s.user_id=auth.uid()
  where n.business_id=p_business_id and n.resolved_at is null and n.starts_at<=now() and (n.expires_at is null or n.expires_at>now())
    and s.dismissed_at is null and (s.snoozed_until is null or s.snoozed_until<=now())
    and private.business_notification_visible_to_current_user(n.business_id,n.target_user_id,n.audience_roles,n.audience_permissions)
  on conflict(notification_id,user_id) do update set read_at=now(),updated_at=now();
  get diagnostics affected=row_count;
  return affected;
end;
$$;

create or replace function private.update_business_notification_preferences_internal(p_business_id uuid,p_preferences jsonb)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare result public.business_notification_preferences; existing public.business_notification_preferences;
begin
  if auth.uid() is null or not private.can_view_business_notifications(p_business_id) then raise exception 'Business notification access required.' using errcode='42501'; end if;
  if p_preferences is null or jsonb_typeof(p_preferences)<>'object' then raise exception 'Preferences must be an object.' using errcode='22023'; end if;
  insert into public.business_notification_preferences(business_id,user_id) values(p_business_id,auth.uid()) on conflict(business_id,user_id) do nothing;
  select * into existing from public.business_notification_preferences where business_id=p_business_id and user_id=auth.uid() for update;
  update public.business_notification_preferences set
    in_app_enabled=coalesce((p_preferences->>'in_app_enabled')::boolean,existing.in_app_enabled),
    sales_alerts_enabled=coalesce((p_preferences->>'sales_alerts_enabled')::boolean,existing.sales_alerts_enabled),
    purchase_alerts_enabled=coalesce((p_preferences->>'purchase_alerts_enabled')::boolean,existing.purchase_alerts_enabled),
    inventory_alerts_enabled=coalesce((p_preferences->>'inventory_alerts_enabled')::boolean,existing.inventory_alerts_enabled),
    crm_alerts_enabled=coalesce((p_preferences->>'crm_alerts_enabled')::boolean,existing.crm_alerts_enabled),
    team_alerts_enabled=coalesce((p_preferences->>'team_alerts_enabled')::boolean,existing.team_alerts_enabled),
    accounting_alerts_enabled=coalesce((p_preferences->>'accounting_alerts_enabled')::boolean,existing.accounting_alerts_enabled),
    realtime_enabled=coalesce((p_preferences->>'realtime_enabled')::boolean,existing.realtime_enabled),
    updated_at=now()
  where business_id=p_business_id and user_id=auth.uid() returning * into result;
  return to_jsonb(result)-'created_at'-'updated_at';
end;
$$;

create or replace function private.update_business_notification_settings_internal(p_business_id uuid,p_settings jsonb)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public','private' as $$
declare result public.business_notification_settings; existing public.business_notification_settings;
begin
  if auth.uid() is null or not private.can_manage_business_notifications(p_business_id) then raise exception 'Notification management permission required.' using errcode='42501'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'Settings must be an object.' using errcode='22023'; end if;
  insert into public.business_notification_settings(business_id) values(p_business_id) on conflict(business_id) do nothing;
  select * into existing from public.business_notification_settings where business_id=p_business_id for update;
  update public.business_notification_settings set
    due_soon_days=coalesce((p_settings->>'due_soon_days')::smallint,existing.due_soon_days),
    fiscal_period_warning_days=coalesce((p_settings->>'fiscal_period_warning_days')::smallint,existing.fiscal_period_warning_days),
    receivable_alerts_enabled=coalesce((p_settings->>'receivable_alerts_enabled')::boolean,existing.receivable_alerts_enabled),
    payable_alerts_enabled=coalesce((p_settings->>'payable_alerts_enabled')::boolean,existing.payable_alerts_enabled),
    low_stock_alerts_enabled=coalesce((p_settings->>'low_stock_alerts_enabled')::boolean,existing.low_stock_alerts_enabled),
    crm_alerts_enabled=coalesce((p_settings->>'crm_alerts_enabled')::boolean,existing.crm_alerts_enabled),
    team_alerts_enabled=coalesce((p_settings->>'team_alerts_enabled')::boolean,existing.team_alerts_enabled),
    accounting_alerts_enabled=coalesce((p_settings->>'accounting_alerts_enabled')::boolean,existing.accounting_alerts_enabled),
    updated_by=auth.uid(),updated_at=now()
  where business_id=p_business_id returning * into result;
  perform private.refresh_business_notifications_internal(p_business_id,now());
  return to_jsonb(result)-'created_at'-'updated_at';
end;
$$;
