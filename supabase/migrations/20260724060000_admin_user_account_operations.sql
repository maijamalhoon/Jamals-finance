begin;

create or replace function private.platform_user_reference(p_user_id uuid)
returns text
language sql
immutable
strict
set search_path = pg_catalog, extensions
as $$
  select 'USR-' || upper(substr(
    encode(extensions.digest(convert_to(p_user_id::text, 'UTF8'), 'sha256'), 'hex'),
    1,
    12
  ));
$$;

revoke all on function private.platform_user_reference(uuid)
  from public, anon, authenticated;
grant execute on function private.platform_user_reference(uuid)
  to service_role;

create or replace function private.get_admin_user_operations_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, public, private, billing
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
begin
  select role into v_actor_role
  from private.platform_admins
  where user_id = v_actor and disabled_at is null;

  if v_actor is null or v_actor_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'operationsMode', 'read_only',
    'lookupKey', 'opaque_reference',
    'rawEmailReturned', false,
    'userIdReturned', false,
    'financeDataReturned', false,
    'providerIdentifiersReturned', false,
    'counts', jsonb_build_object(
      'totalUsers', (
        select count(*)::bigint
        from auth.users au
        where au.deleted_at is null
      ),
      'onboardingComplete', (
        select count(*)::bigint
        from auth.users au
        join public.profiles p on p.id = au.id
        where au.deleted_at is null
          and p.onboarding_completed is true
      ),
      'onboardingPending', (
        select count(*)::bigint
        from auth.users au
        left join public.profiles p on p.id = au.id
        where au.deleted_at is null
          and coalesce(p.onboarding_completed, false) is false
      ),
      'signedIn30d', (
        select count(*)::bigint
        from auth.users au
        where au.deleted_at is null
          and au.last_sign_in_at >= now() - interval '30 days'
      ),
      'inactive90d', (
        select count(*)::bigint
        from auth.users au
        where au.deleted_at is null
          and au.last_sign_in_at is not null
          and au.last_sign_in_at < now() - interval '90 days'
      ),
      'neverSignedIn', (
        select count(*)::bigint
        from auth.users au
        where au.deleted_at is null
          and au.last_sign_in_at is null
      ),
      'freeUsers', (
        select count(*)::bigint
        from auth.users au
        left join billing.subscriptions subscription
          on subscription.user_id = au.id
        where au.deleted_at is null
          and coalesce(subscription.status, 'free') = 'free'
      ),
      'trialingUsers', (
        select count(*)::bigint
        from billing.subscriptions subscription
        join auth.users au on au.id = subscription.user_id
        where au.deleted_at is null
          and subscription.status = 'trialing'
      ),
      'activePaidUsers', (
        select count(*)::bigint
        from billing.subscriptions subscription
        join billing.plans plan on plan.code = subscription.plan_code
        join auth.users au on au.id = subscription.user_id
        where au.deleted_at is null
          and subscription.status = 'active'
          and plan.plan_kind = 'paid'
      ),
      'pastDueUsers', (
        select count(*)::bigint
        from billing.subscriptions subscription
        join auth.users au on au.id = subscription.user_id
        where au.deleted_at is null
          and subscription.status = 'past_due'
      )
    ),
    'users', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userReference', private.platform_user_reference(rows.user_id),
          'maskedEmail', case
            when rows.email is null or trim(rows.email) = '' then 'u***@hidden.invalid'
            else private.mask_platform_admin_email(rows.email)
          end,
          'onboardingStatus', case
            when rows.onboarding_completed then 'complete'
            else 'pending'
          end,
          'activityState', case
            when rows.last_sign_in_at is null then 'never_signed_in'
            when rows.last_sign_in_at >= now() - interval '30 days' then 'active_30d'
            when rows.last_sign_in_at < now() - interval '90 days' then 'inactive_90d'
            else 'quiet_90d'
          end,
          'joinedAt', rows.joined_at,
          'lastSignInAt', rows.last_sign_in_at,
          'planCode', rows.plan_code,
          'planName', rows.plan_name,
          'planKind', rows.plan_kind,
          'subscriptionStatus', rows.subscription_status,
          'trialEndsAt', rows.trial_ends_at,
          'currentPeriodEnd', rows.current_period_end,
          'cancelAtPeriodEnd', rows.cancel_at_period_end
        ) order by rows.joined_at desc
      )
      from (
        select
          au.id as user_id,
          au.email,
          au.created_at as joined_at,
          au.last_sign_in_at,
          coalesce(profile.onboarding_completed, false) as onboarding_completed,
          coalesce(subscription.plan_code, 'free') as plan_code,
          coalesce(plan.name, 'Free') as plan_name,
          coalesce(plan.plan_kind, 'free') as plan_kind,
          coalesce(subscription.status, 'free') as subscription_status,
          subscription.trial_ends_at,
          subscription.current_period_end,
          coalesce(subscription.cancel_at_period_end, false) as cancel_at_period_end
        from auth.users au
        left join public.profiles profile on profile.id = au.id
        left join billing.subscriptions subscription
          on subscription.user_id = au.id
        left join billing.plans plan
          on plan.code = coalesce(subscription.plan_code, 'free')
        where au.deleted_at is null
        order by au.created_at desc
        limit 100
      ) rows
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.get_admin_user_operations_snapshot()
  from public, anon;
grant execute on function private.get_admin_user_operations_snapshot()
  to authenticated;

create or replace function public.get_platform_admin_snapshot()
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_platform_admin_snapshot()
    || jsonb_build_object('access', private.get_admin_access_snapshot())
    || jsonb_build_object(
      'userOperations',
      private.get_admin_user_operations_snapshot()
    );
$$;

revoke all on function public.get_platform_admin_snapshot()
  from public, anon;
grant execute on function public.get_platform_admin_snapshot()
  to authenticated;

comment on function private.get_admin_user_operations_snapshot() is
  'Private aggregate account directory for the Admin Panel. Returns masked emails, opaque user references, onboarding and subscription state only; no user UUIDs, provider references, finance records, balances or transactions.';

commit;
