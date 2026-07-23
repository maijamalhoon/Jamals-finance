begin;

alter table public.categories
  add column if not exists archived_at timestamptz,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

comment on column public.categories.archived_at is
  'When set, hides a category from new transaction pickers while preserving linked financial history.';
comment on column public.categories.sort_order is
  'Stable user-controlled ordering for active category management.';

create index if not exists categories_user_active_type_name_idx
  on public.categories (user_id, type, lower(btrim(name)))
  where archived_at is null;

create table if not exists public.category_mutation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  action text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_key)
);

alter table public.category_mutation_requests enable row level security;
revoke all on public.category_mutation_requests from anon, authenticated;

create or replace function public.mutate_personal_category(
  p_request_key uuid,
  p_action text,
  p_category_id uuid default null,
  p_name text default null,
  p_type text default null,
  p_color text default null,
  p_icon_key text default null,
  p_parent_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_type text := lower(btrim(coalesce(p_type, '')));
  v_color text := upper(btrim(coalesce(p_color, '')));
  v_icon_key text := btrim(coalesce(p_icon_key, ''));
  v_existing_response jsonb;
  v_response jsonb;
  v_usage_count bigint := 0;
  v_child_count bigint := 0;
  v_current_type text;
  v_current_parent_id uuid;
  v_category jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_request_key is null then
    raise exception 'request_key_required';
  end if;

  select request.response
    into v_existing_response
    from public.category_mutation_requests request
   where request.user_id = v_user_id
     and request.request_key = p_request_key;

  if found then
    return v_existing_response;
  end if;

  -- Serialize personal category mutations for one owner. This prevents duplicate
  -- categories and conflicting parent/type edits from concurrent double taps.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if v_action in ('create', 'update') then
    if char_length(v_name) < 1 or char_length(v_name) > 80 then
      raise exception 'category_name_invalid';
    end if;
    if v_type not in ('income', 'expense') then
      raise exception 'category_type_invalid';
    end if;
    if v_color !~ '^#[0-9A-F]{6}$' then
      raise exception 'category_color_invalid';
    end if;
    if v_icon_key = '' or char_length(v_icon_key) > 64 then
      raise exception 'category_icon_invalid';
    end if;
  end if;

  if v_action = 'create' then
    if exists (
      select 1
        from public.categories category
       where category.user_id = v_user_id
         and category.archived_at is null
         and category.type = v_type
         and lower(btrim(category.name)) = lower(v_name)
    ) then
      raise exception 'category_duplicate';
    end if;

    if v_type = 'income' then
      p_parent_id := null;
    elsif p_parent_id is not null and not exists (
      select 1
        from public.categories parent
       where parent.id = p_parent_id
         and parent.user_id = v_user_id
         and parent.type = 'expense'
         and parent.parent_id is null
         and parent.archived_at is null
    ) then
      raise exception 'category_parent_invalid';
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
      v_type,
      v_color,
      v_icon_key,
      p_parent_id,
      coalesce((
        select max(category.sort_order) + 1
          from public.categories category
         where category.user_id = v_user_id
           and category.type = v_type
           and category.archived_at is null
      ), 0),
      null
    )
    returning jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'color', color,
      'icon_key', icon_key,
      'parent_id', parent_id,
      'archived_at', archived_at,
      'created_at', created_at
    ) into v_category;

  elsif v_action = 'update' then
    if p_category_id is null then
      raise exception 'category_id_required';
    end if;

    select category.type, category.parent_id
      into v_current_type, v_current_parent_id
      from public.categories category
     where category.id = p_category_id
       and category.user_id = v_user_id
       and category.archived_at is null
     for update;

    if not found then
      raise exception 'category_not_found';
    end if;

    select count(*) into v_usage_count
      from public.transactions tx
     where tx.user_id = v_user_id
       and tx.category_id = p_category_id;

    select count(*) into v_child_count
      from public.categories child
     where child.user_id = v_user_id
       and child.parent_id = p_category_id
       and child.archived_at is null;

    if v_type <> v_current_type and (v_usage_count > 0 or v_child_count > 0) then
      raise exception 'category_type_locked';
    end if;

    if exists (
      select 1
        from public.categories category
       where category.user_id = v_user_id
         and category.id <> p_category_id
         and category.archived_at is null
         and category.type = v_type
         and lower(btrim(category.name)) = lower(v_name)
    ) then
      raise exception 'category_duplicate';
    end if;

    if v_type = 'income' then
      p_parent_id := null;
    elsif p_parent_id = p_category_id then
      raise exception 'category_parent_invalid';
    elsif p_parent_id is not null and not exists (
      select 1
        from public.categories parent
       where parent.id = p_parent_id
         and parent.user_id = v_user_id
         and parent.type = 'expense'
         and parent.parent_id is null
         and parent.archived_at is null
    ) then
      raise exception 'category_parent_invalid';
    end if;

    update public.categories category
       set name = v_name,
           type = v_type,
           color = v_color,
           icon_key = v_icon_key,
           parent_id = p_parent_id
     where category.id = p_category_id
       and category.user_id = v_user_id
    returning jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'color', color,
      'icon_key', icon_key,
      'parent_id', parent_id,
      'archived_at', archived_at,
      'created_at', created_at
    ) into v_category;

  elsif v_action = 'archive' then
    if p_category_id is null then
      raise exception 'category_id_required';
    end if;

    select count(*) into v_child_count
      from public.categories child
     where child.user_id = v_user_id
       and child.parent_id = p_category_id
       and child.archived_at is null;

    if v_child_count > 0 then
      raise exception 'category_has_children';
    end if;

    update public.categories category
       set archived_at = now()
     where category.id = p_category_id
       and category.user_id = v_user_id
       and category.archived_at is null
    returning jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'color', color,
      'icon_key', icon_key,
      'parent_id', parent_id,
      'archived_at', archived_at,
      'created_at', created_at
    ) into v_category;

    if v_category is null then
      raise exception 'category_not_found';
    end if;

  elsif v_action = 'delete' then
    if p_category_id is null then
      raise exception 'category_id_required';
    end if;

    select jsonb_build_object(
      'id', category.id,
      'name', category.name,
      'type', category.type,
      'color', category.color,
      'icon_key', category.icon_key,
      'parent_id', category.parent_id,
      'archived_at', category.archived_at,
      'created_at', category.created_at
    ) into v_category
      from public.categories category
     where category.id = p_category_id
       and category.user_id = v_user_id
     for update;

    if v_category is null then
      raise exception 'category_not_found';
    end if;

    select count(*) into v_usage_count
      from public.transactions tx
     where tx.user_id = v_user_id
       and tx.category_id = p_category_id;

    select count(*) into v_child_count
      from public.categories child
     where child.user_id = v_user_id
       and child.parent_id = p_category_id;

    if v_usage_count > 0 then
      raise exception 'category_in_use';
    end if;
    if v_child_count > 0 then
      raise exception 'category_has_children';
    end if;

    delete from public.categories category
     where category.id = p_category_id
       and category.user_id = v_user_id;
  else
    raise exception 'category_action_invalid';
  end if;

  v_response := jsonb_build_object(
    'action', v_action,
    'category', v_category
  );

  insert into public.category_mutation_requests (
    user_id,
    request_key,
    action,
    response
  ) values (
    v_user_id,
    p_request_key,
    v_action,
    v_response
  ) on conflict (user_id, request_key) do nothing;

  delete from public.category_mutation_requests request
   where request.user_id = v_user_id
     and request.created_at < now() - interval '7 days';

  return v_response;
end;
$$;

revoke all on function public.mutate_personal_category(
  uuid, text, uuid, text, text, text, text, uuid
) from public, anon;
grant execute on function public.mutate_personal_category(
  uuid, text, uuid, text, text, text, text, uuid
) to authenticated;

comment on function public.mutate_personal_category(
  uuid, text, uuid, text, text, text, text, uuid
) is
  'Atomic, idempotent personal category create/update/archive/delete with owner locking, duplicate checks, type safety, parent validation, and delete verification.';

commit;
