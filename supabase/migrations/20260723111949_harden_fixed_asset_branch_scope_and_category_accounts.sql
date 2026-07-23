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
  if not exists(
    select 1 from public.business_branches branch
    where branch.business_id=p_business_id and branch.id=p_branch_id and branch.status='active'
  ) then
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

drop trigger if exists business_asset_categories_lock_financial_accounts on public.business_asset_categories;
create trigger business_asset_categories_lock_financial_accounts
before update on public.business_asset_categories
for each row execute function private.guard_business_asset_category_financial_accounts();

-- RLS policies and snapshot branch filtering are finalized after the operational
-- functions exist in the later fixed-asset API migration.
revoke execute on function private.has_business_asset_scope(uuid,uuid,uuid) from public,anon;
grant execute on function private.has_business_asset_scope(uuid,uuid,uuid) to authenticated;
