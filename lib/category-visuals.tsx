import type { CSSProperties } from "react";
import {
  BadgeDollarSign,
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coins,
  CreditCard,
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
  laptop: Laptop,
  utilities: Lightbulb,
  package: Package,
  savings: PiggyBank,
  travel: Plane,
  receipt: ReceiptText,
  transfer: Repeat2,
  shopping: ShoppingBag,
  phone: Smartphone,
  bonus: Sparkles,
  store: Store,
  ticket: Ticket,
  train: TrainFront,
  growth: TrendingUp,
  dining: Utensils,
  wallet: WalletCards,
  repair: Wrench,
  power: Zap,
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

export function getSemanticCategoryIconKey(
  name: string,
  type: CategoryKind,
): NamedCategoryIconKey {
  const value = name.trim().toLowerCase();
  const rules: Array<[RegExp, NamedCategoryIconKey]> = [
    [/salary|payroll|wage/, "salary"],
    [/freelance|business|work|commission/, "briefcase"],
    [/saving|deposit|reserve/, "savings"],
    [/investment|return|dividend|profit|interest/, "growth"],
    [/bonus|reward|tip/, "bonus"],
    [/rent|home|house|mortgage/, "home"],
    [/food|dining|restaurant|meal|grocery/, "dining"],
    [/fuel|petrol|gas/, "fuel"],
    [/transport|ride|taxi|car|vehicle/, "car"],
    [/bus/, "bus"],
    [/train|rail/, "train"],
    [/shopping|shop|purchase/, "shopping"],
    [/bill|utility|electric|water|internet/, "utilities"],
    [/phone|mobile/, "phone"],
    [/medical|doctor|medicine|health/, "medical"],
    [/school|education|course|tuition|book/, "education"],
    [/travel|flight|vacation/, "travel"],
    [/gift|donation|charity/, "gift"],
    [/repair|maintenance|service/, "repair"],
    [/pet|animal/, "pets"],
    [/game|entertainment/, "games"],
    [/gym|fitness|sport/, "fitness"],
    [/baby|child|kid|family/, "children"],
    [/cloth|fashion|shirt/, "clothing"],
    [/bank|account/, "bank"],
    [/transfer/, "transfer"],
    [/loan|credit|debt/, "credit"],
    [/cash|wallet/, "wallet"],
  ];

  return rules.find(([pattern]) => pattern.test(value))?.[1] ??
    (type === "income" ? "cash" : "receipt");
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
  const usedColors = new Set(
    categories
      .map((category) => getCategoryVisual(category).color)
      .map(normalizeCategoryColor),
  );
  const usedIcons = new Set(
    categories.map((category) => getCategoryVisual(category).iconKey),
  );

  const color =
    CATEGORY_VISUAL_COLORS.find(
      (candidate) => !usedColors.has(normalizeCategoryColor(candidate)),
    ) ??
    CATEGORY_VISUAL_COLORS[
      hashString(`${type}:${name}:${categories.length}`) %
        CATEGORY_VISUAL_COLORS.length
    ];

  const semantic = getSemanticCategoryIconKey(name, type);
  const iconKey = !usedIcons.has(semantic)
    ? semantic
    : CATEGORY_ICON_KEYS.find((candidate) => !usedIcons.has(candidate)) ??
      (`badge:${categories.length + 1}` as const);

  return { color, iconKey };
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
        color: isValidCategoryColor(color) ? normalizeCategoryColor(color) : "#475569",
        iconKey: isValidCategoryIconKey(iconKey) ? iconKey : "tags",
      };
  const sizes = {
    xs: { frame: "size-7 rounded-[10px]", icon: 13 },
    sm: { frame: "size-9 rounded-xl", icon: 16 },
    md: { frame: "size-11 rounded-[15px]", icon: 19 },
    lg: { frame: "size-12 rounded-2xl", icon: 21 },
  } as const;
  const selected = sizes[size];
  const accessibleLabel = label ?? category?.name ?? "Category";
  const style = {
    backgroundColor: visual.color,
    boxShadow:
      "inset 0 1px 0 color-mix(in srgb, white 24%, transparent), 0 7px 18px color-mix(in srgb, var(--text-primary) 8%, transparent)",
  } satisfies CSSProperties;
  const Icon = getCategoryIconComponent(visual.iconKey);

  return (
    <span
      className={`grid shrink-0 place-items-center text-white ${selected.frame} ${className}`}
      style={style}
      aria-label={`${accessibleLabel} category icon`}
    >
      <Icon size={selected.icon} strokeWidth={2.2} aria-hidden="true" />
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
