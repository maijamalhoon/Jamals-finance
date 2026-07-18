import {
  Baby,
  Bike,
  Briefcase,
  Camera,
  Car,
  Dumbbell,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Laptop,
  PiggyBank,
  Plane,
  Shield,
  ShoppingBag,
  Smartphone,
  Tablet,
  Target,
  Tv,
  type LucideIcon,
} from "lucide-react";

export type GoalIconValue =
  | "home"
  | "shield"
  | "car"
  | "bike"
  | "plane"
  | "graduation"
  | "heart"
  | "gem"
  | "briefcase"
  | "smartphone"
  | "laptop"
  | "tablet"
  | "camera"
  | "tv"
  | "gamepad"
  | "shopping"
  | "gift"
  | "hammer"
  | "piggybank"
  | "baby"
  | "dumbbell"
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
  { value: "bike", label: "Motorcycle", icon: Bike },
  { value: "plane", label: "Travel", icon: Plane },
  { value: "graduation", label: "Education", icon: GraduationCap },
  { value: "heart", label: "Health", icon: HeartPulse },
  { value: "gem", label: "Wedding", icon: Gem },
  { value: "briefcase", label: "Business", icon: Briefcase },
  { value: "smartphone", label: "Phone", icon: Smartphone },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "camera", label: "Camera", icon: Camera },
  { value: "tv", label: "Television", icon: Tv },
  { value: "gamepad", label: "Gaming", icon: Gamepad2 },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "gift", label: "Gift", icon: Gift },
  { value: "hammer", label: "Renovation", icon: Hammer },
  { value: "piggybank", label: "Savings", icon: PiggyBank },
  { value: "baby", label: "Family", icon: Baby },
  { value: "dumbbell", label: "Fitness", icon: Dumbbell },
  { value: "target", label: "Other", icon: Target },
];

const GOAL_ICON_VALUES = new Set<string>(GOAL_ICONS.map((entry) => entry.value));

const AUTO_ICON_RULES: Array<{
  value: GoalIconValue;
  keywords: readonly string[];
}> = [
  {
    value: "bike",
    keywords: [
      "bike",
      "bikes",
      "motorbike",
      "motorcycle",
      "scooter",
      "honda 125",
      "honda 150",
      "suzuki 150",
      "yamaha",
      "cd 70",
      "cd70",
      "cg 125",
      "cg125",
    ],
  },
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
    ],
  },
  {
    value: "laptop",
    keywords: [
      "laptop",
      "notebook",
      "macbook",
      "computer",
      "desktop",
      "workstation",
      "gaming pc",
      "personal computer",
      "chromebook",
    ],
  },
  {
    value: "tablet",
    keywords: ["tablet", "ipad", "galaxy tab", "surface pro", "kindle"],
  },
  {
    value: "camera",
    keywords: [
      "camera",
      "dslr",
      "mirrorless",
      "gopro",
      "lens",
      "canon",
      "nikon",
      "fujifilm",
    ],
  },
  {
    value: "tv",
    keywords: [
      "television",
      "smart tv",
      "led tv",
      "oled",
      "qled",
      "monitor",
      "projector",
    ],
  },
  {
    value: "gamepad",
    keywords: [
      "gaming",
      "playstation",
      "ps4",
      "ps5",
      "xbox",
      "console",
      "nintendo",
      "steam deck",
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
      "s22",
      "s23",
      "s24",
      "s25",
    ],
  },
  {
    value: "hammer",
    keywords: [
      "renovation",
      "construction",
      "remodel",
      "repair house",
      "home repair",
      "interior",
      "kitchen upgrade",
      "room upgrade",
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
      "honeymoon",
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
      "certification",
      "academy",
    ],
  },
  {
    value: "dumbbell",
    keywords: [
      "fitness",
      "gym",
      "workout",
      "exercise",
      "sports",
      "equipment",
      "treadmill",
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
      "sehat",
      "ilaj",
      "ilaaj",
      "dawa",
      "medicine",
      "dental",
    ],
  },
  {
    value: "gem",
    keywords: [
      "wedding",
      "shadi",
      "shaadi",
      "engagement",
      "ring",
      "jewelry",
      "jewellery",
      "gold set",
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
      "freelance",
      "agency",
    ],
  },
  {
    value: "gift",
    keywords: [
      "gift",
      "present",
      "birthday",
      "anniversary",
      "surprise",
      "eid gift",
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
      "kapray",
      "kapre",
      "wardrobe",
      "sofa",
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
      "emergency fund",
      "backup fund",
    ],
  },
  {
    value: "piggybank",
    keywords: [
      "savings",
      "saving",
      "bachat",
      "saving fund",
      "retirement",
      "future fund",
      "deposit",
      "investment fund",
      "cash reserve",
    ],
  },
  {
    value: "baby",
    keywords: [
      "baby",
      "child",
      "children",
      "family",
      "newborn",
      "kids",
      "kid",
    ],
  },
];

const BASE_HUES: Record<GoalIconValue, number> = {
  home: 150,
  shield: 172,
  car: 198,
  bike: 185,
  plane: 28,
  graduation: 226,
  heart: 350,
  gem: 326,
  briefcase: 42,
  smartphone: 265,
  laptop: 214,
  tablet: 246,
  camera: 14,
  tv: 292,
  gamepad: 278,
  shopping: 305,
  gift: 338,
  hammer: 32,
  piggybank: 136,
  baby: 8,
  dumbbell: 112,
  target: 205,
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
  const hueStep = (hash % 7) - 3;
  const hue = (BASE_HUES[entry.value] + hueStep * 9 + 360) % 360;
  const saturation = 66 + ((hash >>> 4) % 9);
  const lightness = 40 + ((hash >>> 10) % 7);

  return {
    entry,
    label: entry.label,
    accent: `hsl(${hue} ${saturation}% ${lightness}%)`,
  };
}
