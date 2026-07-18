import {
  Baby,
  Bike,
  Briefcase,
  Building2,
  Camera,
  Car,
  Cpu,
  Dumbbell,
  Flag,
  Gamepad2,
  Gauge,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  Headphones,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  Laptop,
  Monitor,
  Paintbrush,
  PiggyBank,
  Plane,
  Route,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tablet,
  Target,
  Tv,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type GoalIconValue =
  | "home"
  | "building"
  | "landmark"
  | "paintbrush"
  | "shield"
  | "car"
  | "key"
  | "gauge"
  | "route"
  | "bike"
  | "plane"
  | "graduation"
  | "heart"
  | "gem"
  | "briefcase"
  | "smartphone"
  | "laptop"
  | "monitor"
  | "cpu"
  | "headphones"
  | "tablet"
  | "camera"
  | "tv"
  | "gamepad"
  | "shopping"
  | "gift"
  | "hammer"
  | "piggybank"
  | "wallet"
  | "baby"
  | "dumbbell"
  | "flag"
  | "sparkles"
  | "target";

export type GoalIconEntry = {
  value: GoalIconValue;
  label: string;
  icon: LucideIcon;
};

export type GoalPresentationInput = {
  id?: string | null;
  name: string;
  icon?: string | null;
};

export type GoalPresentationAssignment = {
  iconValue: GoalIconValue;
  label: string;
  accent: string;
};

export const GOAL_ICONS: GoalIconEntry[] = [
  { value: "home", label: "House", icon: Home },
  { value: "building", label: "House", icon: Building2 },
  { value: "landmark", label: "Property", icon: Landmark },
  { value: "paintbrush", label: "Renovation", icon: Paintbrush },
  { value: "shield", label: "Emergency", icon: Shield },
  { value: "car", label: "Car", icon: Car },
  { value: "key", label: "Vehicle", icon: KeyRound },
  { value: "gauge", label: "Vehicle", icon: Gauge },
  { value: "route", label: "Vehicle", icon: Route },
  { value: "bike", label: "Motorcycle", icon: Bike },
  { value: "plane", label: "Travel", icon: Plane },
  { value: "graduation", label: "Education", icon: GraduationCap },
  { value: "heart", label: "Health", icon: HeartPulse },
  { value: "gem", label: "Wedding", icon: Gem },
  { value: "briefcase", label: "Business", icon: Briefcase },
  { value: "smartphone", label: "Phone", icon: Smartphone },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "monitor", label: "Computer", icon: Monitor },
  { value: "cpu", label: "Computer", icon: Cpu },
  { value: "headphones", label: "Electronics", icon: Headphones },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "camera", label: "Camera", icon: Camera },
  { value: "tv", label: "Television", icon: Tv },
  { value: "gamepad", label: "Gaming", icon: Gamepad2 },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "gift", label: "Gift", icon: Gift },
  { value: "hammer", label: "Renovation", icon: Hammer },
  { value: "piggybank", label: "Savings", icon: PiggyBank },
  { value: "wallet", label: "Savings", icon: WalletCards },
  { value: "baby", label: "Family", icon: Baby },
  { value: "dumbbell", label: "Fitness", icon: Dumbbell },
  { value: "flag", label: "Other", icon: Flag },
  { value: "sparkles", label: "Other", icon: Sparkles },
  { value: "target", label: "Other", icon: Target },
];

const GOAL_ICON_VALUES = new Set<string>(GOAL_ICONS.map((entry) => entry.value));
const GOAL_ICON_BY_VALUE = new Map(GOAL_ICONS.map((entry) => [entry.value, entry]));

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
      "dodge",
      "hellcat",
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
      "bungalow",
      "banglow",
      "bangla",
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

