revoke all on function public.get_dashboard_payload(date, date) from public;
revoke all on function public.get_dashboard_payload(date, date) from anon;
grant execute on function public.get_dashboard_payload(date, date) to authenticated;
