import {
  BadgeDollarSign,
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coins,
  CreditCard,
  Droplets,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Lightbulb,
  Package,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  Repeat2,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Tags,
  Ticket,
  TrainFront,
  TrendingUp,
  Utensils,
  Wallet,
  WalletCards,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategoryKind = "income" | "expense";

export const CATEGORY_VISUAL_COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#EA580C",
  "#0891B2",
  "#CA8A04",
  "#DB2777",
  "#4F46E5",
  "#0F766E",
  "#9333EA",
  "#65A30D",
  "#C2410C",
  "#0284C7",
  "#BE123C",
  "#475569",
  "#059669",
  "#D97706",
  "#6D28D9",
  "#0369A1",
  "#B91C1C",
  "#15803D",
  "#A21CAF",
  "#0E7490",
  "#A16207",
  "#1D4ED8",
  "#BE185D",
  "#047857",
  "#7E22CE",
  "#B45309",
  "#334155",
  "#0D9488",
  "#E11D48",
  "#4D7C0F",
  "#4338CA",
  "#C026D3",
  "#0F5E9C",
  "#9F1239",
  "#166534",
  "#5B21B6",
  "#9A3412",
  "#155E75",
  "#854D0E",
  "#1E40AF",
  "#9D174D",
  "#065F46",
  "#581C87",
  "#374151",
] as const;

export const CATEGORY_ICON_MAP = {
  banknote: Banknote,
  briefcase: Briefcase,
  building: Building2,
  bus: Bus,
  car: Car,
  bike: Bike,
  cash: Wallet,
  coins: Coins,
  credit: CreditCard,
  fuel: Fuel,
  gift: Gift,
  education: GraduationCap,
  handCoins: HandCoins,
  health: HeartPulse,
  home: Home,
  bank: Landmark,
  tax: Landmark,
  laptop: Laptop,
  utilities: Lightbulb,
  power: Zap,
  internet: Wifi,
  water: Droplets,
  package: Package,
  savings: PiggyBank,
  travel: Plane,
  receipt: ReceiptText,
  transfer: Repeat2,
  shopping: ShoppingBag,
  groceries: ShoppingBasket,
  phone: Smartphone,
  bonus: Sparkles,
  store: Store,
  ticket: Ticket,
  train: TrainFront,
  growth: TrendingUp,
  dining: Utensils,
  wallet: WalletCards,
  repair: Wrench,
  books: BookOpen,
  pets: PawPrint,
  games: Gamepad2,
  fitness: Dumbbell,
  children: Baby,
  clothing: Shirt,
  medical: Stethoscope,
  salary: BadgeDollarSign,
  tags: Tags,
} satisfies Record<string, LucideIcon>;

export type NamedCategoryIconKey = keyof typeof CATEGORY_ICON_MAP;
export type CategoryIconKey = NamedCategoryIconKey | `badge:${number}`;

export interface CategoryVisualSource {
  id: string;
  name: string;
  type: CategoryKind;
  color?: string | null;
  icon_key?: string | null;
  parent_id?: string | null;
}

export interface CategoryVisual {
  color: string;
  iconKey: CategoryIconKey;
}

export const CATEGORY_ICON_KEYS = Object.keys(
  CATEGORY_ICON_MAP,
) as NamedCategoryIconKey[];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
type CategoryIconRule = readonly [RegExp, NamedCategoryIconKey];

/**
 * Precompiled rules cover 100+ common income and expense concepts, including
 * common Roman-Urdu wording. Matching is fully local and instant while typing.
 */
