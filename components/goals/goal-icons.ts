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
  { value: "route", label: "Transport", icon: Route },
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
  { value: "wallet", label: "Money", icon: WalletCards },
  { value: "baby", label: "Family", icon: Baby },
  { value: "dumbbell", label: "Fitness", icon: Dumbbell },
  { value: "flag", label: "Other", icon: Flag },
  { value: "sparkles", label: "Dream", icon: Sparkles },
  { value: "target", label: "Other", icon: Target },
];

const GOAL_ICON_VALUES = new Set<string>(GOAL_ICONS.map((entry) => entry.value));
const GOAL_ICON_BY_VALUE = new Map(GOAL_ICONS.map((entry) => [entry.value, entry]));
const GENERIC_ICON_CHOICES = ["target", "flag", "sparkles"] as const;
const GENERIC_ICON_VALUES = new Set<GoalIconValue>(GENERIC_ICON_CHOICES);

type AutoIconRule = {
  value: GoalIconValue;
  priority: number;
  keywords: readonly string[];
};

const AUTO_ICON_RULES: readonly AutoIconRule[] = [
  {
    value: "bike",
    priority: 55,
    keywords: [
      "bike", "bikes", "motorbike", "motorcycle", "scooter", "vespa",
      "superbike", "hayabusa", "ducati", "kawasaki", "harley", "yamaha",
      "honda 125", "honda 150", "suzuki 150", "cd 70", "cd70", "cg 125",
      "cg125", "r15",
    ],
  },
  {
    value: "car",
    priority: 50,
    keywords: [
      "car", "cars", "vehicle", "auto", "automobile", "sedan", "hatchback",
      "suv", "pickup", "sports car", "supercar", "gari", "gaari", "toyota",
      "suzuki", "honda", "hyundai", "kia", "nissan", "tesla", "bmw",
      "mercedes", "mercedes benz", "audi", "lexus", "ford", "chevrolet",
      "dodge", "hellcat", "porsche", "ferrari", "lamborghini", "bugatti",
      "bentley", "mclaren", "maserati", "aston martin", "rolls royce",
      "volkswagen", "mazda", "subaru", "jeep", "land rover", "range rover",
      "changan", "proton", "byd", "mg car", "civic", "corolla", "mark x",
      "markx", "alto", "swift", "wagon r", "fortuner", "hilux", "vitz",
      "prius", "cultus", "mehran", "city car", "car down payment",
      "vehicle down payment",
    ],
  },
  {
    value: "plane",
    priority: 48,
    keywords: [
      "jet", "private jet", "airplane", "aeroplane", "aircraft", "aviation",
      "airline", "flight", "air ticket", "plane ticket", "travel", "trip",
      "tour", "vacation", "holiday", "international trip", "foreign trip",
      "world tour", "safar", "umrah", "hajj", "honeymoon",
    ],
  },
  {
    value: "route",
    priority: 32,
    keywords: [
      "transport", "transportation", "commute", "bus", "coach", "train",
      "metro", "railway", "ship", "boat", "yacht", "cruise", "rickshaw",
      "taxi", "delivery van", "truck",
    ],
  },
  {
    value: "laptop",
    priority: 58,
    keywords: [
      "laptop", "notebook", "macbook", "macbook air", "macbook pro",
      "chromebook", "ultrabook", "gaming laptop", "work laptop", "dell laptop",
      "hp laptop", "lenovo laptop", "asus laptop", "acer laptop",
    ],
  },
  {
    value: "monitor",
    priority: 47,
    keywords: [
      "monitor", "computer monitor", "gaming monitor", "display",
      "desktop screen", "computer screen", "dual monitor",
    ],
  },
  {
    value: "cpu",
    priority: 45,
    keywords: [
      "computer", "desktop", "workstation", "personal computer", "gaming pc",
      "pc build", "desktop pc", "processor", "cpu", "gpu", "graphics card",
      "motherboard",
    ],
  },
  {
    value: "tablet",
    priority: 52,
    keywords: [
      "tablet", "ipad", "ipad pro", "galaxy tab", "surface pro", "kindle",
      "drawing tablet",
    ],
  },
  {
    value: "camera",
    priority: 50,
    keywords: [
      "camera", "dslr", "mirrorless", "gopro", "lens", "canon", "nikon",
      "fujifilm", "sony camera", "photography", "video camera",
    ],
  },
  {
    value: "tv",
    priority: 42,
    keywords: [
      "television", "smart tv", "led tv", "oled", "qled", "projector",
      "home theater", "home theatre",
    ],
  },
  {
    value: "gamepad",
    priority: 40,
    keywords: [
      "gaming console", "playstation", "ps4", "ps5", "xbox", "console",
      "nintendo", "steam deck", "gaming setup", "game setup", "video games",
    ],
  },
  {
    value: "smartphone",
    priority: 48,
    keywords: [
      "phone", "mobile", "smartphone", "cellphone", "iphone", "samsung phone",
      "galaxy phone", "pixel phone", "oneplus", "xiaomi", "oppo", "vivo",
      "realme", "huawei phone", "s22", "s23", "s24", "s25",
    ],
  },
  {
    value: "headphones",
    priority: 38,
    keywords: [
      "headphones", "headset", "earbuds", "earphones", "airpods", "speaker",
      "sound system", "music system", "audio system", "microphone", "mic",
    ],
  },
  {
    value: "hammer",
    priority: 52,
    keywords: [
      "home renovation", "house renovation", "renovation", "construction",
      "remodel", "repair house", "home repair", "house repair",
      "kitchen upgrade", "room upgrade", "roof repair", "building work",
    ],
  },
  {
    value: "paintbrush",
    priority: 46,
    keywords: [
      "interior", "interior design", "home decor", "house decor", "decoration",
      "paint house", "painting", "wallpaper", "room makeover",
    ],
  },
  {
    value: "home",
    priority: 44,
    keywords: [
      "home", "house", "ghar", "makan", "makaan", "bungalow", "banglow",
      "bangla", "villa", "farmhouse", "dream house", "new house", "home loan",
      "house down payment", "home down payment",
    ],
  },
  {
    value: "building",
    priority: 42,
    keywords: [
      "apartment", "flat", "condo", "penthouse", "plaza", "commercial building",
      "office building", "building", "shop building",
    ],
  },
  {
    value: "landmark",
    priority: 40,
    keywords: [
      "property", "plot", "land", "real estate", "zameen", "commercial property",
      "shop property", "office property",
    ],
  },
  {
    value: "graduation",
    priority: 42,
    keywords: [
      "education", "school", "college", "university", "degree", "course",
      "tuition", "study", "school fees", "college fees", "university fees",
      "taleem", "parhai", "padhai", "certification", "academy", "exam", "books",
    ],
  },
  {
    value: "dumbbell",
    priority: 40,
    keywords: [
      "fitness", "gym", "workout", "exercise", "sports equipment", "treadmill",
      "home gym", "weight loss", "bodybuilding",
    ],
  },
  {
    value: "heart",
    priority: 46,
    keywords: [
      "health", "medical", "hospital", "surgery", "treatment", "sehat", "ilaj",
      "ilaaj", "dawa", "medicine", "dental", "doctor", "therapy", "healthcare",
    ],
  },
  {
    value: "gem",
    priority: 42,
    keywords: [
      "wedding", "wedding fund", "wedding expenses", "shadi", "shaadi",
      "engagement", "engagement ring", "ring", "jewelry", "jewellery",
      "gold set", "bridal", "dowry", "jahez",
    ],
  },
  {
    value: "briefcase",
    priority: 42,
    keywords: [
      "business", "startup", "office", "company", "karobar", "kaarobar", "dukan",
      "shop setup", "business setup", "home office setup", "freelance", "agency",
      "inventory", "business loan",
    ],
  },
  {
    value: "gift",
    priority: 38,
    keywords: [
      "gift", "present", "birthday gift", "anniversary gift", "surprise gift",
      "eid gift", "mother gift", "father gift",
    ],
  },
  {
    value: "shopping",
    priority: 30,
    keywords: [
      "shopping", "clothes", "clothing", "fashion", "furniture", "appliance",
      "appliances", "kapray", "kapre", "wardrobe", "sofa", "bed", "fridge",
      "refrigerator", "washing machine", "air conditioner", "ac",
    ],
  },
  {
    value: "shield",
    priority: 44,
    keywords: [
      "emergency", "rainy day", "backup", "safety fund", "reserve",
      "emergency fund", "backup fund", "insurance", "car insurance",
      "health insurance", "life insurance", "security fund",
    ],
  },
  {
    value: "piggybank",
    priority: 36,
    keywords: [
      "savings", "saving", "bachat", "saving fund", "retirement",
      "retirement fund", "future fund", "deposit", "investment fund",
      "cash reserve", "wealth fund",
    ],
  },
  {
    value: "wallet",
    priority: 34,
    keywords: [
      "debt", "debt payoff", "loan", "loan payoff", "credit card",
      "credit card payoff", "cash", "budget", "monthly budget", "money",
    ],
  },
  {
    value: "baby",
    priority: 40,
    keywords: [
      "baby", "child", "children", "family", "newborn", "kids", "kid",
      "school child", "baby expenses", "family fund",
    ],
  },
  {
    value: "key",
    priority: 24,
    keywords: [
      "down payment", "booking amount", "advance payment", "security deposit", "keys",
    ],
  },
  {
    value: "gauge",
    priority: 22,
    keywords: [
      "racing", "performance upgrade", "car upgrade", "bike upgrade", "engine upgrade",
    ],
  },
  {
    value: "sparkles",
    priority: 14,
    keywords: ["dream", "luxury", "special", "wish", "wishlist", "bucket list"],
  },
  {
    value: "flag",
    priority: 10,
    keywords: ["milestone", "challenge", "achievement", "campaign"],
  },
  {
    value: "target",
    priority: 8,
    keywords: ["goal", "target", "mission", "objective"],
  },
];

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

