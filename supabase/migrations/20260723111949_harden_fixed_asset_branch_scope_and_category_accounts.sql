create or replace function private.has_business_asset_scope(p_business_id uuid,p_branch_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
select case
  when p_user_id is null then false
  when p_branch_id is not null then private.has_business_branch_access(p_business_id,p_branch_id,p_user_id)
  else exists(
    select 1 from public.business_members membership
    where membership.business_id=p_business_id
      and membership.user_id=p_user_id
      and membership.status='active'
      and (
        membership.role in ('owner','admin')
        or '*'=any(membership.permissions)
        or membership.branch_access_mode='all'
      )
  )
end;
$$;

create or replace function private.validate_business_asset_branch(
  p_business_id uuid,p_branch_id uuid,p_user_id uuid,p_require_access boolean default true
)
returns void language plpgsql stable security definer set search_path=pg_catalog,public,private
as $$
begin
  if p_branch_id is null then
    if p_require_access and not private.has_business_asset_scope(p_business_id,null,p_user_id) then
      raise exception 'All-branch access is required for a company-wide fixed asset record.' using errcode='42501';
    end if;
    return;
  end if;
  if not exists(select 1 from public.business_branches branch where branch.business_id=p_business_id and branch.id=p_branch_id and branch.status='active') then
    raise exception 'Asset branch is unavailable.' using errcode='22023';
  end if;
  if p_require_access and not private.has_business_asset_scope(p_business_id,p_branch_id,p_user_id) then
    raise exception 'You cannot access fixed assets for this branch.' using errcode='42501';
  end if;
end;
$$;

create or replace function private.guard_business_asset_category_financial_accounts()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$
begin
  if (
    old.asset_account_id is distinct from new.asset_account_id
    or old.accumulated_depreciation_account_id is distinct from new.accumulated_depreciation_account_id
    or old.depreciation_expense_account_id is distinct from new.depreciation_expense_account_id
  ) and exists(
    select 1 from public.business_fixed_assets asset
    where asset.business_id=old.business_id
      and asset.category_id=old.id
      and asset.capitalization_journal_entry_id is not null
  ) then
    raise exception 'Financial accounts cannot be changed after a category has capitalized assets.' using errcode='55000';
  end if;
  return new;
end;
$$;

create trigger business_asset_categories_lock_financial_accounts
before update on public.business_asset_categories
for each row execute function private.guard_business_asset_category_financial_accounts();

drop policy business_fixed_assets_select on public.business_fixed_assets;
create policy business_fixed_assets_select on public.business_fixed_assets for select to authenticated
using(private.can_view_business_assets(business_id) and private.has_business_asset_scope(business_id,branch_id,(select auth.uid())));

drop policy business_asset_depreciation_runs_select on public.business_asset_depreciation_runs;
create policy business_asset_depreciation_runs_select on public.business_asset_depreciation_runs for select to authenticated
using(private.can_view_business_assets(business_id) and private.has_business_asset_scope(business_id,branch_id,(select auth.uid())));

drop policy business_asset_depreciation_lines_select on public.business_asset_depreciation_lines;
create policy business_asset_depreciation_lines_select on public.business_asset_depreciation_lines for select to authenticated
using(
  private.can_view_business_assets(business_id)
  and exists(
    select 1
    from public.business_asset_depreciation_runs run
    join public.business_fixed_assets asset
      on asset.business_id=business_asset_depreciation_lines.business_id
     and asset.id=business_asset_depreciation_lines.asset_id
    where run.business_id=business_asset_depreciation_lines.business_id
      and run.id=business_asset_depreciation_lines.depreciation_run_id
      and private.has_business_asset_scope(run.business_id,run.branch_id,(select auth.uid()))
      and private.has_business_asset_scope(asset.business_id,asset.branch_id,(select auth.uid()))
  )
);

do $$
declare definition text;updated_definition text;
begin
  select pg_get_functiondef(p.oid) into definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='get_business_assets_snapshot_internal';

  updated_definition:=replace(
    definition,
    'where line.business_id=p_business_id and (run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))',
    'where line.business_id=p_business_id and private.has_business_asset_scope(p_business_id,run.branch_id,actor_id) and private.has_business_asset_scope(p_business_id,asset.branch_id,actor_id)'
  );
  updated_definition:=replace(
    updated_definition,
    '(asset.branch_id is null or private.has_business_branch_access(p_business_id,asset.branch_id,actor_id))',
    'private.has_business_asset_scope(p_business_id,asset.branch_id,actor_id)'
  );
  updated_definition:=replace(
    updated_definition,
    '(run.branch_id is null or private.has_business_branch_access(p_business_id,run.branch_id,actor_id))',
    'private.has_business_asset_scope(p_business_id,run.branch_id,actor_id)'
  );

  if updated_definition=definition then
    raise exception 'Fixed asset snapshot branch hardening did not match the expected function definition.';
  end if;
  execute updated_definition;
end$$;

revoke execute on function private.has_business_asset_scope(uuid,uuid,uuid) from public,anon;
grant execute on function private.has_business_asset_scope(uuid,uuid,uuid) to authenticated;
