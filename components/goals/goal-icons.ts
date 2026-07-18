import {
  Briefcase,
  Car,
  GraduationCap,
  Heart,
  Home,
  Plane,
  Shield,
  ShoppingBag,
  Smartphone,
  Target,
  type LucideIcon,
} from "lucide-react";

export type GoalIconValue =
  | "home"
  | "shield"
  | "car"
  | "plane"
  | "graduation"
  | "heart"
  | "briefcase"
  | "smartphone"
  | "shopping"
  | "target";

export type GoalIconEntry = {
  value: GoalIconValue;
  label: string;
  icon: LucideIcon;
};

export type GoalPresentationInput = {
  name: string;
  icon?: string | null;
};

export const GOAL_ICONS: GoalIconEntry[] = [
  { value: "home", label: "House", icon: Home },
  { value: "shield", label: "Emergency", icon: Shield },
  { value: "car", label: "Car", icon: Car },
  { value: "plane", label: "Travel", icon: Plane },
  { value: "graduation", label: "Education", icon: GraduationCap },
  { value: "heart", label: "Health", icon: Heart },
  { value: "briefcase", label: "Business", icon: Briefcase },
  { value: "smartphone", label: "Electronics", icon: Smartphone },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "target", label: "Other", icon: Target },
];

const GOAL_ICON_VALUES = new Set<string>(GOAL_ICONS.map((entry) => entry.value));

const AUTO_ICON_RULES: Array<{
  value: GoalIconValue;
  keywords: readonly string[];
}> = [
  {
    value: "car",
    keywords: [
      "car",
      "cars",
      "vehicle",
      "auto",
      "gari",
      "gaari",
      "toyota",
      "suzuki",
      "honda",
      "hyundai",
      "kia",
      "nissan",
      "tesla",
      "bmw",
      "mercedes",
      "audi",
      "lexus",
      "ford",
      "chevrolet",
      "porsche",
      "ferrari",
      "lamborghini",
      "civic",
      "corolla",
      "mark x",
      "markx",
      "alto",
      "swift",
      "wagon r",
      "fortuner",
      "hilux",
      "vitz",
      "prius",
      "cultus",
      "mehran",
      "bike",
      "motorcycle",
    ],
  },
  {
    value: "smartphone",
    keywords: [
      "electronics",
      "electronic",
      "phone",
      "mobile",
      "smartphone",
      "samsung",
      "iphone",
      "pixel",
      "oneplus",
      "xiaomi",
      "oppo",
      "vivo",
      "realme",
      "huawei",
      "laptop",
      "computer",
      "pc",
      "tablet",
      "ipad",
      "macbook",
      "camera",
      "television",
      "tv",
      "playstation",
      "xbox",
      "console",
      "s22",
      "s23",
      "s24",
      "s25",
    ],
  },
  {
    value: "home",
    keywords: [
      "home",
      "house",
      "ghar",
      "makan",
      "makaan",
      "apartment",
      "flat",
      "property",
      "plot",
      "renovation",
      "construction",
    ],
  },
  {
    value: "plane",
    keywords: [
      "travel",
      "trip",
      "tour",
      "vacation",
      "holiday",
      "flight",
      "safar",
      "umrah",
      "hajj",
    ],
  },
  {
    value: "graduation",
    keywords: [
      "education",
      "school",
      "college",
      "university",
      "degree",
      "course",
      "tuition",
      "study",
      "fees",
      "taleem",
      "parhai",
      "padhai",
    ],
  },
  {
    value: "heart",
    keywords: [
      "health",
      "medical",
      "hospital",
      "surgery",
      "treatment",
      "fitness",
      "sehat",
      "ilaj",
      "ilaaj",
      "dawa",
      "wedding",
      "shadi",
    ],
  },
  {
    value: "briefcase",
    keywords: [
      "business",
      "startup",
      "office",
      "company",
      "karobar",
      "kaarobar",
      "dukan",
      "shop setup",
    ],
  },
  {
    value: "shopping",
    keywords: [
      "shopping",
      "clothes",
      "fashion",
      "furniture",
      "appliance",
      "gift",
      "kapray",
      "kapre",
    ],
  },
  {
    value: "shield",
    keywords: [
      "emergency",
      "rainy day",
      "backup",
      "safety fund",
      "reserve",
      "bachat",
      "saving fund",
    ],
  },
];

const BASE_HUES: Record<GoalIconValue, number> = {
  home: 150,
  shield: 170,
  car: 198,
  plane: 28,
  graduation: 225,
  heart: 350,
  briefcase: 42,
  smartphone: 265,
  shopping: 305,
  target: 215,
};

function normalizeGoalText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsKeyword(normalizedText: string, keyword: string) {
  const normalizedKeyword = normalizeGoalText(keyword);
  if (!normalizedKeyword) return false;
  return ` ${normalizedText} `.includes(` ${normalizedKeyword} `);
}

function hashGoalSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function inferGoalIconValue(
  name: string,
  fallbackIcon?: string | null,
): GoalIconValue {
  const normalizedName = normalizeGoalText(name);
  const match = AUTO_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => containsKeyword(normalizedName, keyword)),
  );

  if (match) return match.value;
  if (fallbackIcon && GOAL_ICON_VALUES.has(fallbackIcon)) {
    return fallbackIcon as GoalIconValue;
  }
  return "target";
}

export function getGoalIconEntry(goal: GoalPresentationInput): GoalIconEntry {
  const value = inferGoalIconValue(goal.name, goal.icon);
  return GOAL_ICONS.find((entry) => entry.value === value) ?? GOAL_ICONS[GOAL_ICONS.length - 1];
}

export function getGoalPresentation(goal: GoalPresentationInput) {
  const entry = getGoalIconEntry(goal);
  const seed = `${normalizeGoalText(goal.name) || "goal"}:${entry.value}`;
  const hash = hashGoalSeed(seed);
  const hueOffset = (hash % 49) - 24;
  const hue = (BASE_HUES[entry.value] + hueOffset + 360) % 360;
  const saturation = 64 + (hash % 9);
  const lightness = 40 + ((hash >>> 8) % 6);

  return {
    entry,
    label: entry.label,
    accent: `hsl(${hue} ${saturation}% ${lightness}%)`,
  };
}
