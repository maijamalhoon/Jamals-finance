-- Category Manager v2: secure, atomic and idempotent category mutations.
-- Existing category rows and linked financial records are not modified.

create unique index if not exists categories_user_type_name_active_unique
  on public.categories (user_id, type, lower(btrim(name)))
  where archived_at is null;

create table if not exists public.category_mutation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  operation text not null check (operation in ('create', 'update', 'archive', 'delete')),
  category_id uuid null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_key)
);

alter table public.category_mutation_requests enable row level security;
revoke all on public.category_mutation_requests from anon, authenticated;

create or replace function public.create_category_v2(
  p_name text,
  p_type text,
  p_color text,
  p_icon_key text,
  p_parent_id uuid default null,
  p_request_key uuid default gen_random_uuid()
)
returns public.categories
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_existing_id uuid;
  v_existing_operation text;
  v_category public.categories;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'Category name must contain 1 to 80 characters.' using errcode = '22023';
  end if;

  if p_type not in ('income', 'expense') then
    raise exception 'Category type must be income or expense.' using errcode = '22023';
  end if;

  if p_color is null or p_color !~* '^#[0-9a-f]{6}$' then
    raise exception 'Category color is invalid.' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_icon_key, '')), '') is null then
    raise exception 'Category icon is required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_request_key::text, 0));

  select request.operation, request.category_id
    into v_existing_operation, v_existing_id
  from public.category_mutation_requests request
  where request.user_id = v_user_id
    and request.request_key = p_request_key;

  if found and v_existing_operation <> 'create' then
    raise exception 'Mutation request key was already used.' using errcode = '23505';
  end if;

  if v_existing_id is not null then
    select category.* into v_category
    from public.categories category
    where category.id = v_existing_id
      and category.user_id = v_user_id;

    if found then
      return v_category;
    end if;
  end if;

  if p_parent_id is not null then
    if p_type <> 'expense' then
      raise exception 'Only expense categories can have a parent.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.categories parent
      where parent.id = p_parent_id
        and parent.user_id = v_user_id
        and parent.type = 'expense'
        and parent.parent_id is null
        and parent.archived_at is null
    ) then
      raise exception 'Parent category is unavailable.' using errcode = '23503';
    end if;
  end if;

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    icon_key,
    parent_id,
    sort_order,
    archived_at
  )
  values (
    v_user_id,
    v_name,
    p_type,
    upper(p_color),
    btrim(p_icon_key),
    case when p_type = 'expense' then p_parent_id else null end,
    coalesce((
      select max(category.sort_order) + 1
      from public.categories category
      where category.user_id = v_user_id
        and category.type = p_type
        and category.archived_at is null
    ), 0),
    null
  )
  returning * into v_category;

  insert into public.category_mutation_requests (
    user_id,
    request_key,
    operation,
    category_id
  )
  values (v_user_id, p_request_key, 'create', v_category.id)
  on conflict (user_id, request_key) do nothing;

  return v_category;
exception
  when unique_violation then
    raise exception 'A category with this name already exists.' using errcode = '23505';
end;
$$;

create or replace function public.update_category_v2(
  p_category_id uuid,
  p_name text,
  p_type text,
  p_color text,
  p_icon_key text,
  p_parent_id uuid default null,
  p_request_key uuid default gen_random_uuid()
)
returns public.categories
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_current public.categories;
  v_updated public.categories;
  v_usage_count bigint;
  v_child_count bigint;
  v_existing_operation text;
  v_existing_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'Category name must contain 1 to 80 characters.' using errcode = '22023';
  end if;

  if p_type not in ('income', 'expense') then
    raise exception 'Category type must be income or expense.' using errcode = '22023';
  end if;

  if p_color is null or p_color !~* '^#[0-9a-f]{6}$' then
    raise exception 'Category color is invalid.' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_icon_key, '')), '') is null then
    raise exception 'Category icon is required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_request_key::text, 0));

  select request.operation, request.category_id
    into v_existing_operation, v_existing_id
  from public.category_mutation_requests request
  where request.user_id = v_user_id
    and request.request_key = p_request_key;

  if found then
    if v_existing_operation <> 'update' then
      raise exception 'Mutation request key was already used.' using errcode = '23505';
    end if;

    select category.* into v_updated
    from public.categories category
    where category.id = v_existing_id
      and category.user_id = v_user_id;

    if found then
      return v_updated;
    end if;
  end if;

  select category.* into v_current
  from public.categories category
  where category.id = p_category_id
    and category.user_id = v_user_id
    and category.archived_at is null
  for update;

  if not found then
    raise exception 'Category not found.' using errcode = 'P0002';
  end if;

  select count(*) into v_usage_count
  from public.transactions txn
  where txn.user_id = v_user_id
    and txn.category_id = p_category_id;

  select count(*) into v_child_count
  from public.categories child
  where child.user_id = v_user_id
    and child.parent_id = p_category_id
    and child.archived_at is null;

  if p_type <> v_current.type and (v_usage_count > 0 or v_child_count > 0) then
    raise exception 'Category type cannot change while the category is in use.' using errcode = '23514';
  end if;

  if p_parent_id = p_category_id then
    raise exception 'A category cannot be its own parent.' using errcode = '23514';
  end if;

  if p_parent_id is not null then
    if p_type <> 'expense' then
      raise exception 'Only expense categories can have a parent.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.categories parent
      where parent.id = p_parent_id
        and parent.user_id = v_user_id
        and parent.type = 'expense'
        and parent.parent_id is null
        and parent.archived_at is null
        and parent.id <> p_category_id
    ) then
      raise exception 'Parent category is unavailable.' using errcode = '23503';
    end if;
  end if;

  update public.categories category
  set name = v_name,
      type = p_type,
      color = upper(p_color),
      icon_key = btrim(p_icon_key),
      parent_id = case when p_type = 'expense' then p_parent_id else null end
  where category.id = p_category_id
    and category.user_id = v_user_id
  returning * into v_updated;

  insert into public.category_mutation_requests (
    user_id,
    request_key,
    operation,
    category_id
  )
  values (v_user_id, p_request_key, 'update', v_updated.id)
  on conflict (user_id, request_key) do nothing;

  return v_updated;
