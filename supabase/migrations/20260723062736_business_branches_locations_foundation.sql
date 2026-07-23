-- Tenant-scoped business branches and member location access.
-- Existing members retain all-branch access by default; operational tables remain unchanged.

create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
select array[
  'team.view','team.manage','notifications.view','notifications.manage',
  'accounting.view','accounting.manage','banking.view','banking.manage','tax.view','tax.manage',
  'budget.view','budget.manage','budget.approve','documents.view','documents.manage',
  'branches.view','branches.manage',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

alter table public.business_members
  add column if not exists branch_access_mode text not null default 'all';

alter table public.business_members
  drop constraint if exists business_members_branch_access_mode_check;
alter table public.business_members
  add constraint business_members_branch_access_mode_check
  check (branch_access_mode in ('all','selected'));

create or replace function private.can_view_business_branches(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id = membership.business_id
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and business.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager','sales','cashier','inventory','viewer')
      or '*' = any(membership.permissions)
      or 'branches.view' = any(membership.permissions)
      or 'branches.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_manage_business_branches(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id = membership.business_id
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and business.status = 'active'
    and (
      membership.role in ('owner','admin')
      or '*' = any(membership.permissions)
      or 'branches.manage' = any(membership.permissions)
    )
);
$$;

create table public.business_branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  branch_type text not null default 'branch',
  status text not null default 'active',
  is_primary boolean not null default false,
  country_code text,
  city text,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  timezone text not null,
  phone text,
  email text,
  manager_user_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_branches_business_id_id_key unique (business_id, id),
  constraint business_branches_manager_fkey foreign key (business_id, manager_user_id)
    references public.business_members(business_id, user_id) on delete restrict,
  constraint business_branches_code_check check (code ~ '^[A-Z0-9][A-Z0-9-]{1,19}$'),
  constraint business_branches_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint business_branches_type_check check (branch_type in ('head_office','branch','store','office','site')),
  constraint business_branches_status_check check (status in ('active','inactive')),
  constraint business_branches_primary_check check (not is_primary or status = 'active'),
  constraint business_branches_country_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint business_branches_city_check check (city is null or char_length(btrim(city)) between 1 and 100),
  constraint business_branches_address_one_check check (address_line_1 is null or char_length(btrim(address_line_1)) <= 180),
  constraint business_branches_address_two_check check (address_line_2 is null or char_length(btrim(address_line_2)) <= 180),
  constraint business_branches_postal_check check (postal_code is null or char_length(btrim(postal_code)) <= 24),
  constraint business_branches_timezone_check check (char_length(btrim(timezone)) between 1 and 80),
  constraint business_branches_phone_check check (phone is null or char_length(btrim(phone)) between 3 and 40),
  constraint business_branches_email_check check (email is null or char_length(btrim(email)) between 3 and 254)
);

create unique index business_branches_code_uidx
  on public.business_branches(business_id, lower(code));
create unique index business_branches_primary_uidx
  on public.business_branches(business_id)
  where is_primary;
create index business_branches_business_status_idx
  on public.business_branches(business_id, status, name);
create index business_branches_manager_idx
  on public.business_branches(business_id, manager_user_id)
  where manager_user_id is not null;
create index business_branches_created_by_idx
  on public.business_branches(created_by)
  where created_by is not null;
create index business_branches_updated_by_idx
  on public.business_branches(updated_by)
  where updated_by is not null;

create table public.business_member_branch_access (
  business_id uuid not null,
  branch_id uuid not null,
  user_id uuid not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (business_id, branch_id, user_id),
  constraint business_member_branch_access_branch_fkey foreign key (business_id, branch_id)
    references public.business_branches(business_id, id) on delete cascade,
  constraint business_member_branch_access_member_fkey foreign key (business_id, user_id)
    references public.business_members(business_id, user_id) on delete cascade
);

create index business_member_branch_access_user_idx
  on public.business_member_branch_access(business_id, user_id, branch_id);
create index business_member_branch_access_granted_by_idx
  on public.business_member_branch_access(granted_by)
  where granted_by is not null;

