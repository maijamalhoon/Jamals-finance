-- Keep category colors permanently stored while preventing near-duplicate hues.
-- This migration changes only the color field when two categories owned by the
-- same user are visually too close. Transactions, category ids, names, types,
-- icons, parent relationships, and all financial data remain untouched.

create or replace function public.category_color_distance_sq(
  left_color text,
  right_color text
)
returns integer
language sql
immutable
strict
set search_path = public
as $$
  with channels as (
    select
      get_byte(decode(substr(upper(left_color), 2, 6), 'hex'), 0) as left_red,
      get_byte(decode(substr(upper(left_color), 2, 6), 'hex'), 1) as left_green,
      get_byte(decode(substr(upper(left_color), 2, 6), 'hex'), 2) as left_blue,
      get_byte(decode(substr(upper(right_color), 2, 6), 'hex'), 0) as right_red,
      get_byte(decode(substr(upper(right_color), 2, 6), 'hex'), 1) as right_green,
      get_byte(decode(substr(upper(right_color), 2, 6), 'hex'), 2) as right_blue
  )
  select
    (left_red - right_red) * (left_red - right_red) +
    (left_green - right_green) * (left_green - right_green) +
    (left_blue - right_blue) * (left_blue - right_blue)
  from channels;
$$;

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
  icon_pool text[] := array[
    'banknote', 'briefcase', 'building', 'bus', 'car', 'cash', 'coins',
    'credit', 'fuel', 'gift', 'education', 'handCoins', 'health', 'home',
    'bank', 'laptop', 'utilities', 'package', 'savings', 'travel', 'receipt',
    'transfer', 'shopping', 'phone', 'bonus', 'store', 'ticket', 'train',
    'growth', 'dining', 'wallet', 'repair', 'power', 'books', 'pets', 'games',
    'fitness', 'children', 'clothing', 'medical', 'salary', 'tags'
  ];
  candidate text;
  selected_color text;
  candidate_score integer;
  best_score integer := -1;
  semantic_icon text;
  fallback_number integer;
begin
  if new.user_id is null then
    return new;
  end if;

  selected_color := case
    when new.color ~* '^#[0-9a-f]{6}$' then upper(new.color)
    else null
  end;

  if selected_color is null or exists (
    select 1
    from public.categories existing
    where existing.user_id = new.user_id
      and existing.id is distinct from new.id
      and existing.color ~* '^#[0-9a-f]{6}$'
      and public.category_color_distance_sq(
        selected_color,
        upper(existing.color)
      ) < 3600
  ) then
    selected_color := null;
    best_score := -1;

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

  semantic_icon := case
    when new.name ~* 'salary|payroll|wage' then 'salary'
    when new.name ~* 'freelance|business|work|commission' then 'briefcase'
    when new.name ~* 'saving|deposit|reserve' then 'savings'
    when new.name ~* 'investment|return|dividend|profit|interest' then 'growth'
    when new.name ~* 'bonus|reward|tip' then 'bonus'
    when new.name ~* 'rent|home|house|mortgage' then 'home'
    when new.name ~* 'food|dining|restaurant|meal|grocery' then 'dining'
    when new.name ~* 'fuel|petrol|gas' then 'fuel'
    when new.name ~* 'transport|ride|taxi|car|vehicle|indrive' then 'car'
    when new.name ~* 'bus' then 'bus'
    when new.name ~* 'train|rail' then 'train'
    when new.name ~* 'shopping|shop|purchase' then 'shopping'
    when new.name ~* 'bill|utility|electric|water|internet' then 'utilities'
    when new.name ~* 'phone|mobile' then 'phone'
    when new.name ~* 'medical|doctor|medicine|health' then 'medical'
    when new.name ~* 'school|education|course|tuition|book' then 'education'
    when new.name ~* 'travel|flight|vacation' then 'travel'
    when new.name ~* 'gift|donation|charity' then 'gift'
    when new.name ~* 'repair|maintenance|service' then 'repair'
    when new.name ~* 'pet|animal' then 'pets'
    when new.name ~* 'game|entertainment' then 'games'
    when new.name ~* 'gym|fitness|sport' then 'fitness'
    when new.name ~* 'baby|child|kid|family' then 'children'
    when new.name ~* 'cloth|fashion|shirt' then 'clothing'
    when new.name ~* 'bank|account' then 'bank'
    when new.name ~* 'transfer' then 'transfer'
    when new.name ~* 'loan|credit|debt' then 'credit'
    when new.name ~* 'cash|wallet' then 'wallet'
    when new.type = 'income' then 'cash'
    else 'receipt'
  end;

  if new.icon_key is null
    or btrim(new.icon_key) = ''
    or exists (
      select 1
      from public.categories existing
      where existing.user_id = new.user_id
        and existing.id is distinct from new.id
        and existing.icon_key = new.icon_key
    )
  then
    new.icon_key := null;

    if not exists (
      select 1
      from public.categories existing
      where existing.user_id = new.user_id
        and existing.id is distinct from new.id
        and existing.icon_key = semantic_icon
    ) then
      new.icon_key := semantic_icon;
    end if;

    if new.icon_key is null then
      foreach candidate in array icon_pool loop
        if not exists (
          select 1
          from public.categories existing
          where existing.user_id = new.user_id
            and existing.id is distinct from new.id
            and existing.icon_key = candidate
        ) then
          new.icon_key := candidate;
          exit;
        end if;
      end loop;
    end if;

    if new.icon_key is null then
      select count(*) + 1
      into fallback_number
      from public.categories existing
      where existing.user_id = new.user_id;
      new.icon_key := 'badge:' || fallback_number::text;
    end if;
  end if;

  return new;
