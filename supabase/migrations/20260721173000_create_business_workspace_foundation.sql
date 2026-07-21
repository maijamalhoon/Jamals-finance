create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  business_type text not null,
  description text,
  country_code text,
  base_currency text not null default 'PKR',
  timezone text not null default 'UTC',
  fiscal_year_start_month smallint not null default 1,
  module_config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_length_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint businesses_slug_format_check
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint businesses_type_check
    check (
      business_type in (
        'retail',
        'wholesale',
        'services',
        'manufacturing',
        'restaurant',
        'ecommerce',
        'construction',
        'professional_services',
        'other'
      )
    ),
  constraint businesses_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint businesses_base_currency_check
    check (public.is_supported_financial_currency(base_currency)),
  constraint businesses_timezone_length_check
    check (char_length(btrim(timezone)) between 1 and 80),
  constraint businesses_fiscal_year_start_month_check
    check (fiscal_year_start_month between 1 and 12),
  constraint businesses_module_config_check
    check (jsonb_typeof(module_config) = 'object'),
  constraint businesses_status_check
    check (status in ('active', 'suspended', 'archived'))
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  permissions text[] not null default '{}'::text[],
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id),
  constraint business_members_role_check
    check (
      role in (
        'owner',
        'admin',
        'accountant',
        'manager',
        'sales',
        'cashier',
        'inventory',
        'viewer'
      )
    ),
  constraint business_members_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked'))
);

create table if not exists public.business_workspace_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_workspace text not null default 'personal',
  active_business_id uuid references public.businesses(id) on delete set null,
  onboarding_choice text not null default 'undecided',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_workspace_preferences_default_check
    check (default_workspace in ('personal', 'business')),
  constraint business_workspace_preferences_choice_check
    check (onboarding_choice in ('undecided', 'personal', 'business'))
);

create index if not exists businesses_owner_user_id_idx
  on public.businesses(owner_user_id);

create index if not exists business_members_user_active_idx
  on public.business_members(user_id, business_id)
  where status = 'active';

create index if not exists business_members_business_active_idx
  on public.business_members(business_id, user_id)
  where status = 'active';

create index if not exists business_workspace_preferences_active_business_idx
  on public.business_workspace_preferences(active_business_id)
  where active_business_id is not null;

create or replace function private.set_business_workspace_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_business_workspace_updated_at()
  from public, anon, authenticated;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function private.set_business_workspace_updated_at();

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at
before update on public.business_members
for each row execute function private.set_business_workspace_updated_at();

drop trigger if exists business_workspace_preferences_set_updated_at
  on public.business_workspace_preferences;
create trigger business_workspace_preferences_set_updated_at
before update on public.business_workspace_preferences
for each row execute function private.set_business_workspace_updated_at();

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_workspace_preferences enable row level security;

revoke all privileges on table
  public.businesses,
  public.business_members,
  public.business_workspace_preferences
from anon, authenticated;

grant select, update on table public.businesses to authenticated;
grant select on table public.business_members to authenticated;
grant select, insert, update on table public.business_workspace_preferences
  to authenticated;

grant select, insert, update, delete on table
  public.businesses,
  public.business_members,
  public.business_workspace_preferences
  to service_role;

drop policy if exists businesses_select_active_member on public.businesses;
create policy businesses_select_active_member
on public.businesses
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1
    from public.business_members membership
    where membership.business_id = businesses.id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner
on public.businesses
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists business_members_select_self on public.business_members;
create policy business_members_select_self
on public.business_members
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists business_workspace_preferences_select_own
  on public.business_workspace_preferences;
create policy business_workspace_preferences_select_own
on public.business_workspace_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists business_workspace_preferences_insert_own
  on public.business_workspace_preferences;
create policy business_workspace_preferences_insert_own
on public.business_workspace_preferences
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    active_business_id is null
    or exists (
      select 1
      from public.business_members membership
      where membership.business_id = active_business_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  )
);