create table public.business_branch_audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint business_branch_audit_branch_fkey foreign key (business_id, branch_id)
    references public.business_branches(business_id, id) on delete cascade,
  constraint business_branch_audit_action_check check (action in (
    'bootstrap','created','updated','primary_changed','status_changed',
    'access_mode_changed','access_assigned','access_cleared'
  )),
  constraint business_branch_audit_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index business_branch_audit_business_idx
  on public.business_branch_audit_log(business_id, created_at desc, id desc);
create index business_branch_audit_branch_idx
  on public.business_branch_audit_log(business_id, branch_id, created_at desc)
  where branch_id is not null;
create index business_branch_audit_actor_idx
  on public.business_branch_audit_log(actor_user_id)
  where actor_user_id is not null;
create index business_branch_audit_target_idx
  on public.business_branch_audit_log(target_user_id)
  where target_user_id is not null;

create or replace function private.has_business_branch_access(
  p_business_id uuid,
  p_branch_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select p_user_id is not null and exists(
  select 1
  from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = p_user_id
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin')
      or '*' = any(membership.permissions)
      or membership.branch_access_mode = 'all'
      or exists(
        select 1
        from public.business_member_branch_access access
        where access.business_id = p_business_id
          and access.branch_id = p_branch_id
          and access.user_id = p_user_id
      )
    )
);
$$;

create or replace function private.enforce_business_branch_engine_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  action_name text := coalesce(current_setting('app.business_branch_action', true), '');
begin
  if current_user <> 'postgres' then
    raise exception 'Business branch records are managed by the branches engine.' using errcode = '55000';
  end if;
  if tg_table_name = 'business_branches' and action_name not in ('branch_write','bootstrap') then
    raise exception 'Unsupported branch write.' using errcode = '55000';
  elsif tg_table_name = 'business_member_branch_access' and action_name <> 'access_write' then
    raise exception 'Unsupported branch access write.' using errcode = '55000';
  elsif tg_table_name = 'business_branch_audit_log' and action_name <> 'audit' then
    raise exception 'Unsupported branch audit write.' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger business_branches_engine_guard
before insert or update or delete on public.business_branches
for each row execute function private.enforce_business_branch_engine_write();
create trigger business_member_branch_access_engine_guard
before insert or update or delete on public.business_member_branch_access
for each row execute function private.enforce_business_branch_engine_write();
create trigger business_branch_audit_engine_guard
before insert or update or delete on public.business_branch_audit_log
for each row execute function private.enforce_business_branch_engine_write();
create trigger business_branches_touch_updated_at
before update on public.business_branches
for each row execute function private.set_business_workspace_updated_at();

alter table public.business_branches enable row level security;
alter table public.business_member_branch_access enable row level security;
alter table public.business_branch_audit_log enable row level security;

create policy business_branches_select
on public.business_branches
for select
to authenticated
using (
  private.can_view_business_branches(business_id)
  and (
    private.can_manage_business_branches(business_id)
    or private.has_business_branch_access(business_id, id, auth.uid())
  )
);

create policy business_member_branch_access_select
on public.business_member_branch_access
for select
to authenticated
using (
  private.can_manage_business_branches(business_id)
  or user_id = auth.uid()
);

create policy business_branch_audit_select
on public.business_branch_audit_log
for select
to authenticated
using (private.can_manage_business_branches(business_id));

revoke all on public.business_branches, public.business_member_branch_access, public.business_branch_audit_log
from public, anon, authenticated;
grant select on public.business_branches, public.business_member_branch_access, public.business_branch_audit_log
to authenticated;

