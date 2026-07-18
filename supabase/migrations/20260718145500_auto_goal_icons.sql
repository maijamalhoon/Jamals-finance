begin;

create or replace function public.infer_goal_icon(goal_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when normalized ~ '\m(car|cars|vehicle|auto|gari|gaari|toyota|suzuki|honda|hyundai|kia|nissan|tesla|bmw|mercedes|audi|lexus|ford|chevrolet|porsche|ferrari|lamborghini|civic|corolla|markx|alto|swift|fortuner|hilux|vitz|prius|cultus|mehran|bike|motorcycle)\M'
      or normalized ~ '\mmark[[:space:]]+x\M'
      or normalized ~ '\mwagon[[:space:]]+r\M'
      then 'car'
    when normalized ~ '\m(electronics|electronic|phone|mobile|smartphone|samsung|iphone|pixel|oneplus|xiaomi|oppo|vivo|realme|huawei|laptop|computer|pc|tablet|ipad|macbook|camera|television|tv|playstation|xbox|console|s22|s23|s24|s25)\M'
      then 'smartphone'
    when normalized ~ '\m(home|house|ghar|makan|makaan|apartment|flat|property|plot|renovation|construction)\M'
      then 'home'
    when normalized ~ '\m(travel|trip|tour|vacation|holiday|flight|safar|umrah|hajj)\M'
      then 'plane'
    when normalized ~ '\m(education|school|college|university|degree|course|tuition|study|fees|taleem|parhai|padhai)\M'
      then 'graduation'
    when normalized ~ '\m(health|medical|hospital|surgery|treatment|fitness|sehat|ilaj|ilaaj|dawa|wedding|shadi)\M'
      then 'heart'
    when normalized ~ '\m(business|startup|office|company|karobar|kaarobar|dukan)\M'
      or normalized ~ '\mshop[[:space:]]+setup\M'
      then 'briefcase'
    when normalized ~ '\m(shopping|clothes|fashion|furniture|appliance|gift|kapray|kapre)\M'
      then 'shopping'
    when normalized ~ '\m(emergency|backup|reserve|bachat)\M'
      or normalized ~ '\mrainy[[:space:]]+day\M'
      or normalized ~ '\msafety[[:space:]]+fund\M'
      or normalized ~ '\msaving[[:space:]]+fund\M'
      then 'shield'
    else 'target'
  end
  from (
    select lower(coalesce(goal_name, '')) as normalized
  ) as source;
$$;

create or replace function public.set_goal_icon_from_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.icon := public.infer_goal_icon(new.name);
  return new;
end;
$$;

drop trigger if exists goals_auto_icon_from_name on public.goals;

create trigger goals_auto_icon_from_name
before insert or update on public.goals
for each row
execute function public.set_goal_icon_from_name();

update public.goals
set icon = public.infer_goal_icon(name)
where icon is distinct from public.infer_goal_icon(name);

commit;
