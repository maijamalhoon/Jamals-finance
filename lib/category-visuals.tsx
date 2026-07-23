import {
  BadgeDollarSign,
  BadgePercent,
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  ChartCandlestick,
  Building2,
  Bus,
  Car,
  Coffee,
  CircleHelp,
  Clapperboard,
  Cloud,
  Coins,
  CreditCard,
  Droplets,
  Dumbbell,
  FileText,
  Fuel,
  Gamepad2,
  Gift,
  Glasses,
  Hammer,
  HeartHandshake,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  Laptop,
  Lightbulb,
  Music2,
  Package,
  Paintbrush,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  Repeat2,
  Scale,
  Scissors,
  ShieldCheck,
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
  UserRound,
  Utensils,
  Wallet,
  WalletCards,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "@/components/icons/jalvoro/compat";

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
  drink: Coffee,
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
  painting: Paintbrush,
  personal: UserRound,
  savings: PiggyBank,
  travel: Plane,
  receipt: ReceiptText,
  transfer: Repeat2,
  shopping: ShoppingBag,
  groceries: ShoppingBasket,
  phone: Smartphone,
  bonus: Sparkles,
  commission: BadgePercent,
  investment: ChartCandlestick,
  investments: ChartCandlestick,
  bills: FileText,
  rent: KeyRound,
  help: CircleHelp,
  movies: Clapperboard,
  cloud: Cloud,
  optical: Glasses,
  construction: Hammer,
  charity: HeartHandshake,
  music: Music2,
  legal: Scale,
  beauty: Scissors,
  insurance: ShieldCheck,
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
export type CategoryIconKey = NamedCategoryIconKey;

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
const GENERIC_CATEGORY_NAMES = new Set([
  "category",
  "new category",
  "income category",
  "expense category",
  "new income",
  "new expense",
]);

type CategoryIconRule = Readonly<{
  iconKey: NamedCategoryIconKey;
  aliases: readonly string[];
  type?: CategoryKind;
}>;

/**
 * Common category language, spelling variants and Roman-Urdu aliases. Marker
 * icons remain deterministic and fully offline, including for legacy records
 * whose previous icon value was an emoji or numbered badge.
 */
const CATEGORY_ICON_RULES: readonly CategoryIconRule[] = [
  {
    iconKey: "investments",
    aliases: ["investment", "investments", "stock", "stocks", "shares", "portfolio", "mutual fund"],
  },
  {
    iconKey: "bills",
    aliases: ["bill", "bills", "invoice", "monthly bill"],
  },
  {
    iconKey: "rent",
    type: "expense",
    aliases: ["rent", "kiraya", "lease payment"],
  },
  {
    iconKey: "salary",
    aliases: ["salary", "salery", "sallery", "payroll", "wage", "tankhwa", "tankha", "maash"],
  },
  {
    iconKey: "banknote",
    aliases: ["pension", "retirement", "provident", "gratuity", "allowance", "stipend"],
  },
  {
    iconKey: "briefcase",
    aliases: ["freelance", "freelancing", "client work", "gig", "consulting", "consultancy", "office", "workspace"],
  },
  {
    iconKey: "store",
    aliases: ["business", "karobar", "dukaan", "shop income", "trade income", "factory", "manufacturing"],
  },
  {
    iconKey: "commission",
    aliases: ["commission", "comission", "brokerage", "tip income", "affiliate", "referral", "partnership"],
  },
  {
    iconKey: "bonus",
    aliases: ["bonus", "bounus", "incentive", "reward", "eidi", "cashback", "rebate"],
  },
  {
    iconKey: "investment",
    aliases: ["profit", "munafa", "return", "capital gain", "dividend", "investment", "mutual fund", "stock", "shares", "portfolio", "agriculture income"],
  },
  {
    iconKey: "coins",
    aliases: ["interest income", "markup received", "yield", "crypto", "bitcoin", "ethereum", "usdt", "blockchain"],
  },
  {
    iconKey: "building",
    type: "income",
    aliases: ["rent", "rent income", "rental", "rental income", "property income", "real estate income"],
  },
  {
    iconKey: "receipt",
    aliases: ["refund", "reimbursement", "money back"],
  },
  {
    iconKey: "education",
    aliases: ["grant", "scholarship", "education support"],
  },
  {
    iconKey: "gift",
    aliases: ["donation received", "charity received", "support received"],
  },
  {
    iconKey: "help",
    aliases: ["help", "assistance", "support expense", "emergency help"],
  },
  {
    iconKey: "charity",
    aliases: ["charity", "donation", "zakat", "sadqa", "sadaqah", "khairat"],
  },
  {
    iconKey: "insurance",
    aliases: ["insurance", "takaful", "coverage", "protection plan"],
  },
  {
    iconKey: "legal",
    aliases: ["legal", "lawyer", "court", "advocate", "security service"],
  },
  {
    iconKey: "construction",
    aliases: ["construction", "renovation", "labour", "labor", "mistri", "hardware"],
  },
  {
    iconKey: "home",
    aliases: ["house rent", "home rent", "rent", "kiraya", "mortgage", "lease", "property", "plot", "apartment", "flat", "furniture", "appliance", "cleaning", "housekeeping", "maid"],
  },
  {
    iconKey: "groceries",
    aliases: ["grocery", "groceries", "grocries", "grocerries", "grocerirs", "grocerers", "rashan", "ration", "supermarket", "fruit", "vegetable", "sabzi", "milk", "dairy", "doodh"],
  },
  {
    iconKey: "drink",
    aliases: ["drink", "drinks", "beverage", "juice", "soft drink", "water bottle", "coffee", "chai", "tea", "cafe"],
  },
  {
    iconKey: "dining",
    aliases: ["food", "dining", "restaurant", "meal", "khana", "nashta", "breakfast", "lunch", "dinner", "pizza", "burger", "takeaway", "bakery"],
  },
  {
    iconKey: "power",
    aliases: ["electricity", "electric", "bijli", "power bill", "light bill", "solar"],
  },
  { iconKey: "water", aliases: ["water", "pani", "water bill"] },
  {
    iconKey: "internet",
    aliases: ["internet", "wifi", "wi fi", "broadband", "fiber", "net bill"],
  },
  {
    iconKey: "phone",
    aliases: ["mobile", "phone", "cell", "smartphone", "sim", "load", "recharge"],
  },
  {
    iconKey: "utilities",
    aliases: ["gas bill", "sui gas", "utility bill", "utilities", "kitchen", "cookware"],
  },
  { iconKey: "fuel", aliases: ["fuel", "petrol", "diesel", "gasoline", "cng"] },
  { iconKey: "bike", aliases: ["bike", "bicycle", "cycle", "motorbike", "motorcycle"] },
  { iconKey: "bus", aliases: ["bus", "coach", "public transport"] },
  { iconKey: "train", aliases: ["train", "rail", "metro", "subway"] },
  {
    iconKey: "car",
    aliases: ["taxi", "cab", "ride", "uber", "careem", "indrive", "rickshaw", "transport", "car", "gaari", "gari", "vehicle", "parking", "toll"],
  },
  {
    iconKey: "travel",
    aliases: ["flight", "airline", "air ticket", "plane", "travel", "trip", "tour", "vacation", "holiday", "safar", "hotel", "visa", "passport"],
  },
  { iconKey: "ticket", aliases: ["ticket", "entry pass", "event pass"] },
  {
    iconKey: "medical",
    aliases: ["medicine", "medication", "pharmacy", "drug", "dawa", "dawai", "tablet"],
  },
  {
    iconKey: "optical",
    aliases: ["dental", "dentist", "eye", "glasses", "optical"],
  },
  {
    iconKey: "insurance",
    aliases: ["insurance", "takaful", "coverage", "protection plan"],
  },
  {
    iconKey: "health",
    aliases: ["medical", "doctor", "health", "hospital", "clinic", "ilaaj", "treatment"],
  },
  {
    iconKey: "education",
    aliases: ["school fee", "college fee", "university fee", "tuition", "academy", "education", "school", "college", "university", "course", "taleem", "training"],
  },
  {
    iconKey: "books",
    aliases: ["book", "books", "stationery", "notebook", "kitab", "library", "reading"],
  },
  {
    iconKey: "children",
    aliases: ["baby", "child", "children", "kid", "bacha", "bachay", "daycare", "nursery", "family"],
  },
  {
    iconKey: "pets",
    aliases: ["pet", "pets", "animal", "vet", "veterinary", "dog", "puppy", "cat", "kitten"],
  },
  {
    iconKey: "personal",
    aliases: ["personal", "personal care", "self care", "selfcare", "pocket money", "personal spending", "daily use"],
  },
  {
    iconKey: "beauty",
    aliases: ["salon", "barber", "haircut", "beauty", "cosmetic", "makeup", "skincare", "perfume"],
  },
  {
    iconKey: "clothing",
    aliases: ["cloth", "clothing", "fashion", "shirt", "kapra", "kapray", "dress", "shoe", "footwear"],
  },
  {
    iconKey: "fitness",
    aliases: ["gym", "fitness", "workout", "exercise", "sport", "cricket", "football", "tennis", "badminton"],
  },
  {
    iconKey: "movies",
    aliases: ["movie", "cinema", "film", "netflix", "entertainment"],
  },
  {
    iconKey: "music",
    aliases: ["music", "spotify", "concert", "audio", "subscription", "membership"],
  },
  {
    iconKey: "games",
    aliases: ["game", "gaming", "playstation", "xbox"],
  },
  {
    iconKey: "cloud",
    aliases: ["software", "app", "saas", "domain", "hosting", "cloud"],
  },
  {
    iconKey: "laptop",
    aliases: ["laptop", "computer", "desktop", "pc", "electronics", "monitor", "keyboard", "mouse", "printer", "camera"],
  },
  {
    iconKey: "painting",
    aliases: ["paint", "painting", "paint work", "wall paint", "painter", "decoration"],
  },
  {
    iconKey: "repair",
    aliases: ["home repair", "house repair", "plumber", "electrician", "marammat", "car repair", "bike repair", "mechanic", "workshop", "maintenance", "maintainance", "maintanance", "service", "construction", "renovation", "cement", "mistri", "labour", "labor", "mazdoori", "tool", "hardware", "equipment"],
  },
  {
    iconKey: "growth",
    aliases: ["garden", "gardening", "plant", "lawn", "farm", "farming", "agriculture", "seed", "fertilizer", "crop"],
  },
  {
    iconKey: "package",
    aliases: ["delivery", "courier", "shipping", "freight", "parcel", "package", "packaging", "box"],
  },
  {
    iconKey: "shopping",
    aliases: ["shopping", "shop", "purchase", "mall", "saman", "market", "store", "retail"],
  },
  {
    iconKey: "gift",
    aliases: ["gift", "present", "tohfa", "birthday", "anniversary", "party", "celebration", "wedding", "shadi", "marriage", "charity", "donation", "sadqa", "sadaqah", "khairat", "zakat"],
  },
  {
    iconKey: "tax",
    aliases: ["tax", "income tax", "property tax", "sales tax", "bank fee", "bank charge", "atm fee", "service fee"],
  },
  {
    iconKey: "credit",
    aliases: ["loan", "credit", "debt", "qarz", "udhar", "finance payment", "credit card", "card payment"],
  },
  {
    iconKey: "savings",
    aliases: ["committee", "saving committee", "bisi", "saving", "savings", "deposit", "reserve", "emergency fund"],
  },
  { iconKey: "transfer", aliases: ["transfer", "send money", "remittance"] },
  { iconKey: "wallet", aliases: ["cash", "wallet", "atm withdrawal"] },
  {
    iconKey: "bank",
    aliases: ["bank", "account", "legal", "lawyer", "advocate", "court", "security", "guard", "cctv", "alarm"],
  },
  {
    iconKey: "receipt",
    aliases: ["fee", "charge", "expense", "other expense", "misc", "miscellaneous"],
  },
  {
    iconKey: "cash",
    aliases: ["income", "earning", "earnings", "kamai", "amdani", "other income"],
  },
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
  return Boolean(iconKey && iconKey in CATEGORY_ICON_MAP);
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

const NORMALIZED_CATEGORY_ICON_RULES = CATEGORY_ICON_RULES.map((rule) => ({
  ...rule,
  aliases: rule.aliases.map(normalizeCategoryName),
}));

function containsWholePhrase(value: string, phrase: string) {
  return (
    value === phrase ||
    value.startsWith(`${phrase} `) ||
    value.endsWith(` ${phrase}`) ||
    value.includes(` ${phrase} `)
  );
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function findCategoryIconRule(value: string, type: CategoryKind) {
  const directMatch = NORMALIZED_CATEGORY_ICON_RULES.find(
    (rule) =>
      (!rule.type || rule.type === type) &&
      rule.aliases.some((alias) => containsWholePhrase(value, alias)),
  );
  if (directMatch) return directMatch;

  if (!value.includes(" ") && value.length >= 4) {
    const prefixMatch = NORMALIZED_CATEGORY_ICON_RULES.find(
      (rule) =>
        (!rule.type || rule.type === type) &&
        rule.aliases.some(
          (alias) =>
            !alias.includes(" ") &&
            alias.length >= value.length &&
            alias.startsWith(value),
        ),
    );
    if (prefixMatch) return prefixMatch;
  }

  if (!value.includes(" ") && value.length >= 5) {
    let best:
      | { rule: (typeof NORMALIZED_CATEGORY_ICON_RULES)[number]; distance: number }
      | undefined;

    for (const rule of NORMALIZED_CATEGORY_ICON_RULES) {
      if (rule.type && rule.type !== type) continue;
      for (const alias of rule.aliases) {
        if (alias.includes(" ") || alias.length < 5) continue;
        const maximumDistance = Math.max(value.length, alias.length) >= 9 ? 2 : 1;
        if (Math.abs(value.length - alias.length) > maximumDistance) continue;
        const distance = levenshteinDistance(value, alias);
        if (distance > maximumDistance) continue;
        if (!best || distance < best.distance) best = { rule, distance };
      }
    }

    if (best) return best.rule;
  }

  return undefined;
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

/** Icons describe meaning; the permanently stored colour remains the identity. */
export function getSemanticCategoryIconKey(
  name: string,
  type: CategoryKind,
): NamedCategoryIconKey {
  const value = normalizeCategoryName(name);
  if (!value || GENERIC_CATEGORY_NAMES.has(value)) return "tags";
  return findCategoryIconRule(value, type)?.iconKey ?? "tags";
}

export function getCategoryVisual(
  category: CategoryVisualSource,
): CategoryVisual {
  const seed = hashString(`${category.type}:${category.id}:${category.name}`);
  const color = isValidCategoryColor(category.color)
    ? normalizeCategoryColor(category.color)
    : CATEGORY_VISUAL_COLORS[seed % CATEGORY_VISUAL_COLORS.length];

  // Legacy emoji/badge values are deliberately ignored for display. This
  // changes only the icon presentation; category IDs, names, colours and every
  // linked financial record remain untouched.
  const semanticIconKey = getSemanticCategoryIconKey(
    category.name,
    category.type,
  );
  const iconKey =
    isValidCategoryIconKey(category.icon_key) && category.icon_key !== "tags"
      ? category.icon_key
      : semanticIconKey;

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
  if (!isValidCategoryIconKey(iconKey)) return Tags;
  return CATEGORY_ICON_MAP[iconKey];
}

function MarkerDrawIcon({
  Icon,
  size,
}: {
  Icon: LucideIcon;
  size: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <Icon
        size={size}
        strokeWidth={3.4}
        absoluteStrokeWidth
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute opacity-[0.18] [transform:translate(0.65px,0.45px)_rotate(-0.8deg)]"
      />
      <Icon
        size={size}
        strokeWidth={2.15}
        absoluteStrokeWidth
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative drop-shadow-[0_0.5px_0_currentColor]"
      />
      <span className="pointer-events-none absolute inset-x-[18%] bottom-[7%] h-px rotate-[-2deg] rounded-full bg-current opacity-15" />
    </span>
  );
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
    xs: { frame: "size-8", icon: 21 },
    sm: { frame: "size-10", icon: 27 },
    md: { frame: "size-11", icon: 31 },
    lg: { frame: "size-12", icon: 36 },
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
      <MarkerDrawIcon Icon={Icon} size={selected.icon} />
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