create or replace function private.write_business_branch_audit(
  p_business_id uuid,
  p_branch_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('app.business_branch_action', 'audit', true);
  insert into public.business_branch_audit_log(
    business_id, branch_id, actor_user_id, target_user_id, action, metadata
  ) values (
    p_business_id, p_branch_id, auth.uid(), p_target_user_id, p_action, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function private.create_business_branch_internal(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_branch_type text default 'branch',
  p_is_primary boolean default false,
  p_country_code text default null,
  p_city text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_postal_code text default null,
  p_timezone text default null,
  p_phone text default null,
  p_email text default null,
  p_manager_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  business_row public.businesses%rowtype;
  branch_id uuid;
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_code text := upper(btrim(coalesce(p_code, '')));
  normalized_type text := lower(btrim(coalesce(p_branch_type, 'branch')));
  normalized_country text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  normalized_timezone text;
  make_primary boolean;
begin
  if user_id is null or not private.can_manage_business_branches(p_business_id) then
    raise exception 'Branch management permission required.' using errcode = '42501';
  end if;

  select * into business_row from public.businesses where id = p_business_id and status = 'active' for update;
  if not found then raise exception 'Business not found.' using errcode = 'P0002'; end if;

  normalized_timezone := coalesce(nullif(btrim(coalesce(p_timezone, '')), ''), business_row.timezone);
  if char_length(normalized_name) not between 2 and 120 then raise exception 'Branch name must contain 2 to 120 characters.' using errcode = '22023'; end if;
  if normalized_code !~ '^[A-Z0-9][A-Z0-9-]{1,19}$' then raise exception 'Branch code must contain 2 to 20 letters, numbers, or hyphens.' using errcode = '22023'; end if;
  if normalized_type not in ('head_office','branch','store','office','site') then raise exception 'Unsupported branch type.' using errcode = '22023'; end if;
  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then raise exception 'Country code must contain two letters.' using errcode = '22023'; end if;
  if p_manager_user_id is not null and not exists(
    select 1 from public.business_members membership
    where membership.business_id = p_business_id and membership.user_id = p_manager_user_id and membership.status = 'active'
  ) then raise exception 'Branch manager must be an active business member.' using errcode = '22023'; end if;

  make_primary := coalesce(p_is_primary, false) or not exists(
    select 1 from public.business_branches branch where branch.business_id = p_business_id
  );

  perform set_config('app.business_branch_action', 'branch_write', true);
  if make_primary then
    update public.business_branches branch
    set is_primary = false, updated_by = user_id
    where branch.business_id = p_business_id and branch.is_primary;
  end if;

  insert into public.business_branches(
    business_id, code, name, branch_type, status, is_primary,
    country_code, city, address_line_1, address_line_2, postal_code,
    timezone, phone, email, manager_user_id, created_by, updated_by
  ) values (
    p_business_id, normalized_code, normalized_name, normalized_type, 'active', make_primary,
    normalized_country, nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_address_line_1, '')), ''), nullif(btrim(coalesce(p_address_line_2, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''), normalized_timezone,
    nullif(btrim(coalesce(p_phone, '')), ''), nullif(lower(btrim(coalesce(p_email, ''))), ''),
    p_manager_user_id, user_id, user_id
  ) returning id into branch_id;

  perform private.write_business_branch_audit(
    p_business_id, branch_id, p_manager_user_id, 'created',
    jsonb_build_object('code', normalized_code, 'name', normalized_name, 'is_primary', make_primary)
  );

  return jsonb_build_object('branch_id', branch_id, 'is_primary', make_primary);
exception when unique_violation then
  raise exception 'A branch with this code already exists.' using errcode = '23505';
end;
$$;

create or replace function private.update_business_branch_internal(
  p_business_id uuid,
  p_branch_id uuid,
  p_name text,
  p_code text,
  p_branch_type text,
  p_status text,
  p_is_primary boolean,
  p_country_code text default null,
  p_city text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_postal_code text default null,
  p_timezone text default null,
  p_phone text default null,
  p_email text default null,
  p_manager_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  user_id uuid := auth.uid();
  before_branch public.business_branches%rowtype;
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_code text := upper(btrim(coalesce(p_code, '')));
  normalized_type text := lower(btrim(coalesce(p_branch_type, 'branch')));
  normalized_status text := lower(btrim(coalesce(p_status, 'active')));
  normalized_country text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  normalized_timezone text := btrim(coalesce(p_timezone, ''));
begin
  if user_id is null or not private.can_manage_business_branches(p_business_id) then
    raise exception 'Branch management permission required.' using errcode = '42501';
  end if;

  select * into before_branch
  from public.business_branches
  where business_id = p_business_id and id = p_branch_id
  for update;
  if not found then raise exception 'Branch not found.' using errcode = 'P0002'; end if;

  if char_length(normalized_name) not between 2 and 120 then raise exception 'Branch name must contain 2 to 120 characters.' using errcode = '22023'; end if;
  if normalized_code !~ '^[A-Z0-9][A-Z0-9-]{1,19}$' then raise exception 'Branch code must contain 2 to 20 letters, numbers, or hyphens.' using errcode = '22023'; end if;
  if normalized_type not in ('head_office','branch','store','office','site') then raise exception 'Unsupported branch type.' using errcode = '22023'; end if;
  if normalized_status not in ('active','inactive') then raise exception 'Unsupported branch status.' using errcode = '22023'; end if;
  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then raise exception 'Country code must contain two letters.' using errcode = '22023'; end if;
  if normalized_timezone = '' then raise exception 'Branch timezone is required.' using errcode = '22023'; end if;
  if before_branch.is_primary and not coalesce(p_is_primary, false) then
    raise exception 'Set another branch as primary instead of clearing the current primary branch.' using errcode = '55000';
  end if;
  if normalized_status = 'inactive' and (before_branch.is_primary or coalesce(p_is_primary, false)) then
    raise exception 'The primary branch must remain active.' using errcode = '55000';
  end if;
  if p_manager_user_id is not null and not exists(
    select 1 from public.business_members membership
    where membership.business_id = p_business_id and membership.user_id = p_manager_user_id and membership.status = 'active'
  ) then raise exception 'Branch manager must be an active business member.' using errcode = '22023'; end if;

  perform set_config('app.business_branch_action', 'branch_write', true);
  if coalesce(p_is_primary, false) and not before_branch.is_primary then
    update public.business_branches branch
    set is_primary = false, updated_by = user_id
    where branch.business_id = p_business_id and branch.is_primary and branch.id <> p_branch_id;
  end if;

  update public.business_branches branch
  set code = normalized_code,
      name = normalized_name,
      branch_type = normalized_type,
      status = normalized_status,
      is_primary = coalesce(p_is_primary, false),
      country_code = normalized_country,
      city = nullif(btrim(coalesce(p_city, '')), ''),
      address_line_1 = nullif(btrim(coalesce(p_address_line_1, '')), ''),
      address_line_2 = nullif(btrim(coalesce(p_address_line_2, '')), ''),
      postal_code = nullif(btrim(coalesce(p_postal_code, '')), ''),
      timezone = normalized_timezone,
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
      manager_user_id = p_manager_user_id,
      updated_by = user_id
  where branch.business_id = p_business_id and branch.id = p_branch_id;

  perform private.write_business_branch_audit(
    p_business_id, p_branch_id, p_manager_user_id, 'updated',
    jsonb_build_object(
      'before_code', before_branch.code,
      'after_code', normalized_code,
      'before_status', before_branch.status,
      'after_status', normalized_status,
      'became_primary', coalesce(p_is_primary, false) and not before_branch.is_primary
    )
  );

  if before_branch.status is distinct from normalized_status then
    perform private.write_business_branch_audit(
      p_business_id, p_branch_id, p_manager_user_id, 'status_changed',
      jsonb_build_object('before', before_branch.status, 'after', normalized_status)
    );
  end if;
  if before_branch.is_primary is distinct from coalesce(p_is_primary, false) then
    perform private.write_business_branch_audit(
      p_business_id, p_branch_id, p_manager_user_id, 'primary_changed',
      jsonb_build_object('is_primary', coalesce(p_is_primary, false))
    );
  end if;

  return jsonb_build_object('branch_id', p_branch_id, 'status', normalized_status, 'is_primary', coalesce(p_is_primary, false));
exception when unique_violation then
  raise exception 'A branch with this code already exists.' using errcode = '23505';
end;
$$;

create or replace function private.set_business_member_branch_scope_internal(
  p_business_id uuid,
  p_user_id uuid,
  p_access_mode text,
  p_branch_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  normalized_mode text := lower(btrim(coalesce(p_access_mode, 'all')));
  target_member public.business_members%rowtype;
  normalized_branch_ids uuid[];
begin
  if actor_id is null or not private.can_manage_business_branches(p_business_id) then
    raise exception 'Branch management permission required.' using errcode = '42501';
  end if;
  if normalized_mode not in ('all','selected') then raise exception 'Unsupported branch access mode.' using errcode = '22023'; end if;

  select * into target_member
  from public.business_members
  where business_id = p_business_id and user_id = p_user_id
  for update;
  if not found or target_member.status = 'revoked' then raise exception 'Business member not found.' using errcode = 'P0002'; end if;
  if target_member.role = 'owner' and normalized_mode <> 'all' then
    raise exception 'The primary owner must retain access to every branch.' using errcode = '55000';
  end if;

  select coalesce(array_agg(distinct branch_id), '{}'::uuid[])
  into normalized_branch_ids
  from unnest(coalesce(p_branch_ids, '{}'::uuid[])) branch_id;

  if normalized_mode = 'selected' then
    if cardinality(normalized_branch_ids) = 0 then raise exception 'Select at least one active branch.' using errcode = '22023'; end if;
    if exists(
      select 1 from unnest(normalized_branch_ids) requested_branch
      where not exists(
        select 1 from public.business_branches branch
        where branch.business_id = p_business_id and branch.id = requested_branch and branch.status = 'active'
      )
    ) then raise exception 'One or more selected branches are unavailable.' using errcode = '22023'; end if;
  end if;

  update public.business_members
  set branch_access_mode = normalized_mode
  where business_id = p_business_id and user_id = p_user_id;

  perform set_config('app.business_branch_action', 'access_write', true);
  delete from public.business_member_branch_access
  where business_id = p_business_id and user_id = p_user_id;

  if normalized_mode = 'selected' then
    insert into public.business_member_branch_access(business_id, branch_id, user_id, granted_by)
    select p_business_id, branch_id, p_user_id, actor_id
    from unnest(normalized_branch_ids) branch_id;
  end if;

  perform private.write_business_branch_audit(
    p_business_id, null, p_user_id, 'access_mode_changed',
    jsonb_build_object('mode', normalized_mode, 'branch_ids', to_jsonb(normalized_branch_ids))
  );
  perform private.write_business_branch_audit(
    p_business_id, null, p_user_id,
    case when normalized_mode = 'selected' then 'access_assigned' else 'access_cleared' end,
    jsonb_build_object('branch_ids', to_jsonb(normalized_branch_ids))
  );

  return jsonb_build_object('user_id', p_user_id, 'access_mode', normalized_mode, 'branch_ids', to_jsonb(normalized_branch_ids));
end;
$$;

create or replace function private.get_business_branches_snapshot_internal(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  manage_ok boolean;
  result jsonb;
begin
  if current_user_id is null or not private.can_view_business_branches(p_business_id) then
    raise exception 'Branch access required.' using errcode = '42501';
  end if;
  manage_ok := private.can_manage_business_branches(p_business_id);

  select jsonb_build_object(
    'can_manage', manage_ok,
    'current_user_access_mode', membership.branch_access_mode,
    'summary', jsonb_build_object(
      'total_branches', (select count(*) from public.business_branches branch where branch.business_id = p_business_id),
      'active_branches', (select count(*) from public.business_branches branch where branch.business_id = p_business_id and branch.status = 'active'),
      'selected_scope_members', (select count(*) from public.business_members member where member.business_id = p_business_id and member.status = 'active' and member.branch_access_mode = 'selected'),
      'primary_branch_id', (select branch.id from public.business_branches branch where branch.business_id = p_business_id and branch.is_primary limit 1)
    ),
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', branch.id,
        'code', branch.code,
        'name', branch.name,
        'branch_type', branch.branch_type,
        'status', branch.status,
        'is_primary', branch.is_primary,
        'country_code', branch.country_code,
        'city', branch.city,
        'address_line_1', branch.address_line_1,
        'address_line_2', branch.address_line_2,
        'postal_code', branch.postal_code,
        'timezone', branch.timezone,
        'phone', branch.phone,
        'email', branch.email,
        'manager_user_id', branch.manager_user_id,
        'manager_name', coalesce(nullif(profile.full_name, ''), profile.email),
        'assigned_member_count', (select count(*) from public.business_member_branch_access access where access.business_id = branch.business_id and access.branch_id = branch.id),
        'current_user_has_access', private.has_business_branch_access(p_business_id, branch.id, current_user_id),
        'created_at', branch.created_at,
        'updated_at', branch.updated_at
      ) order by branch.is_primary desc, branch.status, branch.name)
      from public.business_branches branch
      left join public.profiles profile on profile.id = branch.manager_user_id
      where branch.business_id = p_business_id
        and (manage_ok or private.has_business_branch_access(p_business_id, branch.id, current_user_id))
    ), '[]'::jsonb),
    'members', case when manage_ok then coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', member.user_id,
        'name', coalesce(nullif(profile.full_name, ''), profile.email, 'Team member'),
        'email', profile.email,
        'role', member.role,
        'status', member.status,
        'branch_access_mode', member.branch_access_mode,
        'branch_ids', coalesce((
          select jsonb_agg(access.branch_id order by branch.name)
          from public.business_member_branch_access access
          join public.business_branches branch on branch.business_id = access.business_id and branch.id = access.branch_id
          where access.business_id = member.business_id and access.user_id = member.user_id
        ), '[]'::jsonb),
        'is_primary_owner', business.owner_user_id = member.user_id
      ) order by (business.owner_user_id = member.user_id) desc, member.role, coalesce(profile.full_name, profile.email))
      from public.business_members member
      join public.businesses business on business.id = member.business_id
      left join public.profiles profile on profile.id = member.user_id
      where member.business_id = p_business_id and member.status <> 'revoked'
    ), '[]'::jsonb) else '[]'::jsonb end,
    'audit', case when manage_ok then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', audit.id,
        'branch_id', audit.branch_id,
        'actor_user_id', audit.actor_user_id,
        'actor_name', coalesce(nullif(actor.full_name, ''), actor.email, 'Team member'),
        'target_user_id', audit.target_user_id,
        'target_name', coalesce(nullif(target.full_name, ''), target.email),
        'action', audit.action,
        'metadata', audit.metadata,
        'created_at', audit.created_at
      ) order by audit.created_at desc, audit.id desc)
      from (
        select * from public.business_branch_audit_log
        where business_id = p_business_id
        order by created_at desc, id desc
        limit 100
      ) audit
      left join public.profiles actor on actor.id = audit.actor_user_id
      left join public.profiles target on target.id = audit.target_user_id
    ), '[]'::jsonb) else '[]'::jsonb end
  ) into result
  from public.business_members membership
  where membership.business_id = p_business_id and membership.user_id = current_user_id;

  return result;
