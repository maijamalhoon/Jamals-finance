begin;

-- Keep the database visual identity aligned with the instant frontend matcher.
-- Whole-word matching prevents false positives such as "cat" inside "category"
-- or "car" inside "card". Unknown names receive the neutral tags glyph.
create or replace function public.infer_category_icon_key(
  p_category_name text,
  p_category_type text
)
returns text
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  v_name text := btrim(
    regexp_replace(lower(coalesce(p_category_name, '')), '[^a-z0-9]+', ' ', 'g')
  );
begin
  if v_name = '' or v_name in (
    'category',
    'new category',
    'income category',
    'expense category',
    'new income',
    'new expense'
  ) then
    return 'tags';
  end if;

  if v_name ~ '(^| )(salary|salery|sallery|payroll|wage|tankhwa|tankha|maash)( |$)' then return 'salary'; end if;
  if v_name ~ '(^| )(pension|retirement|provident|gratuity|allowance|stipend)( |$)' then return 'banknote'; end if;
  if v_name ~ '(^| )(freelance|freelancing|client work|gig|consulting|consultancy|office|workspace)( |$)' then return 'briefcase'; end if;
  if v_name ~ '(^| )(business|karobar|dukaan|shop income|trade income|factory|manufacturing)( |$)' then return 'store'; end if;
  if v_name ~ '(^| )(commission|comission|brokerage|tips received|tip income|affiliate|referral income|partnership|joint venture)( |$)' then return 'handCoins'; end if;
  if v_name ~ '(^| )(bonus|bounus|incentive|reward|eidi|cashback|cash back|rebate)( |$)' then return 'bonus'; end if;
  if v_name ~ '(^| )(profit|munafa|return|capital gain|dividend|investment|mutual fund|stock|stocks|shares|portfolio|farming income|crop sale|agriculture income)( |$)' then return 'growth'; end if;
  if v_name ~ '(^| )(interest income|markup received|yield|crypto|bitcoin|ethereum|usdt|blockchain)( |$)' then return 'coins'; end if;

  if p_category_type = 'income' and v_name ~ '(^| )(rent|rent income|rental|rental income|property income|real estate income)( |$)' then return 'building'; end if;
  if v_name ~ '(^| )(refund|reimbursement|money back)( |$)' then return 'receipt'; end if;
  if v_name ~ '(^| )(grant|scholarship|education support)( |$)' then return 'education'; end if;
  if v_name ~ '(^| )(donation received|charity received|support received)( |$)' then return 'gift'; end if;

  if v_name ~ '(^| )(house rent|home rent|rent|kiraya|mortgage|lease|property|plot|apartment|flat|furniture|sofa|bed|table|chair|appliance|washing machine|fridge|refrigerator|oven|cleaning|housekeeping|maid|domestic help)( |$)' then return 'home'; end if;
  if v_name ~ '(^| )(grocery|groceries|grocries|grocerries|rashan|ration|supermarket|fruit|vegetable|sabzi|milk|dairy|doodh)( |$)' then return 'groceries'; end if;
  if v_name ~ '(^| )(drink|drinks|beverage|beverages|juice|soft drink|cold drink|water bottle|coffee|chai|tea|cafe)( |$)' then return 'drink'; end if;
  if v_name ~ '(^| )(food|dining|restaurant|meal|khana|nashta|breakfast|lunch|dinner|pizza|burger|fast food|takeaway|bakery)( |$)' then return 'dining'; end if;
  if v_name ~ '(^| )(electricity|electric|bijli|power bill|light bill|solar|solar panel)( |$)' then return 'power'; end if;
  if v_name ~ '(^| )(water|pani|water bill)( |$)' then return 'water'; end if;
  if v_name ~ '(^| )(internet|wifi|wi fi|broadband|fiber|net bill)( |$)' then return 'internet'; end if;
  if v_name ~ '(^| )(mobile|phone|cell|smartphone|sim|load|recharge)( |$)' then return 'phone'; end if;
  if v_name ~ '(^| )(gas bill|sui gas|utility bill|utilities|kitchen|cookware|utensils)( |$)' then return 'utilities'; end if;

  if v_name ~ '(^| )(fuel|petrol|diesel|gasoline|cng)( |$)' then return 'fuel'; end if;
  if v_name ~ '(^| )(bike|bicycle|cycle|motorbike|motorcycle)( |$)' then return 'bike'; end if;
  if v_name ~ '(^| )(bus|coach|public transport)( |$)' then return 'bus'; end if;
  if v_name ~ '(^| )(train|rail|metro|subway)( |$)' then return 'train'; end if;
  if v_name ~ '(^| )(taxi|cab|ride|uber|careem|indrive|rickshaw|riksha|transport|car|gaari|gari|vehicle|parking|toll|motorway)( |$)' then return 'car'; end if;
  if v_name ~ '(^| )(flight|airline|air ticket|plane|travel|trip|tour|vacation|holiday|safar|hotel|motel|hostel|guest house|visa|passport)( |$)' then return 'travel'; end if;
  if v_name ~ '(^| )(ticket|entry pass|event pass)( |$)' then return 'ticket'; end if;

  if v_name ~ '(^| )(medicine|medication|pharmacy|drug|dawa|dawai|tablet)( |$)' then return 'medical'; end if;
  if v_name ~ '(^| )(medical|doctor|health|hospital|clinic|ilaaj|treatment|dental|dentist|eye|glasses|optical|insurance|takaful)( |$)' then return 'health'; end if;
  if v_name ~ '(^| )(school fee|college fee|university fee|tuition|academy|education|school|college|university|course|taleem|training|language)( |$)' then return 'education'; end if;
  if v_name ~ '(^| )(book|books|stationery|notebook|kitab|library|reading)( |$)' then return 'books'; end if;

  if v_name ~ '(^| )(baby|child|children|kid|bacha|bachay|daycare|nursery|family)( |$)' then return 'children'; end if;
  if v_name ~ '(^| )(pet|pets|animal|vet|veterinary|dog|puppy|cat|kitten)( |$)' then return 'pets'; end if;
  if v_name ~ '(^| )(personal|personal care|self care|selfcare|pocket money|personal spending|daily use)( |$)' then return 'personal'; end if;
  if v_name ~ '(^| )(cloth|clothing|fashion|shirt|kapra|kapray|dress|shoe|footwear|sneaker|sandal|salon|barber|haircut|spa|grooming|beauty|cosmetic|makeup|skincare|perfume)( |$)' then return 'clothing'; end if;
  if v_name ~ '(^| )(gym|fitness|workout|exercise|sport|cricket|football|tennis|badminton)( |$)' then return 'fitness'; end if;
  if v_name ~ '(^| )(game|gaming|playstation|xbox|movie|cinema|film|netflix|music|spotify|concert|subscription|membership)( |$)' then return 'games'; end if;

  if v_name ~ '(^| )(software|app|saas|domain|hosting|cloud|laptop|computer|desktop|notebook|pc|electronics|monitor|screen|keyboard|mouse|printer|camera)( |$)' then return 'laptop'; end if;
  if v_name ~ '(^| )(paint|painting|paint work|wall paint|painter|decoration|decorating)( |$)' then return 'painting'; end if;
  if v_name ~ '(^| )(home repair|house repair|plumber|electrician|marammat|car repair|bike repair|mechanic|workshop|maintenance|maintainance|maintanance|service|construction|renovation|cement|mistri|labour|labor|mazdoori|tool|hardware|equipment)( |$)' then return 'repair'; end if;
  if v_name ~ '(^| )(garden|gardening|plant|lawn|farm|farming|agriculture|seed|fertilizer|crop)( |$)' then return 'growth'; end if;
  if v_name ~ '(^| )(delivery|courier|shipping|freight|parcel|package|packaging|box)( |$)' then return 'package'; end if;
  if v_name ~ '(^| )(shopping|shop|purchase|mall|saman|market|store|retail)( |$)' then return 'shopping'; end if;

  if v_name ~ '(^| )(gift|present|tohfa|birthday|anniversary|party|celebration|wedding|shadi|marriage|charity|donation|sadqa|sadaqah|khairat|zakat)( |$)' then return 'gift'; end if;
  if v_name ~ '(^| )(tax|income tax|property tax|sales tax|bank fee|bank charge|atm fee|service fee)( |$)' then return 'tax'; end if;
  if v_name ~ '(^| )(loan|credit|debt|qarz|udhar|finance payment|credit card|card payment)( |$)' then return 'credit'; end if;
  if v_name ~ '(^| )(committee|saving committee|bisi|saving|savings|deposit|reserve|emergency fund)( |$)' then return 'savings'; end if;
  if v_name ~ '(^| )(transfer|send money|remittance)( |$)' then return 'transfer'; end if;
  if v_name ~ '(^| )(cash|wallet|atm withdrawal)( |$)' then return 'wallet'; end if;
  if v_name ~ '(^| )(bank|account|legal|lawyer|advocate|court|security|guard|cctv|alarm)( |$)' then return 'bank'; end if;
  if v_name ~ '(^| )(fee|charge|expense|other expense|misc|miscellaneous)( |$)' then return 'receipt'; end if;
  if v_name ~ '(^| )(income|earning|earnings|kamai|amdani|other income)( |$)' then return 'cash'; end if;

  return 'tags';
end;
$$;

-- Refresh only icon metadata. No ids, names, colours, relationships, amounts,
-- transactions, or other financial records are changed.
update public.categories
set icon_key = public.infer_category_icon_key(name, type)
where icon_key is distinct from public.infer_category_icon_key(name, type);

commit;
