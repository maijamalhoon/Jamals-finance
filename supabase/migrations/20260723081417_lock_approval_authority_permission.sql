alter table public.business_approval_policies
  drop constraint business_approval_policies_permission_check;
alter table public.business_approval_policies
  add constraint business_approval_policies_permission_check
  check (approver_permission = 'approvals.decide');

alter table public.business_approval_requests
  drop constraint business_approval_requests_permission_check;
alter table public.business_approval_requests
  add constraint business_approval_requests_permission_check
  check (required_permission = 'approvals.decide');

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
  if normalized_permission <> 'approvals.decide' then
    raise exception 'Approval policies must use approvals.decide authority.' using errcode = '22023';
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
