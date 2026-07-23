create table public.business_approval_policies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  module_key text not null,
  action_key text not null,
  description text,
  branch_id uuid,
  min_amount numeric(20,4),
  max_amount numeric(20,4),
  currency text,
  required_approvals smallint not null default 1,
  approver_permission text not null default 'approvals.decide',
  approver_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_approval_policies_business_id_id_key unique (business_id, id),
  constraint business_approval_policies_code_key unique (business_id, code),
  constraint business_approval_policies_branch_fkey foreign key (business_id, branch_id)
    references public.business_branches(business_id, id) on delete restrict,
  constraint business_approval_policies_code_check check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  constraint business_approval_policies_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint business_approval_policies_module_check check (module_key ~ '^[a-z][a-z0-9_-]{1,39}$'),
  constraint business_approval_policies_action_check check (action_key ~ '^[a-z][a-z0-9_-]{1,39}$'),
  constraint business_approval_policies_description_check check (description is null or char_length(btrim(description)) <= 1000),
  constraint business_approval_policies_amount_check check (
    (min_amount is null or min_amount >= 0)
    and (max_amount is null or max_amount >= 0)
    and (min_amount is null or max_amount is null or max_amount >= min_amount)
  ),
  constraint business_approval_policies_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint business_approval_policies_required_check check (required_approvals between 1 and 5),
  constraint business_approval_policies_permission_check check (approver_permission ~ '^[a-z][a-z0-9_.-]{2,79}$')
);

create table public.business_approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_no bigint generated always as identity unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  policy_id uuid,
  branch_id uuid,
  module_key text not null,
  action_key text not null,
  subject_type text not null,
  subject_key text not null,
  subject_label text not null,
  title text not null,
  description text,
  amount numeric(20,4),
  currency text,
  priority text not null default 'normal',
  status text not null default 'pending',
  requested_by uuid references auth.users(id) on delete set null,
  requester_name text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  required_permission text not null default 'approvals.decide',
  required_approvals smallint not null default 1,
  approval_count smallint not null default 0,
  rejection_count smallint not null default 0,
  policy_snapshot jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  client_request_id uuid not null default gen_random_uuid(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_approval_requests_business_id_id_key unique (business_id, id),
  constraint business_approval_requests_client_key unique (business_id, client_request_id),
  constraint business_approval_requests_policy_fkey foreign key (business_id, policy_id)
    references public.business_approval_policies(business_id, id) on delete restrict,
  constraint business_approval_requests_branch_fkey foreign key (business_id, branch_id)
    references public.business_branches(business_id, id) on delete restrict,
  constraint business_approval_requests_module_check check (module_key ~ '^[a-z][a-z0-9_-]{1,39}$'),
  constraint business_approval_requests_action_check check (action_key ~ '^[a-z][a-z0-9_-]{1,39}$'),
  constraint business_approval_requests_subject_type_check check (subject_type ~ '^[a-z][a-z0-9_-]{1,59}$'),
  constraint business_approval_requests_subject_key_check check (char_length(btrim(subject_key)) between 1 and 160),
  constraint business_approval_requests_subject_label_check check (char_length(btrim(subject_label)) between 1 and 160),
  constraint business_approval_requests_title_check check (char_length(btrim(title)) between 2 and 160),
  constraint business_approval_requests_description_check check (description is null or char_length(btrim(description)) <= 2000),
  constraint business_approval_requests_amount_check check (amount is null or amount >= 0),
  constraint business_approval_requests_currency_check check (
    (amount is null and currency is null) or (amount is not null and currency ~ '^[A-Z]{3}$')
  ),
  constraint business_approval_requests_priority_check check (priority in ('low','normal','high','urgent')),
  constraint business_approval_requests_status_check check (status in ('pending','approved','rejected','cancelled')),
  constraint business_approval_requests_permission_check check (required_permission ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  constraint business_approval_requests_required_check check (required_approvals between 1 and 5),
  constraint business_approval_requests_counts_check check (
    approval_count >= 0 and rejection_count >= 0 and approval_count <= required_approvals
  )
);

create table public.business_approval_decisions (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  request_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  decision text not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint business_approval_decisions_request_fkey foreign key (business_id, request_id)
    references public.business_approval_requests(business_id, id) on delete cascade,
  constraint business_approval_decisions_decision_check check (decision in ('approved','rejected','commented')),
  constraint business_approval_decisions_actor_name_check check (char_length(btrim(actor_name)) between 1 and 160),
  constraint business_approval_decisions_comment_check check (comment is null or char_length(btrim(comment)) <= 2000)
);

create table public.business_approval_audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  request_id uuid,
  policy_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint business_approval_audit_request_fkey foreign key (business_id, request_id)
    references public.business_approval_requests(business_id, id) on delete cascade,
  constraint business_approval_audit_policy_fkey foreign key (business_id, policy_id)
    references public.business_approval_policies(business_id, id) on delete cascade,
  constraint business_approval_audit_action_check check (action ~ '^[a-z][a-z0-9_]{2,79}$')
);

create unique index business_approval_requests_open_subject_idx
  on public.business_approval_requests(
    business_id, module_key, action_key, subject_type, subject_key
  ) where status = 'pending';
create unique index business_approval_decisions_actor_final_idx
  on public.business_approval_decisions(request_id, actor_user_id)
  where decision in ('approved','rejected') and actor_user_id is not null;
create index business_approval_policies_lookup_idx
  on public.business_approval_policies(business_id, active, module_key, action_key, branch_id);