exception
  when unique_violation then
    raise exception 'A category with this name already exists.' using errcode = '23505';
end;
$$;

create or replace function public.archive_category_v2(
  p_category_id uuid,
  p_request_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_id uuid;
  v_existing_operation text;
  v_existing_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_request_key::text, 0));

  select request.operation, request.category_id
    into v_existing_operation, v_existing_id
  from public.category_mutation_requests request
  where request.user_id = v_user_id
    and request.request_key = p_request_key;

  if found then
    if v_existing_operation <> 'archive' then
      raise exception 'Mutation request key was already used.' using errcode = '23505';
    end if;
    return v_existing_id;
  end if;

  update public.categories category
  set archived_at = coalesce(category.archived_at, now())
  where category.id = p_category_id
    and category.user_id = v_user_id
  returning category.id into v_category_id;

  if v_category_id is null then
    raise exception 'Category not found.' using errcode = 'P0002';
  end if;

  update public.categories child
  set archived_at = coalesce(child.archived_at, now())
  where child.user_id = v_user_id
    and child.parent_id = p_category_id
    and child.archived_at is null;

  insert into public.category_mutation_requests (
    user_id,
    request_key,
    operation,
    category_id
  )
  values (v_user_id, p_request_key, 'archive', v_category_id)
  on conflict (user_id, request_key) do nothing;

  return v_category_id;
end;
$$;

create or replace function public.delete_category_v2(
  p_category_id uuid,
  p_request_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_id uuid;
  v_usage_count bigint;
  v_child_count bigint;
  v_existing_operation text;
  v_existing_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_request_key::text, 0));

  select request.operation, request.category_id
    into v_existing_operation, v_existing_id
  from public.category_mutation_requests request
  where request.user_id = v_user_id
    and request.request_key = p_request_key;

  if found then
    if v_existing_operation <> 'delete' then
      raise exception 'Mutation request key was already used.' using errcode = '23505';
    end if;
    return v_existing_id;
  end if;

  select category.id into v_category_id
  from public.categories category
  where category.id = p_category_id
    and category.user_id = v_user_id
  for update;

  if v_category_id is null then
    raise exception 'Category not found.' using errcode = 'P0002';
  end if;

  select count(*) into v_usage_count
  from public.transactions txn
  where txn.user_id = v_user_id
    and txn.category_id = p_category_id;

  select count(*) into v_child_count
  from public.categories child
  where child.user_id = v_user_id
    and child.parent_id = p_category_id;

  if v_usage_count > 0 then
    raise exception 'This category is used by transactions and cannot be permanently deleted.' using errcode = '23503';
  end if;

  if v_child_count > 0 then
    raise exception 'Move or archive subcategories before deleting this category.' using errcode = '23503';
  end if;

  delete from public.categories category
  where category.id = p_category_id
    and category.user_id = v_user_id;

  insert into public.category_mutation_requests (
    user_id,
    request_key,
    operation,
    category_id
  )
  values (v_user_id, p_request_key, 'delete', v_category_id)
  on conflict (user_id, request_key) do nothing;

  return v_category_id;
end;
$$;

revoke all on function public.create_category_v2(text, text, text, text, uuid, uuid) from public, anon;
revoke all on function public.update_category_v2(uuid, text, text, text, text, uuid, uuid) from public, anon;
revoke all on function public.archive_category_v2(uuid, uuid) from public, anon;
revoke all on function public.delete_category_v2(uuid, uuid) from public, anon;

grant execute on function public.create_category_v2(text, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.update_category_v2(uuid, text, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.archive_category_v2(uuid, uuid) to authenticated;
grant execute on function public.delete_category_v2(uuid, uuid) to authenticated;
