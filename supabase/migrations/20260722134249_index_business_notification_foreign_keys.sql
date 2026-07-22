create index business_notification_settings_updated_by_idx
  on public.business_notification_settings(updated_by)
  where updated_by is not null;

create index business_notification_states_notification_business_idx
  on public.business_notification_states(notification_id,business_id);

create index business_notification_states_user_business_idx
  on public.business_notification_states(user_id,business_id);

create index business_notifications_created_by_idx
  on public.business_notifications(created_by)
  where created_by is not null;