const CATEGORY_ICON_RULES: readonly CategoryIconRule[] = [
  [/salary|salery|sallery|payroll|wage|tankh?w?a|tankha|maash/, "salary"],
  [/pension|retirement|provident|gratuity|allowance|stipend/, "banknote"],
  [/freelance|client work|gig|consult|office|workspace/, "briefcase"],
  [/business|karobar|dukaan|shop income|trade income|factory|manufactur/, "store"],
  [/commission|comission|brokerage|tip income|tips received/, "handCoins"],
  [/bonus|bounus|incentive|reward|eidi|cashback|cash back|rebate/, "bonus"],
  [/profit|munafa|return|capital gain|dividend|stock income|share income/, "growth"],
  [/interest income|markup received|yield|crypto|bitcoin|ethereum|usdt|blockchain/, "coins"],
  [/rent income|rental income|property income|real estate income/, "building"],
  [/refund|reimbursement|money back/, "receipt"],
  [/affiliate|referral income|partnership|joint venture/, "handCoins"],
  [/grant|scholarship|education support/, "education"],
  [/donation received|charity received|support received/, "gift"],
  [/investment|mutual fund|stock|shares|portfolio/, "growth"],
  [/farming income|farm income|crop sale|agriculture income/, "growth"],

  [/house rent|home rent|rent|kiraya|mortgage|lease|property|plot|apartment|flat/, "home"],
  [/grocery|groceries|rashan|ration|supermarket|fruit|vegetable|sabzi|milk|dairy|doodh/, "groceries"],
  [/food|dining|restaurant|meal|khana|nashta|lunch|dinner|coffee|chai|tea|cafe|pizza|burger|fast food|takeaway|bakery/, "dining"],
  [/electricity|electric|bijli|power bill|light bill|solar|solar panel/, "power"],
  [/water|pani|water bill/, "water"],
  [/internet|wi-?fi|broadband|fiber|net bill/, "internet"],
  [/mobile|phone|cell|smartphone|sim|load|recharge/, "phone"],
  [/gas bill|sui gas|utility bill|utilities|kitchen|cookware|utensil/, "utilities"],

  [/fuel|petrol|diesel|gasoline|cng/, "fuel"],
  [/bike|bicycle|cycle|motorbike|motorcycle/, "bike"],
  [/bus|coach|public transport/, "bus"],
  [/train|rail|metro|subway/, "train"],
  [/taxi|cab|ride|uber|careem|indrive|rickshaw|riksha|transport|car|gaari|gari|vehicle|parking|toll|motorway/, "car"],
  [/flight|airline|air ticket|plane|travel|trip|tour|vacation|holiday|safar|hotel|motel|hostel|guest house|visa|passport/, "travel"],
  [/ticket|entry pass|event pass/, "ticket"],

  [/medicine|medication|pharmacy|drug|dawa|dawai|tablet/, "medical"],
  [/medical|doctor|health|hospital|clinic|ilaaj|treatment|dental|dentist|eye|glasses|optical|insurance|takaful/, "health"],
  [/school fee|college fee|university fee|tuition|academy|education|school|college|university|course|taleem|training|language/, "education"],
  [/book|books|stationery|notebook|kitab|library|reading/, "books"],

  [/baby|child|children|kid|bach[ae]|daycare|nursery|family/, "children"],
  [/pet|animal|vet|veterinary|dog|puppy|cat|kitten/, "pets"],
  [/cloth|clothing|fashion|shirt|kapr[ae]|dress|shoe|footwear|sneaker|sandal|salon|barber|haircut|spa|grooming|beauty|cosmetic|makeup|skincare|perfume/, "clothing"],
  [/gym|fitness|workout|exercise|sport|cricket|football|tennis|badminton/, "fitness"],
  [/game|gaming|playstation|xbox|movie|cinema|film|netflix|music|spotify|concert|subscription|membership/, "games"],

  [/software|app|saas|domain|hosting|cloud|laptop|computer|desktop|notebook|\bpc\b|electronics|monitor|screen|keyboard|mouse|printer|camera/, "laptop"],
  [/furniture|sofa|bed|table|chair|appliance|washing machine|fridge|refrigerator|oven|cleaning|housekeeping|maid|domestic help/, "home"],
  [/home repair|house repair|plumber|electrician|marammat|car repair|bike repair|mechanic|workshop|maintenance|service|construction|renovation|cement|paint work|mistri|labour|labor|mazdoori|tool|hardware|equipment/, "repair"],
  [/garden|gardening|plant|nursery|lawn|farm|farming|agriculture|seed|fertilizer|crop/, "growth"],
  [/delivery|courier|shipping|freight|parcel|package|packaging|box/, "package"],
  [/shopping|shop|purchase|mall|saman|market|store|retail/, "shopping"],

  [/gift|present|tohfa|birthday|anniversary|party|celebration|wedding|shadi|marriage/, "gift"],
  [/charity|donation|sadqa|sadaqah|khairat|zakat/, "gift"],
  [/tax|income tax|property tax|sales tax|bank fee|bank charge|atm fee|service fee/, "tax"],
  [/loan|credit|debt|qarz|udhar|finance payment|credit card|card payment/, "credit"],
  [/committee|saving committee|bisi|saving|savings|deposit|reserve|emergency fund/, "savings"],
  [/transfer|send money|remittance/, "transfer"],
  [/cash|wallet|atm withdrawal/, "wallet"],
  [/bank|account/, "bank"],
  [/legal|lawyer|advocate|court|security|guard|cctv|alarm/, "bank"],
  [/fee|charge|expense|other expense|misc/, "receipt"],
  [/income|earning|kamai|amdani|other income/, "cash"],
];

export function normalizeCategoryColor(color: string | null | undefined) {
  return color?.trim().toUpperCase() ?? "";
}

export function isValidCategoryColor(
  color: string | null | undefined,
): color is string {
  return typeof color === "string" && HEX_COLOR.test(color.trim());
}