create index business_approval_policies_approver_idx
  on public.business_approval_policies(approver_user_id) where approver_user_id is not null;
create index business_approval_policies_created_by_idx on public.business_approval_policies(created_by);
create index business_approval_policies_updated_by_idx on public.business_approval_policies(updated_by);
create index business_approval_requests_queue_idx
  on public.business_approval_requests(business_id, status, priority, created_at desc);
create index business_approval_requests_branch_idx on public.business_approval_requests(branch_id);
create index business_approval_requests_policy_idx on public.business_approval_requests(policy_id);
create index business_approval_requests_requested_by_idx on public.business_approval_requests(requested_by);
create index business_approval_requests_assigned_to_idx on public.business_approval_requests(assigned_to);
create index business_approval_requests_resolved_by_idx on public.business_approval_requests(resolved_by);
create index business_approval_decisions_request_idx
  on public.business_approval_decisions(request_id, created_at desc);
create index business_approval_decisions_actor_idx on public.business_approval_decisions(actor_user_id);
create index business_approval_audit_business_idx
  on public.business_approval_audit_log(business_id, created_at desc);
create index business_approval_audit_request_idx on public.business_approval_audit_log(request_id);
create index business_approval_audit_policy_idx on public.business_approval_audit_log(policy_id);
create index business_approval_audit_actor_idx on public.business_approval_audit_log(actor_user_id);

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
  'branches.view','branches.manage','approvals.view','approvals.request','approvals.decide','approvals.manage',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.can_view_business_approvals(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select (select auth.uid()) is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id = membership.business_id
  where membership.business_id = p_business_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and business.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager','viewer')
      or '*' = any(membership.permissions)
      or 'approvals.view' = any(membership.permissions)
      or 'approvals.decide' = any(membership.permissions)
      or 'approvals.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_request_business_approval(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select (select auth.uid()) is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id = membership.business_id
  where membership.business_id = p_business_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and business.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager','sales','cashier','inventory')
      or '*' = any(membership.permissions)
      or 'approvals.request' = any(membership.permissions)
      or 'approvals.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_decide_business_approval(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select (select auth.uid()) is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id = membership.business_id
  where membership.business_id = p_business_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and business.status = 'active'
    and (
      membership.role in ('owner','admin')
      or '*' = any(membership.permissions)
      or 'approvals.decide' = any(membership.permissions)
      or 'approvals.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_manage_business_approvals(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select (select auth.uid()) is not null and exists(
  select 1
  from public.business_members membership
  join public.businesses business on business.id = membership.business_id
  where membership.business_id = p_business_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and business.status = 'active'
    and (
      membership.role in ('owner','admin')
      or '*' = any(membership.permissions)
      or 'approvals.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_access_business_approval_request(p_request_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
select p_user_id is not null and exists(
  select 1
  from public.business_approval_requests request
  join public.business_members membership
    on membership.business_id = request.business_id and membership.user_id = p_user_id
  join public.businesses business on business.id = request.business_id
  where request.id = p_request_id
    and membership.status = 'active'
    and business.status = 'active'
    and (request.branch_id is null or private.has_business_branch_access(request.business_id, request.branch_id, p_user_id))
    and (
      request.requested_by = p_user_id
      or membership.role in ('owner','admin','accountant','manager','viewer')
      or '*' = any(membership.permissions)
      or 'approvals.view' = any(membership.permissions)
      or 'approvals.decide' = any(membership.permissions)
      or 'approvals.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.guard_business_approval_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare expected_action text;
begin
  expected_action := case tg_table_name
    when 'business_approval_policies' then 'policy_write'
    when 'business_approval_requests' then 'request_write'
    when 'business_approval_decisions' then 'decision_write'
    when 'business_approval_audit_log' then 'audit_write'
    else 'blocked'
  end;
  if coalesce(current_setting('app.business_approval_action', true), '') <> expected_action then
    raise exception 'Direct approval workflow writes are not allowed.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger business_approval_policies_guard
before insert or update or delete on public.business_approval_policies
for each row execute function private.guard_business_approval_write();
create trigger business_approval_requests_guard
before insert or update or delete on public.business_approval_requests
for each row execute function private.guard_business_approval_write();
create trigger business_approval_decisions_guard
before insert or update or delete on public.business_approval_decisions
for each row execute function private.guard_business_approval_write();
create trigger business_approval_audit_guard
before insert or update or delete on public.business_approval_audit_log
for each row execute function private.guard_business_approval_write();

create trigger business_approval_policies_updated_at
before update on public.business_approval_policies
for each row execute function private.set_business_workspace_updated_at();
create trigger business_approval_requests_updated_at
before update on public.business_approval_requests
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.write_business_approval_audit(
  p_business_id uuid,
  p_request_id uuid,
  p_policy_id uuid,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('app.business_approval_action', 'audit_write', true);
  insert into public.business_approval_audit_log(
    business_id, request_id, policy_id, actor_user_id, action, metadata
  ) values (
    p_business_id, p_request_id, p_policy_id, auth.uid(), p_action, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function private.match_business_approval_policy(
  p_business_id uuid,
  p_module_key text,
  p_action_key text,
  p_branch_id uuid,
  p_amount numeric,
  p_currency text
)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select policy.id
from public.business_approval_policies policy
where policy.business_id = p_business_id
  and policy.active
  and policy.module_key = p_module_key
  and policy.action_key = p_action_key
  and (policy.branch_id is null or policy.branch_id = p_branch_id)
  and (policy.currency is null or policy.currency = p_currency)
  and (policy.min_amount is null or (p_amount is not null and p_amount >= policy.min_amount))
  and (policy.max_amount is null or (p_amount is not null and p_amount <= policy.max_amount))
order by
  (policy.branch_id is not null) desc,
  (policy.currency is not null) desc,
  policy.min_amount desc nulls last,
  policy.required_approvals desc,
  policy.updated_at desc
limit 1;
$$;

create or replace function private.validate_business_approval_assignee(
  p_business_id uuid,
  p_user_id uuid,
  p_permission text,
  p_branch_id uuid,
  p_requester_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare member_record public.business_members%rowtype;
begin
  if p_user_id is null then return; end if;
  if p_user_id = p_requester_id then
    raise exception 'Requester and approver must be different people.' using errcode = '42501';
  end if;
  select * into member_record
  from public.business_members
  where business_id = p_business_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'Assigned approver is not an active business member.' using errcode = '22023'; end if;
  if not (
    member_record.role in ('owner','admin')
    or '*' = any(member_record.permissions)
    or p_permission = any(member_record.permissions)
    or 'approvals.decide' = any(member_record.permissions)
    or 'approvals.manage' = any(member_record.permissions)
  ) then raise exception 'Assigned member does not have approval authority.' using errcode = '42501'; end if;
  if p_branch_id is not null and not private.has_business_branch_access(p_business_id, p_branch_id, p_user_id) then
    raise exception 'Assigned approver cannot access this branch.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.upsert_business_approval_policy_internal(
  p_business_id uuid,
  p_policy_id uuid,
  p_code text,
  p_name text,
  p_module_key text,
  p_action_key text,
  p_description text default null,
  p_branch_id uuid default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null,
  p_currency text default null,
  p_required_approvals smallint default 1,
  p_approver_permission text default 'approvals.decide',
  p_approver_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  normalized_code text := upper(btrim(coalesce(p_code,'')));
  normalized_name text := btrim(coalesce(p_name,''));
  normalized_module text := lower(btrim(coalesce(p_module_key,'')));
  normalized_action text := lower(btrim(coalesce(p_action_key,'')));
  normalized_currency text := nullif(upper(btrim(coalesce(p_currency,''))), '');
  normalized_permission text := lower(btrim(coalesce(p_approver_permission,'approvals.decide')));
  policy_record public.business_approval_policies%rowtype;
begin
  if actor_id is null or not private.can_manage_business_approvals(p_business_id) then
    raise exception 'Approval management permission required.' using errcode = '42501';
  end if;
  if not (normalized_permission = any(private.business_team_permission_catalog())) then
    raise exception 'Unsupported approver permission.' using errcode = '22023';
  end if;
  if p_branch_id is not null and not exists(
    select 1 from public.business_branches
    where business_id = p_business_id and id = p_branch_id and status = 'active'
  ) then raise exception 'Approval policy branch is unavailable.' using errcode = '22023'; end if;
  perform private.validate_business_approval_assignee(
    p_business_id, p_approver_user_id, normalized_permission, p_branch_id, null
  );
  perform set_config('app.business_approval_action', 'policy_write', true);
  if p_policy_id is null then
    insert into public.business_approval_policies(
      business_id, code, name, module_key, action_key, description, branch_id,
      min_amount, max_amount, currency, required_approvals, approver_permission,
      approver_user_id, created_by, updated_by
    ) values (
      p_business_id, normalized_code, normalized_name, normalized_module, normalized_action,
      nullif(btrim(coalesce(p_description,'')),''), p_branch_id, p_min_amount, p_max_amount,
      normalized_currency, p_required_approvals, normalized_permission, p_approver_user_id,
      actor_id, actor_id
    ) returning * into policy_record;
    perform private.write_business_approval_audit(
      p_business_id, null, policy_record.id, 'policy_created', to_jsonb(policy_record)
    );
  else
    update public.business_approval_policies
    set code = normalized_code,
        name = normalized_name,
        module_key = normalized_module,
        action_key = normalized_action,
        description = nullif(btrim(coalesce(p_description,'')),''),
        branch_id = p_branch_id,
        min_amount = p_min_amount,
        max_amount = p_max_amount,
        currency = normalized_currency,
        required_approvals = p_required_approvals,
        approver_permission = normalized_permission,
        approver_user_id = p_approver_user_id,
        updated_by = actor_id
    where business_id = p_business_id and id = p_policy_id
    returning * into policy_record;
    if not found then raise exception 'Approval policy not found.' using errcode = 'P0002'; end if;
    perform private.write_business_approval_audit(
      p_business_id, null, policy_record.id, 'policy_updated', to_jsonb(policy_record)
    );
  end if;
  return to_jsonb(policy_record);
end;
$$;

create or replace function private.set_business_approval_policy_status_internal(
  p_business_id uuid,
  p_policy_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare policy_record public.business_approval_policies%rowtype;
begin
  if auth.uid() is null or not private.can_manage_business_approvals(p_business_id) then
    raise exception 'Approval management permission required.' using errcode = '42501';
  end if;
  perform set_config('app.business_approval_action', 'policy_write', true);
  update public.business_approval_policies
  set active = coalesce(p_active,false), updated_by = auth.uid()
  where business_id = p_business_id and id = p_policy_id
  returning * into policy_record;
  if not found then raise exception 'Approval policy not found.' using errcode = 'P0002'; end if;
  perform private.write_business_approval_audit(
    p_business_id, null, p_policy_id,
    case when policy_record.active then 'policy_activated' else 'policy_deactivated' end,
    jsonb_build_object('active',policy_record.active)
  );
  return to_jsonb(policy_record);
end;
$$;

create or replace function private.create_business_approval_request_internal(
  p_business_id uuid,
  p_module_key text,
  p_action_key text,
  p_subject_type text,
  p_subject_key text,
  p_subject_label text,
  p_title text,
  p_description text default null,
  p_amount numeric default null,
  p_currency text default null,
  p_priority text default 'normal',
  p_branch_id uuid default null,
  p_policy_id uuid default null,
  p_assigned_to uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  normalized_module text := lower(btrim(coalesce(p_module_key,'')));
  normalized_action text := lower(btrim(coalesce(p_action_key,'')));
  normalized_subject_type text := lower(btrim(coalesce(p_subject_type,'manual')));
  normalized_subject_key text := nullif(btrim(coalesce(p_subject_key,'')),'');
  normalized_subject_label text := btrim(coalesce(p_subject_label,''));
  normalized_title text := btrim(coalesce(p_title,''));
  normalized_currency text := nullif(upper(btrim(coalesce(p_currency,''))), '');
  normalized_priority text := lower(btrim(coalesce(p_priority,'normal')));
  selected_policy public.business_approval_policies%rowtype;
  request_record public.business_approval_requests%rowtype;
  effective_assignee uuid;
  effective_permission text := 'approvals.decide';
  effective_required smallint := 1;
  effective_policy_id uuid;
begin
  if actor_id is null or not private.can_request_business_approval(p_business_id) then
    raise exception 'Approval request permission required.' using errcode = '42501';
  end if;
  if p_branch_id is not null then
    if not exists(select 1 from public.business_branches where business_id=p_business_id and id=p_branch_id and status='active') then
      raise exception 'Approval request branch is unavailable.' using errcode = '22023';
    end if;
    if not private.has_business_branch_access(p_business_id,p_branch_id,actor_id) then
      raise exception 'You cannot create requests for this branch.' using errcode = '42501';
    end if;
  end if;
  if normalized_subject_key is null then normalized_subject_key := 'manual:' || gen_random_uuid()::text; end if;
  if p_policy_id is not null then
    select * into selected_policy
    from public.business_approval_policies
    where business_id=p_business_id and id=p_policy_id and active;
    if not found then raise exception 'Approval policy not found or inactive.' using errcode='P0002'; end if;
    if selected_policy.module_key<>normalized_module or selected_policy.action_key<>normalized_action then
      raise exception 'Approval policy does not match this action.' using errcode='22023';
    end if;
    if selected_policy.branch_id is not null and selected_policy.branch_id is distinct from p_branch_id then
      raise exception 'Approval policy does not match this branch.' using errcode='22023';
    end if;
    if selected_policy.currency is not null and selected_policy.currency is distinct from normalized_currency then
      raise exception 'Approval policy does not match this currency.' using errcode='22023';
    end if;
    if selected_policy.min_amount is not null and (p_amount is null or p_amount < selected_policy.min_amount) then
      raise exception 'Amount is below the selected policy range.' using errcode='22023';
    end if;
    if selected_policy.max_amount is not null and (p_amount is null or p_amount > selected_policy.max_amount) then
      raise exception 'Amount is above the selected policy range.' using errcode='22023';
    end if;
    effective_policy_id := selected_policy.id;
  else
    effective_policy_id := private.match_business_approval_policy(
      p_business_id, normalized_module, normalized_action, p_branch_id, p_amount, normalized_currency
    );
    if effective_policy_id is not null then
      select * into selected_policy from public.business_approval_policies where id=effective_policy_id;
    end if;
  end if;
  if effective_policy_id is not null then
    effective_permission := selected_policy.approver_permission;
    effective_required := selected_policy.required_approvals;
    effective_assignee := selected_policy.approver_user_id;
  end if;
  if p_assigned_to is not null then
    if not private.can_manage_business_approvals(p_business_id) then
      raise exception 'Only approval managers can assign a request during creation.' using errcode='42501';
    end if;
    effective_assignee := p_assigned_to;
  end if;
  perform private.validate_business_approval_assignee(
    p_business_id, effective_assignee, effective_permission, p_branch_id, actor_id
  );
  select coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member')
  into actor_name
  from public.profiles profile where profile.id=actor_id;
  actor_name := coalesce(actor_name,'Team member');
  perform set_config('app.business_approval_action', 'request_write', true);
  insert into public.business_approval_requests(
    business_id, policy_id, branch_id, module_key, action_key, subject_type,
    subject_key, subject_label, title, description, amount, currency, priority,
    requested_by, requester_name, assigned_to, required_permission,
    required_approvals, policy_snapshot, payload, client_request_id
  ) values (
    p_business_id, effective_policy_id, p_branch_id, normalized_module, normalized_action,
    normalized_subject_type, normalized_subject_key, normalized_subject_label, normalized_title,
    nullif(btrim(coalesce(p_description,'')),''), p_amount, normalized_currency, normalized_priority,
    actor_id, actor_name, effective_assignee, effective_permission, effective_required,
    case when effective_policy_id is null then '{}'::jsonb else to_jsonb(selected_policy) end,
    coalesce(p_payload,'{}'::jsonb), coalesce(p_client_request_id,gen_random_uuid())
  ) returning * into request_record;
  perform private.write_business_approval_audit(
    p_business_id, request_record.id, effective_policy_id, 'request_created',
    jsonb_build_object(
      'request_no',request_record.request_no,
      'assigned_to',request_record.assigned_to,
      'required_approvals',request_record.required_approvals,
      'required_permission',request_record.required_permission
    )
  );
  return to_jsonb(request_record) || jsonb_build_object('request_code','APR-'||lpad(request_record.request_no::text,8,'0'));
exception
  when unique_violation then
    raise exception 'An open approval request already exists for this subject and action.' using errcode='23505';
end;
$$;

create or replace function private.assign_business_approval_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_assigned_to uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare request_record public.business_approval_requests%rowtype;
begin
  if auth.uid() is null or not private.can_manage_business_approvals(p_business_id) then
    raise exception 'Approval management permission required.' using errcode='42501';
  end if;
  select * into request_record
  from public.business_approval_requests
  where business_id=p_business_id and id=p_request_id
  for update;
  if not found then raise exception 'Approval request not found.' using errcode='P0002'; end if;
  if request_record.status<>'pending' then raise exception 'Only pending requests can be assigned.' using errcode='55000'; end if;
  perform private.validate_business_approval_assignee(
    p_business_id,p_assigned_to,request_record.required_permission,request_record.branch_id,request_record.requested_by
  );
  perform set_config('app.business_approval_action','request_write',true);
  update public.business_approval_requests
  set assigned_to=p_assigned_to
  where id=p_request_id
  returning * into request_record;
  perform private.write_business_approval_audit(
    p_business_id,p_request_id,request_record.policy_id,'request_assigned',
    jsonb_build_object('assigned_to',p_assigned_to)
  );
  return to_jsonb(request_record);
end;
$$;

create or replace function private.decide_business_approval_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_decision text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  normalized_decision text := lower(btrim(coalesce(p_decision,'')));
  request_record public.business_approval_requests%rowtype;
  member_record public.business_members%rowtype;
  approvals_total integer;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if normalized_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.' using errcode='22023'; end if;
  select * into request_record
  from public.business_approval_requests
  where business_id=p_business_id and id=p_request_id
  for update;
  if not found then raise exception 'Approval request not found.' using errcode='P0002'; end if;
  if request_record.status<>'pending' then raise exception 'Approval request is already resolved.' using errcode='55000'; end if;
  if request_record.requested_by=actor_id then
    raise exception 'Requester cannot approve or reject their own request.' using errcode='42501';
  end if;
  if request_record.assigned_to is not null and request_record.assigned_to<>actor_id then
    raise exception 'This request is assigned to another approver.' using errcode='42501';
  end if;
  if request_record.branch_id is not null and not private.has_business_branch_access(p_business_id,request_record.branch_id,actor_id) then
    raise exception 'You cannot decide requests for this branch.' using errcode='42501';
  end if;
  select * into member_record from public.business_members
  where business_id=p_business_id and user_id=actor_id and status='active';
  if not found or not (
    member_record.role in ('owner','admin')
    or '*'=any(member_record.permissions)
    or request_record.required_permission=any(member_record.permissions)
    or 'approvals.decide'=any(member_record.permissions)
    or 'approvals.manage'=any(member_record.permissions)
  ) then raise exception 'Approval decision permission required.' using errcode='42501'; end if;
  if normalized_decision='rejected' and nullif(btrim(coalesce(p_comment,'')),'') is null then
    raise exception 'A rejection reason is required.' using errcode='22023';
  end if;
  select coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member')
  into actor_name from public.profiles profile where profile.id=actor_id;
  actor_name := coalesce(actor_name,'Team member');
  perform set_config('app.business_approval_action','decision_write',true);
  insert into public.business_approval_decisions(
    business_id,request_id,actor_user_id,actor_name,decision,comment
  ) values (
    p_business_id,p_request_id,actor_id,actor_name,normalized_decision,
    nullif(btrim(coalesce(p_comment,'')),'')
  );
  if normalized_decision='rejected' then
    perform set_config('app.business_approval_action','request_write',true);
    update public.business_approval_requests
    set rejection_count=rejection_count+1,status='rejected',resolved_by=actor_id,resolved_at=now()
    where id=p_request_id
    returning * into request_record;
  else
    select count(*) into approvals_total
    from public.business_approval_decisions
    where request_id=p_request_id and decision='approved';
    perform set_config('app.business_approval_action','request_write',true);
    update public.business_approval_requests
    set approval_count=approvals_total,
        status=case when approvals_total>=required_approvals then 'approved' else 'pending' end,
        resolved_by=case when approvals_total>=required_approvals then actor_id else null end,
        resolved_at=case when approvals_total>=required_approvals then now() else null end
    where id=p_request_id
    returning * into request_record;
  end if;
  perform private.write_business_approval_audit(
    p_business_id,p_request_id,request_record.policy_id,
    case when normalized_decision='approved' then 'request_approved' else 'request_rejected' end,
    jsonb_build_object(
      'approval_count',request_record.approval_count,
      'required_approvals',request_record.required_approvals,
      'status',request_record.status
    )
  );
  return to_jsonb(request_record) || jsonb_build_object('request_code','APR-'||lpad(request_record.request_no::text,8,'0'));
exception
  when unique_violation then
    raise exception 'You have already decided this request.' using errcode='23505';
end;
$$;

create or replace function private.comment_business_approval_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid:=auth.uid(); actor_name text; request_record public.business_approval_requests%rowtype; decision_id bigint;
begin
  if actor_id is null or not private.can_access_business_approval_request(p_request_id,actor_id) then
    raise exception 'Approval request access required.' using errcode='42501';
  end if;
  if nullif(btrim(coalesce(p_comment,'')),'') is null then raise exception 'Comment is required.' using errcode='22023'; end if;
  select * into request_record from public.business_approval_requests where business_id=p_business_id and id=p_request_id;
  if not found then raise exception 'Approval request not found.' using errcode='P0002'; end if;
  select coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member')
  into actor_name from public.profiles profile where profile.id=actor_id;
  actor_name:=coalesce(actor_name,'Team member');
  perform set_config('app.business_approval_action','decision_write',true);
  insert into public.business_approval_decisions(business_id,request_id,actor_user_id,actor_name,decision,comment)
  values(p_business_id,p_request_id,actor_id,actor_name,'commented',btrim(p_comment))
  returning id into decision_id;
  perform private.write_business_approval_audit(
    p_business_id,p_request_id,request_record.policy_id,'request_commented',jsonb_build_object('decision_id',decision_id)
  );
  return jsonb_build_object('id',decision_id,'request_id',p_request_id,'comment',btrim(p_comment));
end;
$$;

create or replace function private.cancel_business_approval_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid:=auth.uid(); request_record public.business_approval_requests%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  select * into request_record from public.business_approval_requests
  where business_id=p_business_id and id=p_request_id for update;
  if not found then raise exception 'Approval request not found.' using errcode='P0002'; end if;
  if request_record.status<>'pending' then raise exception 'Only pending requests can be cancelled.' using errcode='55000'; end if;
  if request_record.requested_by<>actor_id and not private.can_manage_business_approvals(p_business_id) then
    raise exception 'Only the requester or an approval manager can cancel this request.' using errcode='42501';
  end if;
  perform set_config('app.business_approval_action','request_write',true);
  update public.business_approval_requests
  set status='cancelled',resolved_by=actor_id,resolved_at=now()
  where id=p_request_id returning * into request_record;
  perform private.write_business_approval_audit(
    p_business_id,p_request_id,request_record.policy_id,'request_cancelled',
    jsonb_build_object('comment',nullif(btrim(coalesce(p_comment,'')),''))
  );
  return to_jsonb(request_record) || jsonb_build_object('request_code','APR-'||lpad(request_record.request_no::text,8,'0'));
end;
$$;

create or replace function private.get_business_approvals_snapshot_internal(
  p_business_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid:=auth.uid();
  can_view_all boolean;
  can_request boolean;
  normalized_limit integer:=greatest(1,least(coalesce(p_limit,100),250));
begin
  can_view_all:=private.can_view_business_approvals(p_business_id);
  can_request:=private.can_request_business_approval(p_business_id);
  if actor_id is null or not (can_view_all or can_request) then
    raise exception 'Approval workspace access required.' using errcode='42501';
  end if;
  return jsonb_build_object(
    'summary', jsonb_build_object(
      'pending', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='pending' and private.can_access_business_approval_request(request.id,actor_id)),
      'approved', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='approved' and private.can_access_business_approval_request(request.id,actor_id)),
      'rejected', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='rejected' and private.can_access_business_approval_request(request.id,actor_id)),
      'urgent', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='pending' and request.priority='urgent' and private.can_access_business_approval_request(request.id,actor_id)),
      'unassigned', (select count(*) from public.business_approval_requests request where request.business_id=p_business_id and request.status='pending' and request.assigned_to is null and private.can_access_business_approval_request(request.id,actor_id))
    ),
    'policies', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.active desc,row_data.module_key,row_data.action_key,row_data.name)
      from (
        select policy.id,policy.code,policy.name,policy.module_key,policy.action_key,policy.description,
               policy.branch_id,branch.name as branch_name,policy.min_amount,policy.max_amount,policy.currency,
               policy.required_approvals,policy.approver_permission,policy.approver_user_id,
               coalesce(nullif(btrim(approver.full_name),''),nullif(split_part(approver.email,'@',1),'')) as approver_name,
               policy.active,policy.created_at,policy.updated_at
        from public.business_approval_policies policy
        left join public.business_branches branch on branch.id=policy.branch_id
        left join public.profiles approver on approver.id=policy.approver_user_id
        where policy.business_id=p_business_id
          and (can_view_all or policy.active)
          and (policy.branch_id is null or private.has_business_branch_access(p_business_id,policy.branch_id,actor_id))
      ) row_data
    ),'[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by
        case row_data.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
        row_data.created_at desc)
      from (
        select request.id,request.request_no,'APR-'||lpad(request.request_no::text,8,'0') as request_code,
               request.policy_id,policy.name as policy_name,request.branch_id,branch.name as branch_name,
               request.module_key,request.action_key,request.subject_type,request.subject_key,request.subject_label,
               request.title,request.description,request.amount,request.currency,request.priority,request.status,
               request.requested_by,request.requester_name,request.assigned_to,
               coalesce(nullif(btrim(assignee.full_name),''),nullif(split_part(assignee.email,'@',1),'')) as assigned_name,
               request.required_permission,request.required_approvals,request.approval_count,request.rejection_count,
               request.payload,request.resolved_by,request.resolved_at,request.created_at,request.updated_at
        from public.business_approval_requests request
        left join public.business_approval_policies policy on policy.id=request.policy_id
        left join public.business_branches branch on branch.id=request.branch_id
        left join public.profiles assignee on assignee.id=request.assigned_to
        where request.business_id=p_business_id
          and private.can_access_business_approval_request(request.id,actor_id)
        order by request.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'decisions', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select decision.id,decision.request_id,'APR-'||lpad(request.request_no::text,8,'0') as request_code,
               decision.actor_user_id,decision.actor_name,decision.decision,decision.comment,decision.created_at
        from public.business_approval_decisions decision
        join public.business_approval_requests request on request.id=decision.request_id
        where decision.business_id=p_business_id
          and private.can_access_business_approval_request(request.id,actor_id)
        order by decision.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.name,row_data.user_id)
      from (
        select membership.user_id,
               coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'Team member') as name,
               profile.email,membership.role,membership.permissions,membership.branch_access_mode
        from public.business_members membership
        left join public.profiles profile on profile.id=membership.user_id
        where membership.business_id=p_business_id and membership.status='active'
          and (
            membership.role in ('owner','admin') or '*'=any(membership.permissions)
            or 'approvals.decide'=any(membership.permissions) or 'approvals.manage'=any(membership.permissions)
          )
      ) row_data
    ),'[]'::jsonb),
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object('id',branch.id,'code',branch.code,'name',branch.name,'is_primary',branch.is_primary) order by branch.is_primary desc,branch.name)
      from public.business_branches branch
      where branch.business_id=p_business_id and branch.status='active'
        and private.has_business_branch_access(p_business_id,branch.id,actor_id)
    ),'[]'::jsonb),
    'audit', case when can_view_all then coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select audit.id,audit.request_id,audit.policy_id,audit.actor_user_id,
               coalesce(nullif(btrim(profile.full_name),''),nullif(split_part(profile.email,'@',1),''),'System') as actor_name,
               audit.action,audit.metadata,audit.created_at
        from public.business_approval_audit_log audit
        left join public.profiles profile on profile.id=audit.actor_user_id
        where audit.business_id=p_business_id
        order by audit.created_at desc
        limit normalized_limit
      ) row_data
    ),'[]'::jsonb) else '[]'::jsonb end,
    'capabilities', jsonb_build_object(
      'can_view_all',can_view_all,
      'can_request',can_request,
      'can_decide',private.can_decide_business_approval(p_business_id),
      'can_manage',private.can_manage_business_approvals(p_business_id)
    )
  );
