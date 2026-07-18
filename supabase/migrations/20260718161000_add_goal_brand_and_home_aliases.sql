begin;

create or replace function public.infer_goal_icon(goal_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when normalized ~ '\m(bike|bikes|motorbike|motorcycle|scooter|yamaha|cd70|cg125)\M'
      or normalized ~ '\mhonda[[:space:]]+(125|150)\M'
      or normalized ~ '\msuzuki[[:space:]]+150\M'
      or normalized ~ '\mcd[[:space:]]+70\M'
      or normalized ~ '\mcg[[:space:]]+125\M'
      then 'bike'
    when normalized ~ '\m(car|cars|vehicle|auto|gari|gaari|toyota|suzuki|honda|hyundai|kia|nissan|tesla|bmw|mercedes|audi|lexus|ford|chevrolet|dodge|hellcat|porsche|ferrari|lamborghini|civic|corolla|markx|alto|swift|fortuner|hilux|vitz|prius|cultus|mehran)\M'
      or normalized ~ '\mmark[[:space:]]+x\M'
      or normalized ~ '\mwagon[[:space:]]+r\M'
      then 'car'
    when normalized ~ '\m(laptop|notebook|macbook|computer|desktop|workstation|chromebook)\M'
      or normalized ~ '\mgaming[[:space:]]+pc\M'
      or normalized ~ '\mpersonal[[:space:]]+computer\M'
      then 'laptop'
    when normalized ~ '\m(tablet|ipad|kindle)\M'
      or normalized ~ '\mgalaxy[[:space:]]+tab\M'
      or normalized ~ '\msurface[[:space:]]+pro\M'
      then 'tablet'
    when normalized ~ '\m(camera|dslr|mirrorless|gopro|lens|canon|nikon|fujifilm)\M'
      then 'camera'
    when normalized ~ '\m(television|oled|qled|monitor|projector)\M'
      or normalized ~ '\msmart[[:space:]]+tv\M'
      or normalized ~ '\mled[[:space:]]+tv\M'
      then 'tv'
    when normalized ~ '\m(gaming|playstation|ps4|ps5|xbox|console|nintendo)\M'
      or normalized ~ '\msteam[[:space:]]+deck\M'
      then 'gamepad'
    when normalized ~ '\m(electronics|electronic|phone|mobile|smartphone|samsung|iphone|pixel|oneplus|xiaomi|oppo|vivo|realme|huawei|s22|s23|s24|s25)\M'
      then 'smartphone'
    when normalized ~ '\m(renovation|construction|remodel|interior)\M'
      or normalized ~ '\mrepair[[:space:]]+house\M'
      or normalized ~ '\mhome[[:space:]]+repair\M'
      or normalized ~ '\mkitchen[[:space:]]+upgrade\M'
      or normalized ~ '\mroom[[:space:]]+upgrade\M'
      then 'hammer'
    when normalized ~ '\m(home|house|ghar|makan|makaan|apartment|flat|property|plot|bungalow|banglow|bangla)\M'
      then 'home'
    when normalized ~ '\m(travel|trip|tour|vacation|holiday|flight|safar|umrah|hajj|honeymoon)\M'
      then 'plane'
    when normalized ~ '\m(education|school|college|university|degree|course|tuition|study|fees|taleem|parhai|padhai|certification|academy)\M'
      then 'graduation'
    when normalized ~ '\m(fitness|gym|workout|exercise|sports|equipment|treadmill)\M'
      then 'dumbbell'
    when normalized ~ '\m(health|medical|hospital|surgery|treatment|sehat|ilaj|ilaaj|dawa|medicine|dental)\M'
      then 'heart'
    when normalized ~ '\m(wedding|shadi|shaadi|engagement|ring|jewelry|jewellery)\M'
      or normalized ~ '\mgold[[:space:]]+set\M'
      then 'gem'
    when normalized ~ '\m(business|startup|office|company|karobar|kaarobar|dukan|freelance|agency)\M'
      or normalized ~ '\mshop[[:space:]]+setup\M'
      then 'briefcase'
    when normalized ~ '\m(gift|present|birthday|anniversary|surprise)\M'
      or normalized ~ '\meid[[:space:]]+gift\M'
      then 'gift'
    when normalized ~ '\m(shopping|clothes|fashion|furniture|appliance|kapray|kapre|wardrobe|sofa)\M'
      then 'shopping'
    when normalized ~ '\m(emergency|backup|reserve)\M'
      or normalized ~ '\mrainy[[:space:]]+day\M'
      or normalized ~ '\msafety[[:space:]]+fund\M'
      or normalized ~ '\memergency[[:space:]]+fund\M'
      or normalized ~ '\mbackup[[:space:]]+fund\M'
      then 'shield'
    when normalized ~ '\m(savings|saving|bachat|retirement|deposit)\M'
      or normalized ~ '\msaving[[:space:]]+fund\M'
      or normalized ~ '\mfuture[[:space:]]+fund\M'
      or normalized ~ '\minvestment[[:space:]]+fund\M'
      or normalized ~ '\mcash[[:space:]]+reserve\M'
      then 'piggybank'
    when normalized ~ '\m(baby|child|children|family|newborn|kids|kid)\M'
      then 'baby'
    else 'target'
  end
  from (
    select lower(coalesce(goal_name, '')) as normalized
  ) as source;
$$;

update public.goals
set icon = public.infer_goal_icon(name)
where icon is distinct from public.infer_goal_icon(name);

commit;
