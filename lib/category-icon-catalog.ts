import type {
  CategoryKind,
  NamedCategoryIconKey,
} from "@/lib/category-visuals";

export type CategoryIconEntry = Readonly<{
  iconKey: NamedCategoryIconKey;
  label: string;
  types: readonly CategoryKind[];
  keywords: readonly string[];
}>;

const BOTH = ["income", "expense"] as const satisfies readonly CategoryKind[];
const INCOME = ["income"] as const satisfies readonly CategoryKind[];
const EXPENSE = ["expense"] as const satisfies readonly CategoryKind[];

/**
 * A broad, offline finance icon catalogue. The glyphs are rendered through the
 * shared marker-drawn icon treatment, so every category stays in one visual
 * family instead of mixing platform-dependent emoji artwork.
 */
export const CATEGORY_ICON_CATALOG: readonly CategoryIconEntry[] = [
  { iconKey: "salary", label: "Salary", types: INCOME, keywords: ["pay", "payroll", "wage", "tankhwa"] },
  { iconKey: "banknote", label: "Pension and allowance", types: INCOME, keywords: ["pension", "stipend", "allowance", "retirement"] },
  { iconKey: "briefcase", label: "Freelance work", types: INCOME, keywords: ["freelance", "client", "consulting", "gig", "office"] },
  { iconKey: "store", label: "Business sales", types: INCOME, keywords: ["business", "shop", "store", "karobar", "trade"] },
  { iconKey: "handCoins", label: "Commission", types: INCOME, keywords: ["commission", "brokerage", "affiliate", "referral"] },
  { iconKey: "bonus", label: "Bonus and reward", types: INCOME, keywords: ["bonus", "reward", "incentive", "cashback"] },
  { iconKey: "growth", label: "Investment return", types: INCOME, keywords: ["profit", "dividend", "investment", "shares", "return"] },
  { iconKey: "coins", label: "Interest and crypto", types: INCOME, keywords: ["interest", "crypto", "bitcoin", "yield", "coins"] },
  { iconKey: "building", label: "Rental income", types: INCOME, keywords: ["rent", "property", "real estate", "lease"] },
  { iconKey: "receipt", label: "Refund", types: INCOME, keywords: ["refund", "reimbursement", "money back"] },
  { iconKey: "education", label: "Scholarship and grant", types: INCOME, keywords: ["scholarship", "grant", "education support"] },
  { iconKey: "gift", label: "Gift received", types: INCOME, keywords: ["gift", "support", "donation received", "eidi"] },
  { iconKey: "cash", label: "Other income", types: INCOME, keywords: ["income", "earning", "cash", "kamai", "amdani"] },
  { iconKey: "wallet", label: "Cash and wallet", types: BOTH, keywords: ["cash", "wallet", "money", "atm"] },
  { iconKey: "bank", label: "Bank and account", types: BOTH, keywords: ["bank", "account", "finance"] },
  { iconKey: "transfer", label: "Money transfer", types: BOTH, keywords: ["transfer", "send money", "remittance"] },
  { iconKey: "credit", label: "Card and loan", types: BOTH, keywords: ["credit", "debit", "loan", "debt", "qarz"] },
  { iconKey: "savings", label: "Savings", types: BOTH, keywords: ["saving", "deposit", "reserve", "emergency fund", "committee"] },
  { iconKey: "home", label: "Home and rent", types: EXPENSE, keywords: ["home", "rent", "mortgage", "house", "kiraya"] },
  { iconKey: "groceries", label: "Groceries", types: EXPENSE, keywords: ["grocery", "rashan", "supermarket", "fruit", "vegetable"] },
  { iconKey: "dining", label: "Food and dining", types: EXPENSE, keywords: ["food", "restaurant", "meal", "breakfast", "lunch", "dinner"] },
  { iconKey: "drink", label: "Tea and drinks", types: EXPENSE, keywords: ["tea", "chai", "coffee", "drink", "cafe"] },
  { iconKey: "utilities", label: "Gas and utilities", types: EXPENSE, keywords: ["gas", "utility", "bill", "kitchen"] },
  { iconKey: "power", label: "Electricity and solar", types: EXPENSE, keywords: ["electricity", "bijli", "solar", "power"] },
  { iconKey: "water", label: "Water bill", types: EXPENSE, keywords: ["water", "pani", "utility"] },
  { iconKey: "internet", label: "Internet", types: EXPENSE, keywords: ["internet", "wifi", "broadband", "fiber"] },
  { iconKey: "phone", label: "Mobile and recharge", types: EXPENSE, keywords: ["mobile", "phone", "sim", "load", "recharge"] },
  { iconKey: "fuel", label: "Fuel", types: EXPENSE, keywords: ["fuel", "petrol", "diesel", "cng", "gasoline"] },
  { iconKey: "car", label: "Car and taxi", types: EXPENSE, keywords: ["car", "taxi", "cab", "ride", "parking", "toll"] },
  { iconKey: "bike", label: "Bike and bicycle", types: EXPENSE, keywords: ["bike", "motorcycle", "bicycle", "cycle"] },
  { iconKey: "bus", label: "Bus", types: EXPENSE, keywords: ["bus", "coach", "public transport"] },
  { iconKey: "train", label: "Train and metro", types: EXPENSE, keywords: ["train", "metro", "rail", "subway"] },
  { iconKey: "travel", label: "Travel and flight", types: EXPENSE, keywords: ["travel", "flight", "hotel", "trip", "visa", "passport"] },
  { iconKey: "ticket", label: "Tickets", types: EXPENSE, keywords: ["ticket", "event", "entry", "pass"] },
  { iconKey: "health", label: "Doctor and hospital", types: EXPENSE, keywords: ["doctor", "hospital", "clinic", "health", "treatment"] },
  { iconKey: "medical", label: "Medicine", types: EXPENSE, keywords: ["medicine", "pharmacy", "tablet", "dawa"] },
  { iconKey: "health", label: "Dental and optical", types: EXPENSE, keywords: ["dental", "dentist", "eye", "glasses", "optical"] },
  { iconKey: "health", label: "Insurance and takaful", types: EXPENSE, keywords: ["insurance", "takaful", "protection"] },
  { iconKey: "education", label: "Education and tuition", types: EXPENSE, keywords: ["school", "college", "university", "tuition", "course"] },
  { iconKey: "books", label: "Books and stationery", types: EXPENSE, keywords: ["book", "stationery", "notebook", "library"] },
  { iconKey: "children", label: "Children and baby", types: EXPENSE, keywords: ["baby", "child", "children", "nursery", "daycare"] },
  { iconKey: "children", label: "Family", types: EXPENSE, keywords: ["family", "household", "parents", "kids"] },
  { iconKey: "pets", label: "Pets", types: EXPENSE, keywords: ["pet", "dog", "cat", "vet", "animal"] },
  { iconKey: "clothing", label: "Clothing", types: EXPENSE, keywords: ["clothes", "shirt", "dress", "fashion", "kapray"] },
  { iconKey: "clothing", label: "Shoes and footwear", types: EXPENSE, keywords: ["shoes", "footwear", "sneakers"] },
  { iconKey: "personal", label: "Personal care", types: EXPENSE, keywords: ["personal care", "skincare", "toiletries", "self care"] },
  { iconKey: "personal", label: "Salon and beauty", types: EXPENSE, keywords: ["salon", "barber", "haircut", "beauty", "makeup"] },
  { iconKey: "fitness", label: "Fitness and gym", types: EXPENSE, keywords: ["gym", "fitness", "workout", "exercise"] },
  { iconKey: "fitness", label: "Sports", types: EXPENSE, keywords: ["sports", "cricket", "football", "tennis"] },
  { iconKey: "games", label: "Gaming", types: EXPENSE, keywords: ["gaming", "game", "playstation", "xbox"] },
  { iconKey: "games", label: "Movies and entertainment", types: EXPENSE, keywords: ["movie", "cinema", "film", "entertainment"] },
  { iconKey: "games", label: "Music and subscriptions", types: EXPENSE, keywords: ["music", "spotify", "netflix", "subscription", "membership"] },
  { iconKey: "laptop", label: "Computer and electronics", types: BOTH, keywords: ["computer", "laptop", "electronics", "printer", "camera"] },
  { iconKey: "laptop", label: "Software and cloud", types: BOTH, keywords: ["software", "app", "saas", "hosting", "domain", "cloud"] },
  { iconKey: "repair", label: "Repairs and maintenance", types: EXPENSE, keywords: ["repair", "maintenance", "mechanic", "service", "workshop"] },
  { iconKey: "repair", label: "Construction and labour", types: EXPENSE, keywords: ["construction", "renovation", "labour", "mistri", "hardware"] },
  { iconKey: "painting", label: "Painting and decoration", types: EXPENSE, keywords: ["paint", "painting", "painter", "decoration"] },
  { iconKey: "growth", label: "Farming and garden", types: BOTH, keywords: ["farm", "agriculture", "crop", "garden", "seed"] },
  { iconKey: "package", label: "Delivery and courier", types: BOTH, keywords: ["delivery", "courier", "shipping", "parcel", "package"] },
  { iconKey: "shopping", label: "Shopping", types: EXPENSE, keywords: ["shopping", "purchase", "mall", "market", "retail"] },
  { iconKey: "store", label: "Shop and retail", types: BOTH, keywords: ["shop", "store", "retail", "dukaan"] },
  { iconKey: "gift", label: "Gift and celebration", types: EXPENSE, keywords: ["gift", "birthday", "wedding", "party", "celebration"] },
  { iconKey: "gift", label: "Charity and zakat", types: EXPENSE, keywords: ["charity", "donation", "zakat", "sadqa", "khairat"] },
  { iconKey: "tax", label: "Tax and fees", types: EXPENSE, keywords: ["tax", "fee", "charge", "accounting"] },
  { iconKey: "bank", label: "Legal and security", types: EXPENSE, keywords: ["legal", "lawyer", "court", "security", "guard"] },
  { iconKey: "receipt", label: "Bills and receipts", types: EXPENSE, keywords: ["bill", "receipt", "invoice", "expense"] },
  { iconKey: "personal", label: "Other category", types: BOTH, keywords: ["other", "miscellaneous", "general", "custom"] },
] as const;

export function getCategoryIconOptions(type: CategoryKind, query = "") {
  const normalized = query.trim().toLowerCase();
  const matches = CATEGORY_ICON_CATALOG.filter((entry) => {
    if (!entry.types.includes(type)) return false;
    if (!normalized) return true;
    return [entry.label, ...entry.keywords].some((value) =>
      value.toLowerCase().includes(normalized),
    );
  });

  return Array.from(
    new Map(matches.map((entry) => [entry.iconKey, entry])).values(),
  );
}
