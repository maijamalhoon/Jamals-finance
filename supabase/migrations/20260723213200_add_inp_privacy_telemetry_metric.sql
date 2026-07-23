begin;

alter table telemetry.events
  drop constraint if exists telemetry_events_metric_name_check;

alter table telemetry.events
  add constraint telemetry_events_metric_name_check check (
    metric_name is null or metric_name in (
      'TTFB',
      'FCP',
      'LCP',
      'CLS',
      'INP',
      'LOAD',
      'LONG_TASK'
    )
  );

commit;
