-- Persist one stable visual identity for every category without touching category,
-- transaction, account, or parent relationship records.

alter table public.categories
  add column if not exists icon_key text;

comment on column public.categories.icon_key is
  'Persistent category icon key shared by settings, transaction forms, charts, and lists.';

do $$
declare
  owner_id uuid;
  category_record record;
  palette text[] := array[
    '#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#EA580C', '#0891B2',
    '#CA8A04', '#DB2777', '#4F46E5', '#0F766E', '#9333EA', '#65A30D',
    '#C2410C', '#0284C7', '#BE123C', '#475569', '#059669', '#D97706',
    '#6D28D9', '#0369A1', '#B91C1C', '#15803D', '#A21CAF', '#0E7490',
    '#A16207', '#1D4ED8', '#BE185D', '#047857', '#7E22CE', '#B45309',
    '#334155', '#0D9488', '#E11D48', '#4D7C0F', '#4338CA', '#C026D3',
    '#0F5E9C', '#9F1239', '#166534', '#5B21B6', '#9A3412', '#155E75',
    '#854D0E', '#1E40AF', '#9D174D', '#065F46', '#581C87', '#374151'
  ];
  icon_pool text[] := array[
    'banknote', 'briefcase', 'building', 'bus', 'car', 'cash', 'coins',
    'credit', 'fuel', 'gift', 'education', 'handCoins', 'health', 'home',
    'bank', 'laptop', 'utilities', 'package', 'savings', 'travel', 'receipt',
    'transfer', 'shopping', 'phone', 'bonus', 'store', 'ticket', 'train',
    'growth', 'dining', 'wallet', 'repair', 'power', 'books', 'pets', 'games',
    'fitness', 'children', 'clothing', 'medical', 'salary', 'tags'
  ];
  used_colors text[];
  used_icons text[];
  selected_color text;
  selected_icon text;
  candidate text;
  semantic_icon text;
  fallback_number integer;
begin
  for owner_id in
    select distinct user_id
    from public.categories
    where user_id is not null
    order by user_id
  loop
    used_colors := array[]::text[];
    used_icons := array[]::text[];
    fallback_number := 0;

    for category_record in
      select id, name, type, color, icon_key
      from public.categories
      where user_id = owner_id
      order by lower(type), lower(name), id
    loop
      fallback_number := fallback_number + 1;
      selected_color := null;
      selected_icon := null;

      if category_record.color is not null
        and category_record.color ~* '^#[0-9a-f]{6}$'
        and not (upper(category_record.color) = any(used_colors))
      then
        selected_color := upper(category_record.color);
      end if;

      if selected_color is null then
        foreach candidate in array palette loop
          if not (candidate = any(used_colors)) then
            selected_color := candidate;
            exit;
          end if;
        end loop;
      end if;

      -- Extremely large category collections still receive a stable valid hex
      -- color. The curated palette covers normal workspaces first.
      if selected_color is null then
        selected_color := '#' || upper(substr(md5(owner_id::text || category_record.id::text), 1, 6));
        while selected_color = any(used_colors) loop
          selected_color := '#' || upper(substr(md5(selected_color || category_record.id::text), 1, 6));
        end loop;
      end if;

      used_colors := array_append(used_colors, selected_color);

      semantic_icon := case
        when category_record.name ~* 'salary|payroll|wage' then 'salary'
        when category_record.name ~* 'freelance|business|work|commission' then 'briefcase'
        when category_record.name ~* 'saving|deposit|reserve' then 'savings'
        when category_record.name ~* 'investment|return|dividend|profit|interest' then 'growth'
        when category_record.name ~* 'bonus|reward|tip' then 'bonus'
        when category_record.name ~* 'rent|home|house|mortgage' then 'home'
        when category_record.name ~* 'food|dining|restaurant|meal|grocery' then 'dining'
        when category_record.name ~* 'fuel|petrol|gas' then 'fuel'
        when category_record.name ~* 'transport|ride|taxi|car|vehicle' then 'car'
        when category_record.name ~* 'bus' then 'bus'
        when category_record.name ~* 'train|rail' then 'train'
        when category_record.name ~* 'shopping|shop|purchase' then 'shopping'
        when category_record.name ~* 'bill|utility|electric|water|internet' then 'utilities'
        when category_record.name ~* 'phone|mobile' then 'phone'
        when category_record.name ~* 'medical|doctor|medicine|health' then 'medical'
        when category_record.name ~* 'school|education|course|tuition|book' then 'education'
        when category_record.name ~* 'travel|flight|vacation' then 'travel'
        when category_record.name ~* 'gift|donation|charity' then 'gift'
        when category_record.name ~* 'repair|maintenance|service' then 'repair'
        when category_record.name ~* 'pet|animal' then 'pets'
        when category_record.name ~* 'game|entertainment' then 'games'
        when category_record.name ~* 'gym|fitness|sport' then 'fitness'
        when category_record.name ~* 'baby|child|kid|family' then 'children'
        when category_record.name ~* 'cloth|fashion|shirt' then 'clothing'
        when category_record.name ~* 'bank|account' then 'bank'
        when category_record.name ~* 'transfer' then 'transfer'
        when category_record.name ~* 'loan|credit|debt' then 'credit'
        when category_record.name ~* 'cash|wallet' then 'wallet'
        when category_record.type = 'income' then 'cash'
        else 'receipt'
      end;

      if category_record.icon_key is not null
        and category_record.icon_key <> ''
        and not (category_record.icon_key = any(used_icons))
      then
        selected_icon := category_record.icon_key;
      elsif not (semantic_icon = any(used_icons)) then
        selected_icon := semantic_icon;
      end if;

      if selected_icon is null then
        foreach candidate in array icon_pool loop
          if not (candidate = any(used_icons)) then
            selected_icon := candidate;
            exit;
          end if;
        end loop;
      end if;

      if selected_icon is null then
        selected_icon := 'badge:' || fallback_number::text;
      end if;

      used_icons := array_append(used_icons, selected_icon);

      update public.categories
      set color = selected_color,
          icon_key = selected_icon
      where id = category_record.id
        and user_id = owner_id
        and (
          color is distinct from selected_color
          or icon_key is distinct from selected_icon
        );
    end loop;
  end loop;
end
$$;

create index if not exists categories_user_visual_lookup_idx
  on public.categories (user_id, type, lower(name));
