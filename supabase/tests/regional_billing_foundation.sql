-- Run only against a disposable local/test Supabase database after migrations.
-- The transaction rolls back every test identity and billing mutation.
begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_anonymous
)
values (
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'regional-billing-contract@example.invalid',
  'test-only',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  false
);

do $$
begin
  if (select count(*) from billing.plans where is_active) < 9 then
    raise exception 'Plan seed failure: expected Free plus eight paid interval plans.';
  end if;

  if (select count(*) from billing.regional_prices) <> 40 then
    raise exception 'Regional price seed failure: expected 40 tier-plan rows.';
  end if;

  if not exists (
    select 1
    from billing.plan_features
    where plan_family = 'student'
      and feature_key = 'ai_insights'
      and enabled
      and monthly_allowance = 25
  ) then
    raise exception 'Student entitlement seed failure.';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  result jsonb;
  snapshot jsonb;
  duplicate_rejected boolean := false;
begin
  result := public.claim_my_pro_trial();

  if result->>'planKey' <> 'pro'
     or result->>'status' <> 'trialing'
     or result->>'planCode' <> 'pro_month' then
    raise exception 'Trial claim contract failure.';
  end if;

  begin
    perform public.claim_my_pro_trial();
  exception when others then
    duplicate_rejected := true;
  end;

  if not duplicate_rejected then
    raise exception 'Trial replay failure: a second claim was accepted.';
  end if;

  snapshot := public.get_my_billing_snapshot();
  if snapshot->>'status' <> 'trialing'
     or snapshot->>'planCode' <> 'pro_month' then
    raise exception 'Authenticated billing snapshot did not reflect the trial.';
  end if;

  begin
    perform 1 from billing.regional_prices;
    raise exception 'Security failure: authenticated role read private regional prices.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;
rollback;
