begin;

create index if not exists billing_subscriptions_plan_code_idx
  on billing.subscriptions (plan_code);

create index if not exists admin_access_log_admin_user_idx
  on private.admin_access_log (admin_user_id, created_at desc);

create index if not exists platform_admins_created_by_idx
  on private.platform_admins (created_by)
  where created_by is not null;

commit;
