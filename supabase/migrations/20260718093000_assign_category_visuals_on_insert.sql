-- Ensure every category created by any current or future UI receives one stable,
-- owner-unique color and icon. Existing rows and transaction relationships are untouched.

create or replace function public.assign_category_visual_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
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
  candidate text;
  semantic_icon text;
  fallback_number integer;
begin
  if new.user_id is null then
    return new;
  end if;

  if new.color is null
    or new.color !~* '^#[0-9a-f]{6}$'
    or exists (
      select 1
      from public.categories existing
      where existing.user_id = new.user_id
        and existing.id is distinct from new.id
        and upper(existing.color) = upper(new.color)
    )
  then
    new.color := null;
    foreach candidate in array palette loop
      if not exists (
        select 1
        from public.categories existing
        where existing.user_id = new.user_id
          and existing.id is distinct from new.id
          and upper(existing.color) = candidate
      ) then
        new.color := candidate;
        exit;
      end if;
    end loop;

    if new.color is null then
      new.color := '#' || upper(substr(md5(new.user_id::text || new.id::text), 1, 6));
      while exists (
        select 1
        from public.categories existing
        where existing.user_id = new.user_id
          and existing.id is distinct from new.id
          and upper(existing.color) = upper(new.color)
      ) loop
        new.color := '#' || upper(substr(md5(new.color || new.id::text), 1, 6));
      end loop;
    end if;
  else
    new.color := upper(new.color);
  end if;

  semantic_icon := case
    when new.name ~* 'salary|payroll|wage' then 'salary'
    when new.name ~* 'freelance|business|work|commission' then 'briefcase'
    when new.name ~* 'saving|deposit|reserve' then 'savings'
    when new.name ~* 'investment|return|dividend|profit|interest' then 'growth'
    when new.name ~* 'bonus|reward|tip' then 'bonus'
    when new.name ~* 'rent|home|house|mortgage' then 'home'
    when new.name ~* 'food|dining|restaurant|meal|grocery' then 'dining'
    when new.name ~* 'fuel|petrol|gas' then 'fuel'
    when new.name ~* 'transport|ride|taxi|car|vehicle' then 'car'
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

drop trigger if exists categories_assign_visual_identity on public.categories;

create trigger categories_assign_visual_identity
before insert on public.categories
for each row
execute function public.assign_category_visual_identity();
