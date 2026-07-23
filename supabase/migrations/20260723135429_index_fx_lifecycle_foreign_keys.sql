create index if not exists business_fx_settings_updated_by_idx on public.business_fx_settings(updated_by);
create index if not exists business_fx_runs_created_by_idx on public.business_fx_revaluation_runs(created_by);
create index if not exists business_fx_runs_posted_by_idx on public.business_fx_revaluation_runs(posted_by);
create index if not exists business_fx_runs_reversed_by_idx on public.business_fx_revaluation_runs(reversed_by);
create index if not exists business_fx_runs_cancelled_by_idx on public.business_fx_revaluation_runs(cancelled_by);