export function isValidCategoryIconKey(
  iconKey: string | null | undefined,
): iconKey is CategoryIconKey {
  if (!iconKey) return false;
  if (iconKey in CATEGORY_ICON_MAP) return true;
  return /^badge:\d+$/.test(iconKey);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeCategoryName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_/\\|+]+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryColorDistanceSq(left: string, right: string) {
  const parse = (value: string) => {
    const color = normalizeCategoryColor(value);
    return [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ] as const;
  };
  const [lr, lg, lb] = parse(left);
  const [rr, rg, rb] = parse(right);
  return (lr - rr) ** 2 + (lg - rg) ** 2 + (lb - rb) ** 2;
}

/** Icons describe meaning; the permanently stored colour is the unique identity. */
export function getSemanticCategoryIconKey(
  name: string,
  type: CategoryKind,
): NamedCategoryIconKey {
  const value = normalizeCategoryName(name);
  if (!value) return type === "income" ? "cash" : "receipt";
  return (
    CATEGORY_ICON_RULES.find(([pattern]) => pattern.test(value))?.[1] ??
    (type === "income" ? "cash" : "receipt")
  );
}

export function getCategoryVisual(
  category: CategoryVisualSource,
): CategoryVisual {
  const seed = hashString(`${category.type}:${category.id}:${category.name}`);
  const color = isValidCategoryColor(category.color)
    ? normalizeCategoryColor(category.color)
    : CATEGORY_VISUAL_COLORS[seed % CATEGORY_VISUAL_COLORS.length];
  const iconKey = isValidCategoryIconKey(category.icon_key)
    ? category.icon_key
    : getSemanticCategoryIconKey(category.name, category.type);

  return { color, iconKey };
}

export function getNextCategoryVisual(
  categories: CategoryVisualSource[],
  name: string,
  type: CategoryKind,
): CategoryVisual {
  const usedColors = categories
    .map((category) => getCategoryVisual(category).color)
    .map(normalizeCategoryColor);
  const usedColorSet = new Set(usedColors);
  const availableColors = CATEGORY_VISUAL_COLORS.filter(
    (candidate) => !usedColorSet.has(normalizeCategoryColor(candidate)),
  );

  const color =
    availableColors.reduce<(typeof CATEGORY_VISUAL_COLORS)[number] | null>(
      (best, candidate) => {
        if (!best || usedColors.length === 0) return candidate;
        const candidateDistance = Math.min(
          ...usedColors.map((used) => categoryColorDistanceSq(candidate, used)),
        );
        const bestDistance = Math.min(
          ...usedColors.map((used) => categoryColorDistanceSq(best, used)),
        );
        return candidateDistance > bestDistance ? candidate : best;
      },
      null,
    ) ??
    CATEGORY_VISUAL_COLORS[
      hashString(`${type}:${name}:${categories.length}`) %
        CATEGORY_VISUAL_COLORS.length
    ];

  return {
    color,
    iconKey: getSemanticCategoryIconKey(name, type),
  };
}

export function getCategoryIconComponent(iconKey: string | null | undefined) {
  if (!iconKey || iconKey.startsWith("badge:")) return Tags;
  return CATEGORY_ICON_MAP[iconKey as NamedCategoryIconKey] ?? Tags;
}

export function CategoryVisualIcon({
  category,
  color,
  iconKey,
  label,
  size = "md",
  className = "",
}: {
  category?: CategoryVisualSource;
  color?: string;
  iconKey?: string | null;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const visual = category
    ? getCategoryVisual(category)
    : {
        color: isValidCategoryColor(color)
          ? normalizeCategoryColor(color)
          : "#475569",
        iconKey: isValidCategoryIconKey(iconKey) ? iconKey : "tags",
      };
  const sizes = {
    xs: { frame: "size-7", icon: 20 },
    sm: { frame: "size-9", icon: 27 },
    md: { frame: "size-11", icon: 33 },
    lg: { frame: "size-12", icon: 38 },
  } as const;
  const selected = sizes[size];
  const accessibleLabel = label ?? category?.name ?? "Category";
  const Icon = getCategoryIconComponent(visual.iconKey);

  return (
    <span
      className={`grid shrink-0 place-items-center ${selected.frame} ${className}`}
      style={{ color: visual.color }}
      aria-label={`${accessibleLabel} category icon`}
    >
      <Icon
        size={selected.icon}
        strokeWidth={2.15}
        absoluteStrokeWidth
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      />
    </span>
  );
}

export function CategoryColorDot({
  category,
  color,
  className = "size-2.5",
}: {
  category?: CategoryVisualSource;
  color?: string | null;
  className?: string;
}) {
  const resolvedColor = category
    ? getCategoryVisual(category).color
    : isValidCategoryColor(color)
      ? normalizeCategoryColor(color)
      : "#475569";

  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: resolvedColor }}
    />
  );
}
