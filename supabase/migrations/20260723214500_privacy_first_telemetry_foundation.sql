create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null,
  event_name text not null,
  route text,
  feature_name text,
  result text,
  duration_ms integer,
  metric_name text,
  metric_value double precision,
  error_code text,
  country_code text,
  region_code text,
  city text,
  device_type text,
  os_family text,
  browser_family text,
  app_version text,
  created_at timestamptz not null default now(),
  constraint telemetry_events_subject_id_format
    check (subject_id ~ '^[a-f0-9]{64}$'),
  constraint telemetry_events_event_name_allowed
    check (event_name in (
      'page_viewed',
      'web_vital',
      'feature_used',
      'operation_completed',
      'operation_failed',
      'client_error'
    )),
  constraint telemetry_events_route_safe
    check (
      route is null or (
        char_length(route) between 1 and 180
        and route like '/%'
        and position('?' in route) = 0
        and position('#' in route) = 0
      )
    ),
  constraint telemetry_events_feature_name_safe
    check (feature_name is null or feature_name ~ '^[a-z0-9_]{1,64}$'),
  constraint telemetry_events_result_allowed
    check (result is null or result in ('success', 'failure', 'cancelled')),
  constraint telemetry_events_duration_safe
    check (duration_ms is null or duration_ms between 0 and 120000),
  constraint telemetry_events_metric_name_allowed
    check (metric_name is null or metric_name in ('ttfb', 'fcp', 'lcp', 'cls', 'inp')),
  constraint telemetry_events_metric_pair
    check ((metric_name is null) = (metric_value is null)),
  constraint telemetry_events_error_code_safe
    check (error_code is null or error_code ~ '^[A-Z0-9_]{1,64}$'),
  constraint telemetry_events_country_code_safe
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint telemetry_events_region_code_safe
    check (region_code is null or region_code ~ '^[A-Za-z0-9-]{1,8}$'),
  constraint telemetry_events_city_safe
    check (city is null or char_length(city) between 1 and 80),
  constraint telemetry_events_device_type_allowed
    check (device_type is null or device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  constraint telemetry_events_os_family_safe
    check (os_family is null or os_family in ('Android', 'iOS', 'Windows', 'macOS', 'Linux', 'ChromeOS', 'Other')),
  constraint telemetry_events_browser_family_safe
    check (browser_family is null or browser_family in ('Chrome', 'Safari', 'Firefox', 'Edge', 'Samsung Internet', 'Other')),
  constraint telemetry_events_app_version_safe
    check (app_version is null or app_version ~ '^[A-Za-z0-9._-]{1,64}$')
);

alter table private.telemetry_events enable row level security;

create index if not exists telemetry_events_created_at_idx
  on private.telemetry_events (created_at desc);
create index if not exists telemetry_events_subject_created_idx
  on private.telemetry_events (subject_id, created_at desc);
create index if not exists telemetry_events_event_created_idx
  on private.telemetry_events (event_name, created_at desc);

create or replace function private.telemetry_subject_id()
returns text
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select case
    when auth.uid() is null then null
    else encode(
      extensions.digest(
        convert_to('jalvoro-telemetry-v1:' || auth.uid()::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  end;
$$;

create or replace function private.record_telemetry_event_impl(
  p_event_name text,
  p_route text default null,
  p_feature_name text default null,
  p_result text default null,
  p_duration_ms integer default null,
  p_metric_name text default null,
  p_metric_value double precision default null,
  p_error_code text default null,
  p_country_code text default null,
  p_region_code text default null,
  p_city text default null,
  p_device_type text default null,
  p_os_family text default null,
  p_browser_family text default null,
  p_app_version text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_subject_id text;
  v_recent_count integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_subject_id := private.telemetry_subject_id();
  if v_subject_id is null then
    return false;
  end if;

  select count(*)
  into v_recent_count
  from (
    select 1
    from private.telemetry_events
    where subject_id = v_subject_id
      and created_at >= now() - interval '1 minute'
    limit 121
  ) recent_events;

  if v_recent_count >= 120 then
    return false;
  end if;

  insert into private.telemetry_events (
    subject_id,
    event_name,
    route,
    feature_name,
    result,
    duration_ms,
    metric_name,
    metric_value,
    error_code,
    country_code,
    region_code,
    city,
    device_type,
    os_family,
    browser_family,
    app_version
  )
  values (
    v_subject_id,
    p_event_name,
    p_route,
    p_feature_name,
    p_result,
    p_duration_ms,
    p_metric_name,
    p_metric_value,
    p_error_code,
    p_country_code,
    p_region_code,
    p_city,
    p_device_type,
    p_os_family,
    p_browser_family,
    p_app_version
  );

  return true;
exception
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    return false;
end;
$$;

create or replace function public.record_telemetry_event(
  p_event_name text,
  p_route text default null,
  p_feature_name text default null,
  p_result text default null,
  p_duration_ms integer default null,
  p_metric_name text default null,
  p_metric_value double precision default null,
  p_error_code text default null,
  p_country_code text default null,
  p_region_code text default null,
  p_city text default null,
  p_device_type text default null,
  p_os_family text default null,
  p_browser_family text default null,
  p_app_version text default null
)
returns boolean
language sql
security invoker
set search_path = pg_catalog
as $$
  select private.record_telemetry_event_impl(
    p_event_name,
    p_route,
    p_feature_name,
    p_result,
    p_duration_ms,
    p_metric_name,
    p_metric_value,
    p_error_code,
    p_country_code,
    p_region_code,
    p_city,
    p_device_type,
    p_os_family,
    p_browser_family,
    p_app_version
  );
$$;

revoke all on private.telemetry_events from public, anon, authenticated;
grant select, insert, delete on private.telemetry_events to service_role;

revoke execute on function private.telemetry_subject_id() from public, anon;
revoke execute on function private.record_telemetry_event_impl(
  text, text, text, text, integer, text, double precision, text,
  text, text, text, text, text, text, text
) from public, anon;
revoke execute on function public.record_telemetry_event(
  text, text, text, text, integer, text, double precision, text,
  text, text, text, text, text, text, text
) from public, anon;

grant usage on schema private to authenticated, service_role;
grant execute on function private.telemetry_subject_id() to authenticated, service_role;
grant execute on function private.record_telemetry_event_impl(
  text, text, text, text, integer, text, double precision, text,
  text, text, text, text, text, text, text
) to authenticated, service_role;
grant execute on function public.record_telemetry_event(
  text, text, text, text, integer, text, double precision, text,
  text, text, text, text, text, text, text
) to authenticated, service_role;

comment on table private.telemetry_events is
  'Privacy-first product telemetry. Stores pseudonymous technical events only; no raw IP, email, finance values, free text, or session replay data.';