end
$$;

-- Keep the most-used category visuals intact first, then repair only later
-- categories that are visually too close to a color already kept.
do $$
declare
  owner_id uuid;
  category_record record;
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
  used_colors text[];
  selected_color text;
  candidate text;
  candidate_score integer;
  best_score integer;
begin
  for owner_id in
    select distinct user_id
    from public.categories
    where user_id is not null
    order by user_id
  loop
    used_colors := array[]::text[];

    for category_record in
      select
        category.id,
        category.color,
        category.type,
        category.name,
        (
          select count(*)
          from public.transactions transaction_row
          where transaction_row.user_id = owner_id
            and transaction_row.category_id = category.id
        ) as usage_count
      from public.categories category
      where category.user_id = owner_id
      order by usage_count desc, lower(category.type), lower(category.name), category.id
    loop
      selected_color := case
        when category_record.color ~* '^#[0-9a-f]{6}$'
          then upper(category_record.color)
        else null
      end;

      if selected_color is null or exists (
        select 1
        from unnest(used_colors) as used(color)
        where public.category_color_distance_sq(selected_color, used.color) < 3600
      ) then
        selected_color := null;
        best_score := -1;

        foreach candidate in array palette loop
          if candidate = any(used_colors) then
            continue;
          end if;

          select coalesce(
            min(public.category_color_distance_sq(candidate, used.color)),
            2147483647
          )
          into candidate_score
          from unnest(used_colors) as used(color);

          if candidate_score > best_score then
            selected_color := candidate;
            best_score := candidate_score;
          end if;
        end loop;
      end if;

      if selected_color is null then
        selected_color := '#' || upper(substr(md5(owner_id::text || category_record.id::text), 1, 6));
        while selected_color = any(used_colors) loop
          selected_color := '#' || upper(substr(md5(selected_color || category_record.id::text), 1, 6));
        end loop;
      end if;

      update public.categories
      set color = selected_color
      where id = category_record.id
        and user_id = owner_id
        and color is distinct from selected_color;

      used_colors := array_append(used_colors, selected_color);
    end loop;
  end loop;
end
$$;