end;
$$;

create or replace function public.create_business_branch(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_branch_type text default 'branch',
  p_is_primary boolean default false,
  p_country_code text default null,
  p_city text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_postal_code text default null,
  p_timezone text default null,
  p_phone text default null,
  p_email text default null,
  p_manager_user_id uuid default null
)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$
select private.create_business_branch_internal(
  p_business_id,p_name,p_code,p_branch_type,p_is_primary,p_country_code,p_city,
  p_address_line_1,p_address_line_2,p_postal_code,p_timezone,p_phone,p_email,p_manager_user_id
);
$$;

create or replace function public.update_business_branch(
  p_business_id uuid,
  p_branch_id uuid,
  p_name text,
  p_code text,
  p_branch_type text,
  p_status text,
  p_is_primary boolean,
  p_country_code text default null,
  p_city text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_postal_code text default null,
  p_timezone text default null,
  p_phone text default null,
  p_email text default null,
  p_manager_user_id uuid default null
)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$
select private.update_business_branch_internal(
  p_business_id,p_branch_id,p_name,p_code,p_branch_type,p_status,p_is_primary,p_country_code,p_city,
  p_address_line_1,p_address_line_2,p_postal_code,p_timezone,p_phone,p_email,p_manager_user_id
);
$$;

create or replace function public.set_business_member_branch_scope(
  p_business_id uuid,
  p_user_id uuid,
  p_access_mode text,
  p_branch_ids uuid[] default '{}'
)
returns jsonb language sql set search_path = pg_catalog, public, private
as $$
select private.set_business_member_branch_scope_internal(p_business_id,p_user_id,p_access_mode,p_branch_ids);
$$;

