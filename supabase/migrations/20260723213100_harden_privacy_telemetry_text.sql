begin;

alter table telemetry.events
  add constraint telemetry_events_route_no_control_characters_check
  check (route !~ '[[:cntrl:]]');

alter table telemetry.events
  add constraint telemetry_events_city_no_control_characters_check
  check (city is null or city !~ '[[:cntrl:]]');

commit;
