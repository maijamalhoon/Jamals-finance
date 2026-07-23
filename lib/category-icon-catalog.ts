import type {
  CategoryKind,
  NamedCategoryIconKey,
} from "@/lib/category-visuals";

export type CategoryIconGroup =
  | "money"
  | "work"
  | "home"
  | "food"
  | "transport"
  | "health"
  | "lifestyle"
  | "other";

export type CategoryIconEntry = Readonly<{
  iconKey: NamedCategoryIconKey;
  label: string;
  types: readonly CategoryKind[];
  keywords: readonly string[];
  group: CategoryIconGroup;
}>;

const BOTH = ["income", "expense"] as const satisfies readonly CategoryKind[];
const INCOME = ["income"] as const satisfies readonly CategoryKind[];
const EXPENSE = ["expense"] as const satisfies readonly CategoryKind[];

export const CATEGORY_ICON_GROUPS: readonly {
  value: CategoryIconGroup;
  label: string;
}[] = [
  { value: "money", label: "Money" },
  { value: "work", label: "Work" },
  { value: "home", label: "Home" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Travel" },
  { value: "health", label: "Health" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "other", label: "Other" },
] as const;

/**
 * A broad, offline finance icon catalogue. The glyphs are rendered through the
 * shared marker-drawn icon treatment, so every category stays in one visual
 * family instead of mixing platform-dependent emoji artwork.
 */
export const CATEGORY_ICON_CATALOG: readonly CategoryIconEntry[] = [
  { iconKey: "salary", label: "Salary", types: INCOME, keywords: ["pay", "payroll", "wage", "tankhwa"], group: "money" },
  { iconKey: "banknote", label: "Pension and allowance", types: INCOME, keywords: ["pension", "stipend", "allowance", "retirement"], group: "money" },
  { iconKey: "briefcase", label: "Freelance work", types: INCOME, keywords: ["freelance", "client", "consulting", "gig", "office"], group: "work" },
  { iconKey: "store", label: "Business sales", types: INCOME, keywords: ["business", "shop", "store", "karobar", "trade"], group: "work" },
  { iconKey: "commission", label: "Commission", types: INCOME, keywords: ["commission", "brokerage", "affiliate", "referral"], group: "money" },
  { iconKey: "bonus", label: "Bonus and reward", types: INCOME, keywords: ["bonus", "reward", "incentive", "cashback"], group: "money" },
  { iconKey: "investments", label: "Investment return", types: INCOME, keywords: ["profit", "dividend", "investment", "shares", "return"], group: "money" },
  { iconKey: "coins", label: "Interest and crypto", types: INCOME, keywords: ["interest", "crypto", "bitcoin", "yield", "coins"], group: "money" },
  { iconKey: "building", label: "Rental income", types: INCOME, keywords: ["rent", "property", "real estate", "lease"], group: "home" },
  { iconKey: "receipt", label: "Refund", types: INCOME, keywords: ["refund", "reimbursement", "money back"], group: "money" },
  { iconKey: "education", label: "Scholarship and grant", types: INCOME, keywords: ["scholarship", "grant", "education support"], group: "work" },
  { iconKey: "gift", label: "Gift received", types: INCOME, keywords: ["gift", "support", "donation received", "eidi"], group: "lifestyle" },
  { iconKey: "cash", label: "Other income", types: INCOME, keywords: ["income", "earning", "cash", "kamai", "amdani"], group: "money" },
  { iconKey: "wallet", label: "Cash and wallet", types: BOTH, keywords: ["cash", "wallet", "money", "atm"], group: "money" },
  { iconKey: "bank", label: "Bank and account", types: BOTH, keywords: ["bank", "account", "finance"], group: "money" },
  { iconKey: "transfer", label: "Money transfer", types: BOTH, keywords: ["transfer", "send money", "remittance"], group: "money" },
  { iconKey: "credit", label: "Card and loan", types: BOTH, keywords: ["credit", "debit", "loan", "debt", "qarz"], group: "money" },
  { iconKey: "savings", label: "Savings", types: BOTH, keywords: ["saving", "deposit", "reserve", "emergency fund", "committee"], group: "money" },
  { iconKey: "rent", label: "Rent and lease", types: EXPENSE, keywords: ["home", "rent", "mortgage", "house", "kiraya"], group: "home" },
  { iconKey: "groceries", label: "Groceries", types: EXPENSE, keywords: ["grocery", "rashan", "supermarket", "fruit", "vegetable"], group: "food" },
  { iconKey: "dining", label: "Food and dining", types: EXPENSE, keywords: ["food", "restaurant", "meal", "breakfast", "lunch", "dinner"], group: "food" },
  { iconKey: "drink", label: "Tea and drinks", types: EXPENSE, keywords: ["tea", "chai", "coffee", "drink", "cafe"], group: "food" },
  { iconKey: "utilities", label: "Gas and utilities", types: EXPENSE, keywords: ["gas", "utility", "bill", "kitchen"], group: "home" },
  { iconKey: "power", label: "Electricity and solar", types: EXPENSE, keywords: ["electricity", "bijli", "solar", "power"], group: "home" },
  { iconKey: "water", label: "Water bill", types: EXPENSE, keywords: ["water", "pani", "utility"], group: "home" },
  { iconKey: "internet", label: "Internet", types: EXPENSE, keywords: ["internet", "wifi", "broadband", "fiber"], group: "home" },
  { iconKey: "phone", label: "Mobile and recharge", types: EXPENSE, keywords: ["mobile", "phone", "sim", "load", "recharge"], group: "home" },
  { iconKey: "fuel", label: "Fuel", types: EXPENSE, keywords: ["fuel", "petrol", "diesel", "cng", "gasoline"], group: "transport" },
  { iconKey: "car", label: "Car and taxi", types: EXPENSE, keywords: ["car", "taxi", "cab", "ride", "parking", "toll"], group: "transport" },
  { iconKey: "bike", label: "Bike and bicycle", types: EXPENSE, keywords: ["bike", "motorcycle", "bicycle", "cycle"], group: "transport" },
  { iconKey: "bus", label: "Bus", types: EXPENSE, keywords: ["bus", "coach", "public transport"], group: "transport" },
  { iconKey: "train", label: "Train and metro", types: EXPENSE, keywords: ["train", "metro", "rail", "subway"], group: "transport" },
  { iconKey: "travel", label: "Travel and flight", types: EXPENSE, keywords: ["travel", "flight", "hotel", "trip", "visa", "passport"], group: "transport" },
  { iconKey: "ticket", label: "Tickets", types: EXPENSE, keywords: ["ticket", "event", "entry", "pass"], group: "transport" },
  { iconKey: "health", label: "Doctor and hospital", types: EXPENSE, keywords: ["doctor", "hospital", "clinic", "health", "treatment"], group: "health" },
  { iconKey: "medical", label: "Medicine", types: EXPENSE, keywords: ["medicine", "pharmacy", "tablet", "dawa"], group: "health" },
  { iconKey: "optical", label: "Dental and optical", types: EXPENSE, keywords: ["dental", "dentist", "eye", "glasses", "optical"], group: "health" },
  { iconKey: "insurance", label: "Insurance and takaful", types: EXPENSE, keywords: ["insurance", "takaful", "protection"], group: "health" },
  { iconKey: "education", label: "Education and tuition", types: EXPENSE, keywords: ["school", "college", "university", "tuition", "course"], group: "work" },
  { iconKey: "books", label: "Books and stationery", types: EXPENSE, keywords: ["book", "stationery", "notebook", "library"], group: "other" },
  { iconKey: "children", label: "Children and baby", types: EXPENSE, keywords: ["baby", "child", "children", "nursery", "daycare"], group: "lifestyle" },
  { iconKey: "children", label: "Family", types: EXPENSE, keywords: ["family", "household", "parents", "kids"], group: "lifestyle" },
  { iconKey: "pets", label: "Pets", types: EXPENSE, keywords: ["pet", "dog", "cat", "vet", "animal"], group: "lifestyle" },
  { iconKey: "clothing", label: "Clothing", types: EXPENSE, keywords: ["clothes", "shirt", "dress", "fashion", "kapray"], group: "lifestyle" },
  { iconKey: "clothing", label: "Shoes and footwear", types: EXPENSE, keywords: ["shoes", "footwear", "sneakers"], group: "lifestyle" },
  { iconKey: "personal", label: "Personal care", types: EXPENSE, keywords: ["personal care", "skincare", "toiletries", "self care"], group: "lifestyle" },
  { iconKey: "beauty", label: "Salon and beauty", types: EXPENSE, keywords: ["salon", "barber", "haircut", "beauty", "makeup"], group: "lifestyle" },
  { iconKey: "fitness", label: "Fitness and gym", types: EXPENSE, keywords: ["gym", "fitness", "workout", "exercise"], group: "health" },
  { iconKey: "fitness", label: "Sports", types: EXPENSE, keywords: ["sports", "cricket", "football", "tennis"], group: "health" },
  { iconKey: "games", label: "Gaming", types: EXPENSE, keywords: ["gaming", "game", "playstation", "xbox"], group: "lifestyle" },
  { iconKey: "movies", label: "Movies and entertainment", types: EXPENSE, keywords: ["movie", "cinema", "film", "entertainment"], group: "lifestyle" },
  { iconKey: "music", label: "Music and subscriptions", types: EXPENSE, keywords: ["music", "spotify", "netflix", "subscription", "membership"], group: "lifestyle" },
  { iconKey: "laptop", label: "Computer and electronics", types: BOTH, keywords: ["computer", "laptop", "electronics", "printer", "camera"], group: "work" },
  { iconKey: "cloud", label: "Software and cloud", types: BOTH, keywords: ["software", "app", "saas", "hosting", "domain", "cloud"], group: "work" },
  { iconKey: "repair", label: "Repairs and maintenance", types: EXPENSE, keywords: ["repair", "maintenance", "mechanic", "service", "workshop"], group: "home" },
  { iconKey: "construction", label: "Construction and labour", types: EXPENSE, keywords: ["construction", "renovation", "labour", "mistri", "hardware"], group: "work" },
  { iconKey: "painting", label: "Painting and decoration", types: EXPENSE, keywords: ["paint", "painting", "painter", "decoration"], group: "home" },
  { iconKey: "growth", label: "Farming and garden", types: BOTH, keywords: ["farm", "agriculture", "crop", "garden", "seed"], group: "work" },
  { iconKey: "package", label: "Delivery and courier", types: BOTH, keywords: ["delivery", "courier", "shipping", "parcel", "package"], group: "work" },
  { iconKey: "shopping", label: "Shopping", types: EXPENSE, keywords: ["shopping", "purchase", "mall", "market", "retail"], group: "lifestyle" },
  { iconKey: "store", label: "Shop and retail", types: BOTH, keywords: ["shop", "store", "retail", "dukaan"], group: "work" },
  { iconKey: "gift", label: "Gift and celebration", types: EXPENSE, keywords: ["gift", "birthday", "wedding", "party", "celebration"], group: "lifestyle" },
  { iconKey: "charity", label: "Charity and zakat", types: EXPENSE, keywords: ["charity", "donation", "zakat", "sadqa", "khairat"], group: "lifestyle" },
  { iconKey: "tax", label: "Tax and fees", types: EXPENSE, keywords: ["tax", "fee", "charge", "accounting"], group: "money" },
  { iconKey: "legal", label: "Legal and security", types: EXPENSE, keywords: ["legal", "lawyer", "court", "security", "guard"], group: "other" },
  { iconKey: "bills", label: "Bills and invoices", types: EXPENSE, keywords: ["bill", "receipt", "invoice", "expense"], group: "money" },
  { iconKey: "help", label: "Help and assistance", types: EXPENSE, keywords: ["help", "assistance", "support", "emergency"], group: "lifestyle" },
  { iconKey: "personal", label: "Other category", types: BOTH, keywords: ["other", "miscellaneous", "general", "custom"], group: "lifestyle" },
] as const;

export function getCategoryIconOptions(
  type: CategoryKind,
  query = "",
  group?: CategoryIconGroup | "all",
) {
  const normalized = query.trim().toLowerCase();
  const matches = CATEGORY_ICON_CATALOG.filter((entry) => {
    if (!entry.types.includes(type)) return false;
    if (group && group !== "all" && entry.group !== group) return false;
    if (!normalized) return true;
    return [entry.label, ...entry.keywords].some((value) =>
      value.toLowerCase().includes(normalized),
    );
  });

  return Array.from(
    new Map(matches.map((entry) => [entry.iconKey, entry])).values(),
  );
}