const RELATED_ICON_CHOICES: Partial<Record<GoalIconValue, readonly GoalIconValue[]>> = {
  home: ["home", "building", "landmark", "paintbrush"],
  hammer: ["hammer", "paintbrush", "building", "home"],
  shield: ["shield", "wallet", "piggybank", "landmark"],
  piggybank: ["piggybank", "wallet", "shield", "landmark"],
  car: ["car", "key", "gauge", "route"],
  bike: ["bike", "route", "gauge", "key"],
  smartphone: ["smartphone", "headphones", "camera", "tablet"],
  laptop: ["laptop", "monitor", "cpu", "tablet"],
  tablet: ["tablet", "monitor", "laptop", "smartphone"],
  camera: ["camera", "headphones", "smartphone", "tv"],
  tv: ["tv", "monitor", "headphones", "gamepad"],
  gamepad: ["gamepad", "headphones", "tv", "monitor"],
  target: ["target", "flag", "sparkles", "wallet"],
};

const DISTINCT_ACCENTS = Array.from({ length: 48 }, (_, index) => {
  const hue = (17 + index * 137) % 360;
  const saturation = 68 + (index % 3) * 4;
  const lightness = 41 + (index % 2) * 5;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
});

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

function getGoalIconEntryByValue(value: GoalIconValue) {
  return GOAL_ICON_BY_VALUE.get(value) ?? GOAL_ICONS[GOAL_ICONS.length - 1];
}

function getGoalIdentity(goal: GoalPresentationInput, index: number) {
  const id = goal.id?.trim();
  if (id) return id;
  return `${normalizeGoalText(goal.name) || "goal"}:${goal.icon || "auto"}:${index}`;
}

function getIconCandidates(preferred: GoalIconValue) {
  const candidates = RELATED_ICON_CHOICES[preferred] ?? [preferred];
  return [...new Set([...candidates, ...GOAL_ICONS.map((entry) => entry.value)])];
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
  return getGoalIconEntryByValue(inferGoalIconValue(goal.name, goal.icon));
}

export function getDistinctGoalPresentationAssignments(
  goals: readonly GoalPresentationInput[],
): GoalPresentationAssignment[] {
  const indexedGoals = goals.map((goal, index) => ({
    goal,
    index,
    identity: getGoalIdentity(goal, index),
  }));
  const orderedGoals = [...indexedGoals].sort((left, right) =>
    left.identity.localeCompare(right.identity),
  );
  const usedIcons = new Set<GoalIconValue>();
  const usedAccents = new Set<string>();
  const assignments: GoalPresentationAssignment[] = new Array(goals.length);

  orderedGoals.forEach(({ goal, index, identity }) => {
    const preferredValue = inferGoalIconValue(goal.name, goal.icon);
    const preferredEntry = getGoalIconEntryByValue(preferredValue);
    const iconCandidates = getIconCandidates(preferredValue);
    const iconValue =
      iconCandidates.find((candidate) => !usedIcons.has(candidate)) ??
      iconCandidates[hashGoalSeed(identity) % iconCandidates.length];
    usedIcons.add(iconValue);

    const colorHash = hashGoalSeed(`${identity}:${preferredValue}`);
    const preferredColorIndex = colorHash % DISTINCT_ACCENTS.length;
    let accent = DISTINCT_ACCENTS[preferredColorIndex];
    for (let offset = 0; offset < DISTINCT_ACCENTS.length; offset += 1) {
      const candidate = DISTINCT_ACCENTS[(preferredColorIndex + offset) % DISTINCT_ACCENTS.length];
      if (!usedAccents.has(candidate)) {
        accent = candidate;
        break;
      }
    }
    usedAccents.add(accent);

    assignments[index] = {
      iconValue,
      label: preferredEntry.label,
      accent,
    };
  });

  return assignments;
}

export function getGoalPresentation(
  goal: GoalPresentationInput,
  assignment?: GoalPresentationAssignment,
) {
  const resolvedAssignment =
    assignment ?? getDistinctGoalPresentationAssignments([goal])[0];
  const entry = getGoalIconEntryByValue(resolvedAssignment.iconValue);

  return {
    entry,
    label: resolvedAssignment.label,
    accent: resolvedAssignment.accent,
  };
}