function containsKeyword(normalizedText: string, normalizedKeyword: string) {
  if (!normalizedKeyword) return false;
  return ` ${normalizedText} `.includes(` ${normalizedKeyword} `);
}

function isWithinOneEdit(left: string, right: string) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) edits += 1;
  return edits <= 1;
}

function getKeywordScore(normalizedName: string, keyword: string) {
  const normalizedKeyword = normalizeGoalText(keyword);
  if (!normalizedKeyword) return 0;

  if (normalizedName === normalizedKeyword) {
    return 1_200 + normalizedKeyword.length;
  }

  if (containsKeyword(normalizedName, normalizedKeyword)) {
    const wordCount = normalizedKeyword.split(" ").length;
    return 300 + wordCount * 35 + normalizedKeyword.length;
  }

  if (normalizedKeyword.includes(" ") || normalizedKeyword.length < 5) {
    return 0;
  }

  const nearToken = normalizedName
    .split(" ")
    .some(
      (token) =>
        token.length >= 5 &&
        Math.abs(token.length - normalizedKeyword.length) <= 1 &&
        isWithinOneEdit(token, normalizedKeyword),
    );

  return nearToken ? 115 + normalizedKeyword.length : 0;
}

function findAutoIconValue(name: string): GoalIconValue | null {
  const normalizedName = normalizeGoalText(name);
  if (!normalizedName) return null;

  let bestValue: GoalIconValue | null = null;
  let bestScore = 0;

  AUTO_ICON_RULES.forEach((rule) => {
    const keywordScore = rule.keywords.reduce(
      (highest, keyword) =>
        Math.max(highest, getKeywordScore(normalizedName, keyword)),
      0,
    );
    const score = keywordScore > 0 ? keywordScore + rule.priority : 0;

    if (score > bestScore) {
      bestScore = score;
      bestValue = rule.value;
    }
  });

  return bestValue;
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

function getStoredGoalIconValue(icon?: string | null): GoalIconValue | null {
  return icon && GOAL_ICON_VALUES.has(icon) ? (icon as GoalIconValue) : null;
}

export function inferGoalIconValue(
  name: string,
  fallbackIcon?: string | null,
): GoalIconValue {
  const inferred = findAutoIconValue(name);
  if (inferred) return inferred;

  return getStoredGoalIconValue(fallbackIcon) ?? "target";
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
  const usedGenericIcons = new Set<GoalIconValue>();
  const usedAccents = new Set<string>();
  const assignments: GoalPresentationAssignment[] = new Array(goals.length);

  orderedGoals.forEach(({ goal, index, identity }) => {
    const inferredFromName = findAutoIconValue(goal.name);
    const storedIcon = getStoredGoalIconValue(goal.icon);
    const preferredValue = inferredFromName ?? storedIcon ?? "target";

    let iconValue = preferredValue;
    if (!inferredFromName && (!storedIcon || GENERIC_ICON_VALUES.has(storedIcon))) {
      iconValue =
        GENERIC_ICON_CHOICES.find((candidate) => !usedGenericIcons.has(candidate)) ??
        GENERIC_ICON_CHOICES[hashGoalSeed(identity) % GENERIC_ICON_CHOICES.length];
      usedGenericIcons.add(iconValue);
    }

    const colorHash = hashGoalSeed(`${identity}:${preferredValue}`);
    const preferredColorIndex = colorHash % DISTINCT_ACCENTS.length;
    let accent = DISTINCT_ACCENTS[preferredColorIndex];

    for (let offset = 0; offset < DISTINCT_ACCENTS.length; offset += 1) {
      const candidate =
        DISTINCT_ACCENTS[(preferredColorIndex + offset) % DISTINCT_ACCENTS.length];
      if (!usedAccents.has(candidate)) {
        accent = candidate;
        break;
      }
    }
    usedAccents.add(accent);

    assignments[index] = {
      iconValue,
      label: getGoalIconEntryByValue(iconValue).label,
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
