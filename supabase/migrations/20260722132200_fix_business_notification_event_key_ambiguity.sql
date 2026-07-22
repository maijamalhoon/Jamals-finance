do $$
declare definition text;
begin
  select pg_get_functiondef(p.oid) into definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='refresh_business_notifications_internal' limit 1;
  if position('and not (event_key=any(active_keys));' in definition)=0 then
    raise exception 'Notification event-key patch target not found.';
  end if;
  execute replace(
    definition,
    'and not (event_key=any(active_keys));',
    'and not (business_notifications.event_key=any(active_keys));'
  );
end $$;
