begin;

create index if not exists privacy_retention_runs_actor_admin_idx
  on private.privacy_retention_runs (actor_admin_user_id)
  where actor_admin_user_id is not null;

commit;
