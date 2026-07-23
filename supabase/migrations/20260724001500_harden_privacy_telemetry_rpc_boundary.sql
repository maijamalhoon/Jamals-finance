begin;

do $$
begin
  if to_regprocedure(
    'telemetry.record_privacy_telemetry_event_impl(uuid,text,text,text,text,text,text,double precision,text,text,text,text,text,text,text,text,text)'
  ) is null then
    alter function public.record_privacy_telemetry_event(
      uuid, text, text, text, text, text, text, double precision,
      text, text, text, text, text, text, text, text, text
    ) set schema telemetry;

    alter function telemetry.record_privacy_telemetry_event(
      uuid, text, text, text, text, text, text, double precision,
      text, text, text, text, text, text, text, text, text
    ) rename to record_privacy_telemetry_event_impl;
  end if;
end;
$$;

alter function telemetry.record_privacy_telemetry_event_impl(
  uuid, text, text, text, text, text, text, double precision,
  text, text, text, text, text, text, text, text, text
) set search_path = pg_catalog, auth, telemetry;

revoke all on function telemetry.record_privacy_telemetry_event_impl(
  uuid, text, text, text, text, text, text, double precision,
  text, text, text, text, text, text, text, text, text
) from public, anon;

grant usage on schema telemetry to authenticated;
grant execute on function telemetry.record_privacy_telemetry_event_impl(
  uuid, text, text, text, text, text, text, double precision,
  text, text, text, text, text, text, text, text, text
) to authenticated;

create or replace function public.record_privacy_telemetry_event(
  p_session_id uuid,
  p_event_name text,
  p_route text,
  p_feature text default null,
  p_result text default null,
  p_navigation_type text default null,
  p_metric_name text default null,
  p_metric_value double precision default null,
  p_metric_rating text default null,
  p_country_code text default null,
  p_region_code text default null,
  p_city text default null,
  p_device_type text default 'unknown',
  p_os_family text default 'Other',
  p_browser_family text default 'Other',
  p_request_id text default null,
  p_app_version text default null
)
returns void
language sql
security invoker
set search_path = pg_catalog, telemetry
as $$
  select telemetry.record_privacy_telemetry_event_impl(
    p_session_id,
    p_event_name,
    p_route,
    p_feature,
    p_result,
    p_navigation_type,
    p_metric_name,
    p_metric_value,
    p_metric_rating,
    p_country_code,
    p_region_code,
    p_city,
    p_device_type,
    p_os_family,
    p_browser_family,
    p_request_id,
    p_app_version
  );
$$;

revoke all on function public.record_privacy_telemetry_event(
  uuid, text, text, text, text, text, text, double precision,
  text, text, text, text, text, text, text, text, text
) from public, anon;

grant execute on function public.record_privacy_telemetry_event(
  uuid, text, text, text, text, text, text, double precision,
  text, text, text, text, text, text, text, text, text
) to authenticated;

drop policy if exists telemetry_subjects_deny_direct_access
  on telemetry.subjects;
create policy telemetry_subjects_deny_direct_access
  on telemetry.subjects
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists telemetry_events_deny_direct_access
  on telemetry.events;
create policy telemetry_events_deny_direct_access
  on telemetry.events
  for all
  to anon, authenticated
  using (false)
  with check (false);

commit;