create or replace function public.get_business_branches_snapshot(p_business_id uuid)
returns jsonb language sql stable set search_path = pg_catalog, public, private
as $$
select private.get_business_branches_snapshot_internal(p_business_id);
$$;

-- Bootstrap a primary Head Office for every existing advanced company without a branch.
select set_config('app.business_branch_action', 'bootstrap', true);
insert into public.business_branches(
  business_id, code, name, branch_type, status, is_primary,
  country_code, timezone, created_by, updated_by
)
select business.id, 'HQ', 'Head Office', 'head_office', 'active', true,
       business.country_code, business.timezone, business.owner_user_id, business.owner_user_id
from public.businesses business
where business.workspace_mode = 'advanced_company'
  and not exists(select 1 from public.business_branches branch where branch.business_id = business.id);

select set_config('app.business_branch_action', 'audit', true);
insert into public.business_branch_audit_log(business_id, branch_id, actor_user_id, action, metadata)
select branch.business_id, branch.id, business.owner_user_id, 'bootstrap', jsonb_build_object('code', branch.code)
from public.business_branches branch
join public.businesses business on business.id = branch.business_id
where branch.code = 'HQ'
  and branch.is_primary
  and not exists(
    select 1 from public.business_branch_audit_log audit
    where audit.business_id = branch.business_id and audit.branch_id = branch.id and audit.action = 'bootstrap'
  );