end;
$$;

create or replace function public.upsert_business_approval_policy(
  p_business_id uuid,
  p_policy_id uuid,
  p_code text,
  p_name text,
  p_module_key text,
  p_action_key text,
  p_description text default null,
  p_branch_id uuid default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null,
  p_currency text default null,
  p_required_approvals smallint default 1,
  p_approver_permission text default 'approvals.decide',
  p_approver_user_id uuid default null
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.upsert_business_approval_policy_internal(p_business_id,p_policy_id,p_code,p_name,p_module_key,p_action_key,p_description,p_branch_id,p_min_amount,p_max_amount,p_currency,p_required_approvals,p_approver_permission,p_approver_user_id);$$;

create or replace function public.set_business_approval_policy_status(p_business_id uuid,p_policy_id uuid,p_active boolean)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.set_business_approval_policy_status_internal(p_business_id,p_policy_id,p_active);$$;

create or replace function public.create_business_approval_request(
  p_business_id uuid,p_module_key text,p_action_key text,p_subject_type text,p_subject_key text,
  p_subject_label text,p_title text,p_description text default null,p_amount numeric default null,
  p_currency text default null,p_priority text default 'normal',p_branch_id uuid default null,
  p_policy_id uuid default null,p_assigned_to uuid default null,p_payload jsonb default '{}'::jsonb,
  p_client_request_id uuid default null
)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.create_business_approval_request_internal(p_business_id,p_module_key,p_action_key,p_subject_type,p_subject_key,p_subject_label,p_title,p_description,p_amount,p_currency,p_priority,p_branch_id,p_policy_id,p_assigned_to,p_payload,p_client_request_id);$$;

create or replace function public.assign_business_approval_request(p_business_id uuid,p_request_id uuid,p_assigned_to uuid)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.assign_business_approval_request_internal(p_business_id,p_request_id,p_assigned_to);$$;

create or replace function public.decide_business_approval_request(p_business_id uuid,p_request_id uuid,p_decision text,p_comment text default null)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.decide_business_approval_request_internal(p_business_id,p_request_id,p_decision,p_comment);$$;

create or replace function public.comment_business_approval_request(p_business_id uuid,p_request_id uuid,p_comment text)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.comment_business_approval_request_internal(p_business_id,p_request_id,p_comment);$$;

create or replace function public.cancel_business_approval_request(p_business_id uuid,p_request_id uuid,p_comment text default null)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.cancel_business_approval_request_internal(p_business_id,p_request_id,p_comment);$$;

create or replace function public.get_business_approvals_snapshot(p_business_id uuid,p_limit integer default 100)
returns jsonb language sql stable set search_path=pg_catalog,public,private
as $$select private.get_business_approvals_snapshot_internal(p_business_id,p_limit);$$;

alter table public.business_approval_policies enable row level security;
alter table public.business_approval_requests enable row level security;
alter table public.business_approval_decisions enable row level security;
alter table public.business_approval_audit_log enable row level security;

create policy business_approval_policies_select on public.business_approval_policies
for select to authenticated using (
  private.can_view_business_approvals(business_id)
  or (
    private.can_request_business_approval(business_id)
    and active
    and (branch_id is null or private.has_business_branch_access(business_id,branch_id,(select auth.uid())))
  )
);
create policy business_approval_requests_select on public.business_approval_requests
for select to authenticated using (
  private.can_access_business_approval_request(id,(select auth.uid()))
);
create policy business_approval_decisions_select on public.business_approval_decisions
for select to authenticated using (
  private.can_access_business_approval_request(request_id,(select auth.uid()))
);
create policy business_approval_audit_select on public.business_approval_audit_log
for select to authenticated using (
  private.can_view_business_approvals(business_id)
);

revoke all on public.business_approval_policies from anon, authenticated;
revoke all on public.business_approval_requests from anon, authenticated;
revoke all on public.business_approval_decisions from anon, authenticated;
revoke all on public.business_approval_audit_log from anon, authenticated;
grant select on public.business_approval_policies to authenticated;
grant select on public.business_approval_requests to authenticated;
grant select on public.business_approval_decisions to authenticated;
grant select on public.business_approval_audit_log to authenticated;

revoke execute on function private.can_view_business_approvals(uuid) from public,anon;
revoke execute on function private.can_request_business_approval(uuid) from public,anon;
revoke execute on function private.can_decide_business_approval(uuid) from public,anon;
revoke execute on function private.can_manage_business_approvals(uuid) from public,anon;
revoke execute on function private.can_access_business_approval_request(uuid,uuid) from public,anon;
grant execute on function private.can_view_business_approvals(uuid) to authenticated;
grant execute on function private.can_request_business_approval(uuid) to authenticated;
grant execute on function private.can_decide_business_approval(uuid) to authenticated;
grant execute on function private.can_manage_business_approvals(uuid) to authenticated;
grant execute on function private.can_access_business_approval_request(uuid,uuid) to authenticated;

revoke execute on function private.upsert_business_approval_policy_internal(uuid,uuid,text,text,text,text,text,uuid,numeric,numeric,text,smallint,text,uuid) from public,anon;
revoke execute on function private.set_business_approval_policy_status_internal(uuid,uuid,boolean) from public,anon;
revoke execute on function private.create_business_approval_request_internal(uuid,text,text,text,text,text,text,text,numeric,text,text,uuid,uuid,uuid,jsonb,uuid) from public,anon;
revoke execute on function private.assign_business_approval_request_internal(uuid,uuid,uuid) from public,anon;
revoke execute on function private.decide_business_approval_request_internal(uuid,uuid,text,text) from public,anon;
revoke execute on function private.comment_business_approval_request_internal(uuid,uuid,text) from public,anon;
revoke execute on function private.cancel_business_approval_request_internal(uuid,uuid,text) from public,anon;
revoke execute on function private.get_business_approvals_snapshot_internal(uuid,integer) from public,anon;
grant execute on function private.upsert_business_approval_policy_internal(uuid,uuid,text,text,text,text,text,uuid,numeric,numeric,text,smallint,text,uuid) to authenticated;
grant execute on function private.set_business_approval_policy_status_internal(uuid,uuid,boolean) to authenticated;
grant execute on function private.create_business_approval_request_internal(uuid,text,text,text,text,text,text,text,numeric,text,text,uuid,uuid,uuid,jsonb,uuid) to authenticated;
grant execute on function private.assign_business_approval_request_internal(uuid,uuid,uuid) to authenticated;
grant execute on function private.decide_business_approval_request_internal(uuid,uuid,text,text) to authenticated;
grant execute on function private.comment_business_approval_request_internal(uuid,uuid,text) to authenticated;
grant execute on function private.cancel_business_approval_request_internal(uuid,uuid,text) to authenticated;
grant execute on function private.get_business_approvals_snapshot_internal(uuid,integer) to authenticated;

revoke execute on function public.upsert_business_approval_policy(uuid,uuid,text,text,text,text,text,uuid,numeric,numeric,text,smallint,text,uuid) from public,anon;
revoke execute on function public.set_business_approval_policy_status(uuid,uuid,boolean) from public,anon;
revoke execute on function public.create_business_approval_request(uuid,text,text,text,text,text,text,text,numeric,text,text,uuid,uuid,uuid,jsonb,uuid) from public,anon;
revoke execute on function public.assign_business_approval_request(uuid,uuid,uuid) from public,anon;
revoke execute on function public.decide_business_approval_request(uuid,uuid,text,text) from public,anon;
revoke execute on function public.comment_business_approval_request(uuid,uuid,text) from public,anon;
revoke execute on function public.cancel_business_approval_request(uuid,uuid,text) from public,anon;
revoke execute on function public.get_business_approvals_snapshot(uuid,integer) from public,anon;
grant execute on function public.upsert_business_approval_policy(uuid,uuid,text,text,text,text,text,uuid,numeric,numeric,text,smallint,text,uuid) to authenticated;
grant execute on function public.set_business_approval_policy_status(uuid,uuid,boolean) to authenticated;
grant execute on function public.create_business_approval_request(uuid,text,text,text,text,text,text,text,numeric,text,text,uuid,uuid,uuid,jsonb,uuid) to authenticated;
grant execute on function public.assign_business_approval_request(uuid,uuid,uuid) to authenticated;
grant execute on function public.decide_business_approval_request(uuid,uuid,text,text) to authenticated;
grant execute on function public.comment_business_approval_request(uuid,uuid,text) to authenticated;
grant execute on function public.cancel_business_approval_request(uuid,uuid,text) to authenticated;
grant execute on function public.get_business_approvals_snapshot(uuid,integer) to authenticated;