drop policy if exists business_workspace_preferences_update_own
  on public.business_workspace_preferences;
create policy business_workspace_preferences_update_own
on public.business_workspace_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    active_business_id is null
    or exists (
      select 1
      from public.business_members membership
      where membership.business_id = active_business_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  )
);

create or replace function public.create_business_workspace(
  p_name text,
  p_business_type text,
  p_country_code text default null,
  p_base_currency text default 'PKR',
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_name text := btrim(coalesce(p_name, ''));
  normalized_type text := lower(btrim(coalesce(p_business_type, '')));
  normalized_country text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  normalized_currency text := upper(btrim(coalesce(p_base_currency, 'PKR')));
  normalized_timezone text := btrim(coalesce(p_timezone, 'UTC'));
  base_slug text;
  generated_slug text;
  created_business_id uuid;
  modules jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception 'Business name must contain 2 to 120 characters.'
      using errcode = '22023';
  end if;

  if normalized_type not in (
    'retail',
    'wholesale',
    'services',
    'manufacturing',
    'restaurant',
    'ecommerce',
    'construction',
    'professional_services',
    'other'
  ) then
    raise exception 'Unsupported business type.' using errcode = '22023';
  end if;

  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must use two ISO letters.' using errcode = '22023';
  end if;

  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported base currency.' using errcode = '22023';
  end if;

  if normalized_timezone = ''
    or not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = normalized_timezone
    )
  then
    raise exception 'Unsupported timezone.' using errcode = '22023';
  end if;

  base_slug := btrim(
    regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if base_slug = '' then
    base_slug := 'business';
  end if;

  generated_slug := base_slug || '-' || substr(
    replace(gen_random_uuid()::text, '-', ''),
    1,
    8
  );

  modules := jsonb_build_object(
    'accounting', true,
    'contacts', true,
    'sales', true,
    'purchases', normalized_type in (
      'retail',
      'wholesale',
      'manufacturing',
      'restaurant',
      'ecommerce',
      'construction'
    ),
    'inventory', normalized_type in (
      'retail',
      'wholesale',
      'manufacturing',
      'restaurant',
      'ecommerce'
    ),
    'crm', normalized_type in (
      'services',
      'construction',
      'professional_services',
      'other'
    ),
    'reports', true
  );

  insert into public.businesses (
    owner_user_id,
    name,
    slug,
    business_type,
    country_code,
    base_currency,
    timezone,
    module_config
  )
  values (
    current_user_id,
    clean_name,
    generated_slug,
    normalized_type,
    normalized_country,
    normalized_currency,
    normalized_timezone,
    modules
  )
  returning id into created_business_id;

  insert into public.business_members (
    business_id,
    user_id,
    role,
    status,
    permissions,
    invited_by,
    joined_at
  )
  values (
    created_business_id,
    current_user_id,
    'owner',
    'active',
    array['*']::text[],
    current_user_id,
    now()
  );

  insert into public.business_workspace_preferences (
    user_id,
    default_workspace,
    active_business_id,
    onboarding_choice
  )
  values (
    current_user_id,
    'business',
    created_business_id,
    'business'
  )
  on conflict (user_id) do update
  set default_workspace = excluded.default_workspace,
      active_business_id = excluded.active_business_id,
      onboarding_choice = excluded.onboarding_choice,
      updated_at = now();

  return created_business_id;
end;
$$;

revoke execute on function public.create_business_workspace(text, text, text, text, text)
  from public, anon;
grant execute on function public.create_business_workspace(text, text, text, text, text)
  to authenticated, service_role;

comment on table public.businesses is
  'Tenant root for the business ERP workspace. Personal finance tables remain separate.';
comment on table public.business_members is
  'Authenticated user membership and role inside one business tenant.';
comment on table public.business_workspace_preferences is
  'Per-user personal/business onboarding choice and active business selection.';
comment on function public.create_business_workspace(text, text, text, text, text) is
  'Atomically creates a business tenant, its owner membership, and active workspace preference.';