revoke all on function private.can_view_business_branches(uuid) from public, anon;
revoke all on function private.can_manage_business_branches(uuid) from public, anon;
revoke all on function private.has_business_branch_access(uuid,uuid,uuid) from public, anon;
revoke all on function private.enforce_business_branch_engine_write() from public, anon, authenticated;
revoke all on function private.write_business_branch_audit(uuid,uuid,uuid,text,jsonb) from public, anon;
revoke all on function private.create_business_branch_internal(uuid,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) from public, anon;
revoke all on function private.update_business_branch_internal(uuid,uuid,text,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) from public, anon;
revoke all on function private.set_business_member_branch_scope_internal(uuid,uuid,text,uuid[]) from public, anon;
revoke all on function private.get_business_branches_snapshot_internal(uuid) from public, anon;

grant execute on function private.can_view_business_branches(uuid) to authenticated;
grant execute on function private.can_manage_business_branches(uuid) to authenticated;
grant execute on function private.has_business_branch_access(uuid,uuid,uuid) to authenticated;
grant execute on function private.create_business_branch_internal(uuid,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) to authenticated;
grant execute on function private.update_business_branch_internal(uuid,uuid,text,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) to authenticated;
grant execute on function private.set_business_member_branch_scope_internal(uuid,uuid,text,uuid[]) to authenticated;
grant execute on function private.get_business_branches_snapshot_internal(uuid) to authenticated;

revoke all on function public.create_business_branch(uuid,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) from public, anon;
revoke all on function public.update_business_branch(uuid,uuid,text,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) from public, anon;
revoke all on function public.set_business_member_branch_scope(uuid,uuid,text,uuid[]) from public, anon;
revoke all on function public.get_business_branches_snapshot(uuid) from public, anon;

grant execute on function public.create_business_branch(uuid,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.update_business_branch(uuid,uuid,text,text,text,text,boolean,text,text,text,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.set_business_member_branch_scope(uuid,uuid,text,uuid[]) to authenticated;
grant execute on function public.get_business_branches_snapshot(uuid) to authenticated;
