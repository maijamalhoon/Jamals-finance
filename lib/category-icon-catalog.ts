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
 * Curated finance icons in one consistent marker-outline family. Each semantic
 * concept gets one primary glyph so unrelated categories do not fall back to
 * the same generic tag icon.
 */
export const CATEGORY_ICON_CATALOG: readonly CategoryIconEntry[] = [
  { iconKey: "salary", label: "Salary", types: INCOME, group: "money", keywords: ["pay", "payroll", "wage", "tankhwa"] },
  { iconKey: "banknote", label: "Pension", types: INCOME, group: "money", keywords: ["pension", "stipend", "allowance", "retirement"] },
  { iconKey: "briefcase", label: "Freelance", types: INCOME, group: "work", keywords: ["freelance", "client", "consulting", "gig", "office"] },
  { iconKey: "store", label: "Business sales", types: INCOME, group: "work", keywords: ["business", "shop", "store", "karobar", "trade"] },
  { iconKey: "handCoins", label: "Commission", types: INCOME, group: "money", keywords: ["commission", "brokerage", "affiliate", "referral"] },
  { iconKey: "bonus", label: "Bonus", types: INCOME, group: "money", keywords: ["bonus", "reward", "incentive", "cashback"] },
  { iconKey: "investments", label: "Investments", types: BOTH, group: "money", keywords: ["investment", "stocks", "shares", "portfolio", "mutual fund"] },
  { iconKey: "growth", label: "Profit and return", types: INCOME, group: "money", keywords: ["profit", "dividend", "return", "capital gain"] },
  { iconKey: "coins", label: "Interest and crypto", types: INCOME, group: "money", keywords: ["interest", "crypto", "bitcoin", "yield", "coins"] },
  { iconKey: "building", label: "Rental income", types: INCOME, group: "home", keywords: ["rental income", "property income", "real estate"] },
  { iconKey: "receipt", label: "Refund", types: INCOME, group: "money", keywords: ["refund", "reimbursement", "money back"] },
  { iconKey: "education", label: "Scholarship", types: INCOME, group: "work", keywords: ["scholarship", "grant", "education support"] },
  { iconKey: "gift", label: "Gift received", types: INCOME, group: "lifestyle", keywords: ["gift", "support", "eidi"] },
  { iconKey: "cash", label: "Other income", types: INCOME, group: "money", keywords: ["income", "earning", "cash", "kamai", "amdani"] },

  { iconKey: "wallet", label: "Cash and wallet", types: BOTH, group: "money", keywords: ["cash", "wallet", "money", "atm"] },
  { iconKey: "bank", label: "Bank account", types: BOTH, group: "money", keywords: ["bank", "account", "finance"] },
  { iconKey: "transfer", label: "Money transfer", types: BOTH, group: "money", keywords: ["transfer", "send money", "remittance"] },
  { iconKey: "credit", label: "Card and loan", types: BOTH, group: "money", keywords: ["credit", "debit", "loan", "debt", "qarz"] },
  { iconKey: "savings", label: "Savings", types: BOTH, group: "money", keywords: ["saving", "deposit", "reserve", "emergency fund", "committee"] },
  { iconKey: "bills", label: "Bills", types: EXPENSE, group: "home", keywords: ["bill", "invoice", "monthly bill"] },
  { iconKey: "tax", label: "Tax and fees", types: EXPENSE, group: "money", keywords: ["tax", "fee", "charge", "accounting"] },

  { iconKey: "rent", label: "Rent", types: EXPENSE, group: "home", keywords: ["rent", "kiraya", "lease"] },
  { iconKey: "home", label: "Home", types: EXPENSE, group: "home", keywords: ["home", "house", "mortgage", "apartment"] },
  { iconKey: "utilities", label: "Gas and utilities", types: EXPENSE, group: "home", keywords: ["gas", "utility", "kitchen"] },
  { iconKey: "power", label: "Electricity", types: EXPENSE, group: "home", keywords: ["electricity", "bijli", "solar", "power"] },
  { iconKey: "water", label: "Water", types: EXPENSE, group: "home", keywords: ["water", "pani", "water bill"] },
  { iconKey: "internet", label: "Internet", types: EXPENSE, group: "home", keywords: ["internet", "wifi", "broadband", "fiber"] },
  { iconKey: "phone", label: "Mobile", types: EXPENSE, group: "home", keywords: ["mobile", "phone", "sim", "load", "recharge"] },
  { iconKey: "repair", label: "Repairs", types: EXPENSE, group: "home", keywords: ["repair", "maintenance", "mechanic", "service"] },
  { iconKey: "construction", label: "Construction", types: EXPENSE, group: "home", keywords: ["construction", "renovation", "labour", "mistri", "hardware"] },
  { iconKey: "painting", label: "Painting", types: EXPENSE, group: "home", keywords: ["paint", "painting", "decoration"] },

  { iconKey: "groceries", label: "Groceries", types: EXPENSE, group: "food", keywords: ["grocery", "rashan", "supermarket", "fruit", "vegetable"] },
  { iconKey: "dining", label: "Food and dining", types: EXPENSE, group: "food", keywords: ["food", "restaurant", "meal", "breakfast", "lunch", "dinner"] },
  { iconKey: "drink", label: "Tea and drinks", types: EXPENSE, group: "food", keywords: ["tea", "chai", "coffee", "drink", "cafe"] },

  { iconKey: "fuel", label: "Fuel", types: EXPENSE, group: "transport", keywords: ["fuel", "petrol", "diesel", "cng", "gasoline"] },
  { iconKey: "car", label: "Car and taxi", types: EXPENSE, group: "transport", keywords: ["car", "taxi", "cab", "ride", "parking", "toll"] },
  { iconKey: "bike", label: "Bike", types: EXPENSE, group: "transport", keywords: ["bike", "motorcycle", "bicycle", "cycle"] },
  { iconKey: "bus", label: "Bus", types: EXPENSE, group: "transport", keywords: ["bus", "coach", "public transport"] },
  { iconKey: "train", label: "Train and metro", types: EXPENSE, group: "transport", keywords: ["train", "metro", "rail", "subway"] },
  { iconKey: "travel", label: "Travel and flight", types: EXPENSE, group: "transport", keywords: ["travel", "flight", "hotel", "trip", "visa", "passport"] },
  { iconKey: "ticket", label: "Tickets", types: EXPENSE, group: "transport", keywords: ["ticket", "event", "entry", "pass"] },

  { iconKey: "health", label: "Doctor and hospital", types: EXPENSE, group: "health", keywords: ["doctor", "hospital", "clinic", "health", "treatment"] },
  { iconKey: "medical", label: "Medicine", types: EXPENSE, group: "health", keywords: ["medicine", "pharmacy", "tablet", "dawa"] },
  { iconKey: "dental", label: "Dental", types: EXPENSE, group: "health", keywords: ["dental", "dentist", "teeth"] },
  { iconKey: "optical", label: "Eye care", types: EXPENSE, group: "health", keywords: ["eye", "glasses", "optical", "eyesight"] },
  { iconKey: "insurance", label: "Insurance", types: EXPENSE, group: "health", keywords: ["insurance", "takaful", "protection"] },
  { iconKey: "fitness", label: "Gym and fitness", types: EXPENSE, group: "health", keywords: ["gym", "fitness", "workout", "exercise"] },
  { iconKey: "sports", label: "Sports", types: EXPENSE, group: "health", keywords: ["sports", "cricket", "football", "tennis"] },

  { iconKey: "education", label: "Education", types: EXPENSE, group: "work", keywords: ["school", "college", "university", "tuition", "course"] },
  { iconKey: "books", label: "Books and stationery", types: EXPENSE, group: "work", keywords: ["book", "stationery", "notebook", "library"] },
  { iconKey: "laptop", label: "Computer and electronics", types: BOTH, group: "work", keywords: ["computer", "laptop", "electronics", "printer", "camera"] },
  { iconKey: "software", label: "Software and cloud", types: BOTH, group: "work", keywords: ["software", "app", "saas", "hosting", "domain", "cloud"] },
  { iconKey: "store", label: "Shop and retail", types: BOTH, group: "work", keywords: ["shop", "store", "retail", "dukaan"] },
  { iconKey: "package", label: "Delivery and courier", types: BOTH, group: "work", keywords: ["delivery", "courier", "shipping", "parcel", "package"] },
  { iconKey: "farming", label: "Farming and garden", types: BOTH, group: "work", keywords: ["farm", "agriculture", "crop", "garden", "seed"] },

  { iconKey: "family", label: "Family", types: EXPENSE, group: "lifestyle", keywords: ["family", "parents", "household", "kids"] },
  { iconKey: "children", label: "Children and baby", types: EXPENSE, group: "lifestyle", keywords: ["baby", "child", "children", "nursery", "daycare"] },
  { iconKey: "pets", label: "Pets", types: EXPENSE, group: "lifestyle", keywords: ["pet", "dog", "cat", "vet", "animal"] },
  { iconKey: "clothing", label: "Clothing", types: EXPENSE, group: "lifestyle", keywords: ["clothes", "shirt", "dress", "fashion", "kapray"] },
  { iconKey: "footwear", label: "Shoes", types: EXPENSE, group: "lifestyle", keywords: ["shoes", "footwear", "sneakers"] },
  { iconKey: "personal", label: "Personal care", types: EXPENSE, group: "lifestyle", keywords: ["personal care", "toiletries", "self care"] },
  { iconKey: "beauty", label: "Salon and beauty", types: EXPENSE, group: "lifestyle", keywords: ["salon", "barber", "haircut", "beauty", "makeup"] },
  { iconKey: "shopping", label: "Shopping", types: EXPENSE, group: "lifestyle", keywords: ["shopping", "purchase", "mall", "market", "retail"] },
  { iconKey: "gift", label: "Gift and celebration", types: EXPENSE, group: "lifestyle", keywords: ["gift", "birthday", "wedding", "party", "celebration"] },
  { iconKey: "charity", label: "Charity and zakat", types: EXPENSE, group: "lifestyle", keywords: ["charity", "donation", "zakat", "sadqa", "khairat"] },
  { iconKey: "help", label: "Help and welfare", types: EXPENSE, group: "lifestyle", keywords: ["help", "support", "welfare", "aid"] },
  { iconKey: "entertainment", label: "Movies and entertainment", types: EXPENSE, group: "lifestyle", keywords: ["movie", "cinema", "film", "entertainment"] },
  { iconKey: "games", label: "Gaming", types: EXPENSE, group: "lifestyle", keywords: ["gaming", "game", "playstation", "xbox"] },
  { iconKey: "subscriptions", label: "Subscriptions", types: EXPENSE, group: "lifestyle", keywords: ["subscription", "membership", "netflix", "spotify"] },

  { iconKey: "legal", label: "Legal and security", types: EXPENSE, group: "other", keywords: ["legal", "lawyer", "court", "security", "guard"] },
  { iconKey: "receipt", label: "Receipt", types: EXPENSE, group: "other", keywords: ["receipt", "expense"] },
  { iconKey: "tags", label: "Other category", types: BOTH, group: "other", keywords: ["other", "miscellaneous", "general", "custom"] },
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
