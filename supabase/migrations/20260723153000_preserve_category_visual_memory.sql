begin;

-- A category's visual is user-owned memory. Creating or renaming a category
-- must never replace an explicitly selected emoji/icon or color. Existing IDs,
-- transaction links, parent links and financial history are not modified.
create or replace function public.assign_category_visual_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  palette text[] := array[
    '#2563EB', '#F97316', '#16A34A', '#7C3AED', '#EF4444', '#0891B2',
    '#CA8A04', '#DB2777', '#0F766E', '#4F46E5', '#65A30D', '#FB7185',
    '#475569', '#9333EA', '#059669', '#0284C7', '#C2410C', '#A21CAF',
    '#0E7490', '#D97706', '#6D28D9', '#15803D', '#BE123C', '#0369A1',
    '#A16207', '#BE185D', '#047857', '#7E22CE', '#B45309', '#334155',
    '#0D9488', '#E11D48', '#4D7C0F', '#4338CA', '#C026D3', '#0F5E9C',
    '#9F1239', '#166534', '#5B21B6', '#9A3412', '#155E75', '#854D0E',
    '#1E40AF', '#9D174D', '#065F46', '#581C87', '#374151', '#06B6D4'
  ];
  candidate text;
  selected_color text;
  candidate_score integer;
  best_score integer := -1;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Respect a valid color chosen in the UI exactly. Only assign a unique
    -- automatic color when the caller did not provide one.
    selected_color := case
      when new.color ~* '^#[0-9a-f]{6}$' then upper(new.color)
      else null
    end;

    if selected_color is null then
      foreach candidate in array palette loop
        if exists (
          select 1
          from public.categories existing
          where existing.user_id = new.user_id
            and existing.id is distinct from new.id
            and upper(existing.color) = candidate
        ) then
          continue;
        end if;

        select coalesce(
          min(public.category_color_distance_sq(candidate, upper(existing.color))),
          2147483647
        )
        into candidate_score
        from public.categories existing
        where existing.user_id = new.user_id
          and existing.id is distinct from new.id
          and existing.color ~* '^#[0-9a-f]{6}$';

        if candidate_score > best_score then
          selected_color := candidate;
          best_score := candidate_score;
        end if;
      end loop;

      if selected_color is null then
        selected_color := '#' || upper(substr(md5(new.user_id::text || new.id::text), 1, 6));
        while exists (
          select 1
          from public.categories existing
          where existing.user_id = new.user_id
            and existing.id is distinct from new.id
            and upper(existing.color) = selected_color
        ) loop
          selected_color := '#' || upper(substr(md5(selected_color || new.id::text), 1, 6));
        end loop;
      end if;
    end if;

    new.color := selected_color;
    new.icon_key := coalesce(
      nullif(btrim(new.icon_key), ''),
      public.infer_category_icon_key(new.name, new.type)
    );
  else
    new.color := case
      when new.color ~* '^#[0-9a-f]{6}$' then upper(new.color)
      when old.color ~* '^#[0-9a-f]{6}$' then upper(old.color)
      else '#475569'
    end;
    new.icon_key := coalesce(
      nullif(btrim(new.icon_key), ''),
      nullif(btrim(old.icon_key), ''),
      public.infer_category_icon_key(new.name, new.type)
    );
  end if;

  return new;
end
$$;

comment on function public.assign_category_visual_identity() is
  'Assigns missing category visuals while preserving every explicit user-selected color and emoji/icon across renames and type updates.';

commit;
