create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'paddle'
    check (provider in ('paddle', 'stripe', 'internal')),
  provider_customer_id text,
  billing_country char(2),
  trial_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null
    check (provider in ('paddle', 'stripe', 'internal')),
  provider_subscription_id text not null,
  provider_price_id text,
  plan_key text not null
    check (plan_key in ('free', 'go', 'student', 'plus', 'pro')),
  billing_cycle text
    check (billing_cycle is null or billing_cycle in ('monthly', 'annual')),
  status text not null
    check (status in ('free', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
  pricing_tier char(1)
    check (pricing_tier is null or pricing_tier in ('A', 'B', 'C', 'D', 'E')),
  billing_country char(2),
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);
create index if not exists billing_subscriptions_access_lookup_idx
  on public.billing_subscriptions (user_id, status, current_period_ends_at desc);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paddle', 'stripe')),
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'failed', 'ignored')),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_webhook_events_pending_idx
  on public.billing_webhook_events (created_at)
  where processing_status = 'pending';

create table if not exists public.billing_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  period_starts_at timestamptz not null,
  period_ends_at timestamptz not null,
  used_quantity integer not null default 0 check (used_quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_key, period_starts_at),
  check (period_ends_at > period_starts_at)
);

create table if not exists public.student_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'expired')),
  verification_provider text,
  verified_at timestamptz,
  expires_at timestamptz,
  evidence_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or verified_at is null or expires_at > verified_at)
);

alter table public.billing_profiles enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_usage enable row level security;
alter table public.student_verifications enable row level security;

drop policy if exists billing_profiles_owner_select on public.billing_profiles;
create policy billing_profiles_owner_select
  on public.billing_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists billing_subscriptions_owner_select on public.billing_subscriptions;
create policy billing_subscriptions_owner_select
  on public.billing_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists billing_usage_owner_select on public.billing_usage;
create policy billing_usage_owner_select
  on public.billing_usage for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists student_verifications_owner_select on public.student_verifications;
create policy student_verifications_owner_select
  on public.student_verifications for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.billing_profiles from anon, authenticated;
revoke all on public.billing_subscriptions from anon, authenticated;
revoke all on public.billing_webhook_events from anon, authenticated;
revoke all on public.billing_usage from anon, authenticated;
revoke all on public.student_verifications from anon, authenticated;

grant select on public.billing_profiles to authenticated;
grant select on public.billing_subscriptions to authenticated;
grant select on public.billing_usage to authenticated;
grant select on public.student_verifications to authenticated;

drop trigger if exists touch_billing_profiles_updated_at on public.billing_profiles;
create trigger touch_billing_profiles_updated_at
before update on public.billing_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_billing_subscriptions_updated_at on public.billing_subscriptions;
create trigger touch_billing_subscriptions_updated_at
before update on public.billing_subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists touch_billing_usage_updated_at on public.billing_usage;
create trigger touch_billing_usage_updated_at
before update on public.billing_usage
for each row execute function public.touch_updated_at();

drop trigger if exists touch_student_verifications_updated_at on public.student_verifications;
create trigger touch_student_verifications_updated_at
before update on public.student_verifications
for each row execute function public.touch_updated_at();

create or replace function public.claim_pro_trial(target_user_id uuid)
returns public.billing_subscriptions
language plpgsql
security invoker
set search_path = public
as $$
declare
  claimed_subscription public.billing_subscriptions;
begin
  if target_user_id is null then
    raise exception 'missing_user_id';
  end if;

  if exists (
    select 1
    from public.billing_subscriptions
    where user_id = target_user_id
      and status in ('trialing', 'active', 'past_due', 'paused')
      and coalesce(current_period_ends_at, trial_ends_at, now() + interval '1 day') > now()
  ) then
    raise exception 'subscription_already_active';
  end if;

  insert into public.billing_profiles (
    user_id,
    provider,
    trial_started_at
  ) values (
    target_user_id,
    'internal',
    now()
  )
  on conflict (user_id) do update
    set trial_started_at = excluded.trial_started_at,
        updated_at = now()
    where public.billing_profiles.trial_started_at is null;

  if not found then
    raise exception 'trial_already_used';
  end if;

  insert into public.billing_subscriptions (
    user_id,
    provider,
    provider_subscription_id,
    plan_key,
    status,
    trial_ends_at,
    current_period_starts_at,
    current_period_ends_at
  ) values (
    target_user_id,
    'internal',
    'trial:' || target_user_id::text,
    'pro',
    'trialing',
    now() + interval '14 days',
    now(),
    now() + interval '14 days'
  )
  returning * into claimed_subscription;

  return claimed_subscription;
end;
$$;

revoke all on function public.claim_pro_trial(uuid) from public, anon, authenticated;
grant execute on function public.claim_pro_trial(uuid) to service_role;

comment on table public.billing_profiles is
  'Server-managed billing customer metadata and one-time trial claim state.';
comment on table public.billing_subscriptions is
  'Provider-neutral subscription snapshots used for server-side feature access decisions.';
comment on table public.billing_webhook_events is
  'Immutable provider event inbox with unique IDs for webhook idempotency.';
comment on table public.student_verifications is
  'Minimal student eligibility result; evidence should be deleted after verification.';
