begin;

-- Category icons describe meaning, so the same concept may intentionally reuse
-- the same glyph. Colours remain the unique visual identifier per owner.
create or replace function public.infer_category_icon_key(
  p_category_name text,
  p_category_type text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_category_name, '') ~* 'salary|salery|sallery|payroll|wage' then 'salary'
    when coalesce(p_category_name, '') ~* 'laptop|computer|desktop|notebook' then 'laptop'
    when coalesce(p_category_name, '') ~* 'mobile|phone|cell|smartphone|load' then 'phone'
    when coalesce(p_category_name, '') ~* 'electricity|electric|power|light' then 'power'
    when coalesce(p_category_name, '') ~* 'internet|wi-?fi|broadband' then 'internet'
    when coalesce(p_category_name, '') ~* 'water' then 'water'
    when coalesce(p_category_name, '') ~* 'bike|bicycle|cycle|motorbike|motorcycle' then 'bike'
    when coalesce(p_category_name, '') ~* 'bus|coach' then 'bus'
    when coalesce(p_category_name, '') ~* 'train|rail|metro' then 'train'
    when coalesce(p_category_name, '') ~* 'fuel|petrol|diesel|gasoline' then 'fuel'
    when coalesce(p_category_name, '') ~* 'ride|taxi|transport|car|vehicle|uber|indrive|toyota' then 'car'
    when coalesce(p_category_name, '') ~* 'grocer' then 'groceries'
    when coalesce(p_category_name, '') ~* 'food|dining|restaurant|meal|snack' then 'dining'
    when coalesce(p_category_name, '') ~* 'shopping|shop|purchase' then 'shopping'
    when coalesce(p_category_name, '') ~* 'rent|home|house|mortgage|household' then 'home'
    when coalesce(p_category_name, '') ~* 'bill|utility|gas bill' then 'utilities'
    when coalesce(p_category_name, '') ~* 'medical|doctor|medicine|health|hospital|clinic' then 'medical'
    when coalesce(p_category_name, '') ~* 'school|education|course|tuition|book' then 'education'
    when coalesce(p_category_name, '') ~* 'saving|deposit|reserve' then 'savings'
    when coalesce(p_category_name, '') ~* 'investment|return|dividend|profit|interest' then 'growth'
    when coalesce(p_category_name, '') ~* 'bonus|bounus|reward|tip' then 'bonus'
    when coalesce(p_category_name, '') ~* 'freelance|business|work|commission|comission' then 'briefcase'
    when coalesce(p_category_name, '') ~* 'tax|fee|charge' then 'tax'
    when coalesce(p_category_name, '') ~* 'travel|flight|vacation|tour' then 'travel'
    when coalesce(p_category_name, '') ~* 'gift|donation|charity' then 'gift'
    when coalesce(p_category_name, '') ~* 'repair|maintenance|service' then 'repair'
    when coalesce(p_category_name, '') ~* 'pet|animal' then 'pets'
    when coalesce(p_category_name, '') ~* 'game|entertainment' then 'games'
    when coalesce(p_category_name, '') ~* 'gym|fitness|sport' then 'fitness'
    when coalesce(p_category_name, '') ~* 'baby|child|kid|family' then 'children'
    when coalesce(p_category_name, '') ~* 'cloth|fashion|shirt' then 'clothing'
    when coalesce(p_category_name, '') ~* 'bank|account' then 'bank'
    when coalesce(p_category_name, '') ~* 'transfer' then 'transfer'
    when coalesce(p_category_name, '') ~* 'loan|credit|debt' then 'credit'
    when coalesce(p_category_name, '') ~* 'cash|wallet' then 'wallet'
    when coalesce(p_category_name, '') ~* 'store|market' then 'store'
    when coalesce(p_category_name, '') ~* 'ticket' then 'ticket'
    when coalesce(p_category_name, '') ~* 'package|parcel|delivery' then 'package'
    when p_category_type = 'income' then 'cash'
    else 'receipt'
  end;
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
  candidate text;
  selected_color text;
  candidate_score integer;
  best_score integer := -1;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
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
  else
    -- Renaming a category never changes its stored colour or relationships.
    new.color := case
      when new.color ~* '^#[0-9a-f]{6}$' then upper(new.color)
      when old.color ~* '^#[0-9a-f]{6}$' then upper(old.color)
      else '#475569'
    end;
  end if;

  new.icon_key := public.infer_category_icon_key(new.name, new.type);
  return new;
end
$$;

drop trigger if exists categories_assign_visual_identity on public.categories;

create trigger categories_assign_visual_identity
before insert or update of name, type on public.categories
for each row
execute function public.assign_category_visual_identity();

-- Repair only the visual icon key. IDs, names, types, colours, parent links,
-- transaction links, amounts and all financial history remain untouched.
update public.categories
set icon_key = public.infer_category_icon_key(name, type)
where icon_key is distinct from public.infer_category_icon_key(name, type);

commit;
