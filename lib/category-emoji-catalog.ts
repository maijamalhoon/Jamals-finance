import type { CategoryKind } from "@/lib/category-visuals";

export type CategoryEmojiEntry = Readonly<{
  emoji: string;
  label: string;
  types: readonly CategoryKind[];
  keywords: readonly string[];
}>;

const BOTH = ["income", "expense"] as const satisfies readonly CategoryKind[];
const INCOME = ["income"] as const satisfies readonly CategoryKind[];
const EXPENSE = ["expense"] as const satisfies readonly CategoryKind[];

/**
 * A broad, offline catalogue for personal-finance categories. It intentionally
 * includes globally recognisable symbols for earnings, household spending,
 * transport, health, education, faith, family, business and digital services.
 */
export const CATEGORY_EMOJI_CATALOG: readonly CategoryEmojiEntry[] = [
  { emoji: "💵", label: "Cash", types: BOTH, keywords: ["cash", "money", "income", "expense"] },
  { emoji: "💰", label: "Money bag", types: BOTH, keywords: ["money", "wealth", "saving"] },
  { emoji: "🪙", label: "Coins", types: BOTH, keywords: ["coin", "crypto", "interest"] },
  { emoji: "💳", label: "Card", types: BOTH, keywords: ["credit", "debit", "card", "payment"] },
  { emoji: "🏦", label: "Bank", types: BOTH, keywords: ["bank", "account", "finance"] },
  { emoji: "🧾", label: "Receipt", types: BOTH, keywords: ["receipt", "bill", "invoice", "tax"] },
  { emoji: "📊", label: "Reports", types: BOTH, keywords: ["report", "chart", "analytics"] },
  { emoji: "📈", label: "Growth", types: INCOME, keywords: ["profit", "growth", "investment", "return"] },
  { emoji: "📉", label: "Loss", types: EXPENSE, keywords: ["loss", "decline", "expense"] },
  { emoji: "💼", label: "Salary and work", types: INCOME, keywords: ["salary", "job", "office", "wage"] },
  { emoji: "🧑‍💻", label: "Freelance", types: INCOME, keywords: ["freelance", "remote", "developer", "client"] },
  { emoji: "🤝", label: "Commission", types: INCOME, keywords: ["commission", "partnership", "deal"] },
  { emoji: "🏆", label: "Bonus", types: INCOME, keywords: ["bonus", "reward", "prize"] },
  { emoji: "🎁", label: "Gift", types: BOTH, keywords: ["gift", "present", "reward", "donation"] },
  { emoji: "🏪", label: "Shop", types: BOTH, keywords: ["shop", "store", "business", "retail"] },
  { emoji: "🏢", label: "Company", types: BOTH, keywords: ["company", "business", "office", "rent"] },
  { emoji: "🏭", label: "Factory", types: BOTH, keywords: ["factory", "manufacturing", "industry"] },
  { emoji: "🚜", label: "Farming", types: BOTH, keywords: ["farm", "agriculture", "crop"] },
  { emoji: "🌾", label: "Crop", types: BOTH, keywords: ["crop", "harvest", "agriculture"] },
  { emoji: "🏠", label: "Home", types: EXPENSE, keywords: ["home", "house", "rent", "mortgage"] },
  { emoji: "🏘️", label: "Property", types: BOTH, keywords: ["property", "rental", "real estate"] },
  { emoji: "🛋️", label: "Furniture", types: EXPENSE, keywords: ["furniture", "sofa", "home"] },
  { emoji: "🧹", label: "Cleaning", types: EXPENSE, keywords: ["cleaning", "housekeeping", "maid"] },
  { emoji: "🔧", label: "Repairs", types: EXPENSE, keywords: ["repair", "maintenance", "service"] },
  { emoji: "🧱", label: "Construction", types: EXPENSE, keywords: ["construction", "renovation", "building"] },
  { emoji: "💡", label: "Electricity", types: EXPENSE, keywords: ["electricity", "power", "light", "utility"] },
  { emoji: "💧", label: "Water", types: EXPENSE, keywords: ["water", "utility", "bill"] },
  { emoji: "🔥", label: "Gas", types: EXPENSE, keywords: ["gas", "heating", "utility"] },
  { emoji: "☀️", label: "Solar", types: EXPENSE, keywords: ["solar", "energy", "panel"] },
  { emoji: "📱", label: "Mobile", types: EXPENSE, keywords: ["mobile", "phone", "recharge", "sim"] },
  { emoji: "🌐", label: "Internet", types: EXPENSE, keywords: ["internet", "wifi", "broadband", "hosting"] },
  { emoji: "💻", label: "Computer", types: BOTH, keywords: ["computer", "laptop", "software", "technology"] },
  { emoji: "🖨️", label: "Office equipment", types: EXPENSE, keywords: ["printer", "equipment", "office"] },
  { emoji: "🛒", label: "Groceries", types: EXPENSE, keywords: ["grocery", "supermarket", "rashan", "food"] },
  { emoji: "🥦", label: "Vegetables", types: EXPENSE, keywords: ["vegetable", "fruit", "healthy food"] },
  { emoji: "🥛", label: "Dairy", types: EXPENSE, keywords: ["milk", "dairy", "grocery"] },
  { emoji: "🍽️", label: "Dining", types: EXPENSE, keywords: ["food", "restaurant", "meal", "dining"] },
  { emoji: "☕", label: "Coffee and tea", types: EXPENSE, keywords: ["coffee", "tea", "chai", "cafe"] },
  { emoji: "🍕", label: "Fast food", types: EXPENSE, keywords: ["pizza", "burger", "takeaway", "fast food"] },
  { emoji: "🍰", label: "Bakery", types: EXPENSE, keywords: ["bakery", "cake", "dessert"] },
  { emoji: "🚗", label: "Car", types: EXPENSE, keywords: ["car", "vehicle", "transport"] },
  { emoji: "⛽", label: "Fuel", types: EXPENSE, keywords: ["fuel", "petrol", "diesel", "cng"] },
  { emoji: "🛠️", label: "Vehicle service", types: EXPENSE, keywords: ["mechanic", "service", "workshop"] },
  { emoji: "🅿️", label: "Parking", types: EXPENSE, keywords: ["parking", "toll", "vehicle"] },
  { emoji: "🏍️", label: "Motorbike", types: EXPENSE, keywords: ["bike", "motorcycle", "transport"] },
  { emoji: "🚲", label: "Bicycle", types: EXPENSE, keywords: ["bicycle", "cycle", "transport"] },
  { emoji: "🚌", label: "Bus", types: EXPENSE, keywords: ["bus", "public transport", "coach"] },
  { emoji: "🚆", label: "Train", types: EXPENSE, keywords: ["train", "metro", "rail"] },
  { emoji: "🚕", label: "Taxi", types: EXPENSE, keywords: ["taxi", "cab", "ride", "rickshaw"] },
  { emoji: "✈️", label: "Flight", types: EXPENSE, keywords: ["flight", "airline", "travel"] },
  { emoji: "🏨", label: "Hotel", types: EXPENSE, keywords: ["hotel", "travel", "stay"] },
  { emoji: "🛂", label: "Visa and passport", types: EXPENSE, keywords: ["visa", "passport", "travel"] },
  { emoji: "🧳", label: "Travel", types: EXPENSE, keywords: ["trip", "tour", "vacation", "travel"] },
  { emoji: "🏥", label: "Hospital", types: EXPENSE, keywords: ["hospital", "health", "medical"] },
  { emoji: "🩺", label: "Doctor", types: EXPENSE, keywords: ["doctor", "clinic", "checkup"] },
  { emoji: "💊", label: "Medicine", types: EXPENSE, keywords: ["medicine", "pharmacy", "tablet"] },
  { emoji: "🦷", label: "Dental", types: EXPENSE, keywords: ["dentist", "dental", "teeth"] },
  { emoji: "👓", label: "Optical", types: EXPENSE, keywords: ["glasses", "eye", "optical"] },
  { emoji: "🛡️", label: "Insurance", types: EXPENSE, keywords: ["insurance", "takaful", "protection"] },
  { emoji: "🎓", label: "Education", types: BOTH, keywords: ["education", "school", "college", "scholarship"] },
  { emoji: "📚", label: "Books", types: EXPENSE, keywords: ["books", "library", "reading"] },
  { emoji: "✏️", label: "Stationery", types: EXPENSE, keywords: ["stationery", "school", "notebook"] },
  { emoji: "🧑‍🏫", label: "Tuition", types: EXPENSE, keywords: ["tuition", "teacher", "course", "academy"] },
  { emoji: "👶", label: "Baby", types: EXPENSE, keywords: ["baby", "child", "nursery"] },
  { emoji: "👨‍👩‍👧‍👦", label: "Family", types: EXPENSE, keywords: ["family", "children", "household"] },
  { emoji: "🐾", label: "Pets", types: EXPENSE, keywords: ["pet", "animal", "vet"] },
  { emoji: "👕", label: "Clothing", types: EXPENSE, keywords: ["clothes", "fashion", "shirt"] },
  { emoji: "👟", label: "Shoes", types: EXPENSE, keywords: ["shoes", "footwear", "fashion"] },
  { emoji: "💇", label: "Hair and salon", types: EXPENSE, keywords: ["salon", "barber", "haircut"] },
  { emoji: "💄", label: "Beauty", types: EXPENSE, keywords: ["beauty", "makeup", "cosmetics"] },
  { emoji: "🧴", label: "Personal care", types: EXPENSE, keywords: ["personal care", "skincare", "toiletries"] },
  { emoji: "🏋️", label: "Fitness", types: EXPENSE, keywords: ["gym", "fitness", "workout"] },
  { emoji: "⚽", label: "Sports", types: EXPENSE, keywords: ["sport", "football", "cricket"] },
  { emoji: "🎮", label: "Gaming", types: EXPENSE, keywords: ["game", "gaming", "playstation"] },
  { emoji: "🎬", label: "Movies", types: EXPENSE, keywords: ["movie", "cinema", "film"] },
  { emoji: "🎵", label: "Music", types: EXPENSE, keywords: ["music", "spotify", "concert"] },
  { emoji: "📺", label: "Subscriptions", types: EXPENSE, keywords: ["subscription", "streaming", "netflix"] },
  { emoji: "🎟️", label: "Tickets", types: EXPENSE, keywords: ["ticket", "event", "entry"] },
  { emoji: "🎉", label: "Celebration", types: EXPENSE, keywords: ["party", "birthday", "celebration"] },
  { emoji: "💍", label: "Wedding", types: EXPENSE, keywords: ["wedding", "marriage", "engagement"] },
  { emoji: "❤️", label: "Charity", types: BOTH, keywords: ["charity", "donation", "support"] },
  { emoji: "🕌", label: "Faith", types: EXPENSE, keywords: ["zakat", "sadqa", "religion", "faith"] },
  { emoji: "⚖️", label: "Legal", types: EXPENSE, keywords: ["lawyer", "legal", "court"] },
  { emoji: "🧑‍🔧", label: "Labour", types: BOTH, keywords: ["labour", "worker", "service"] },
  { emoji: "📦", label: "Delivery", types: BOTH, keywords: ["delivery", "courier", "shipping", "parcel"] },
  { emoji: "🏷️", label: "Shopping", types: EXPENSE, keywords: ["shopping", "purchase", "retail"] },
  { emoji: "💸", label: "Fees", types: EXPENSE, keywords: ["fee", "charge", "expense", "tax"] },
  { emoji: "🧮", label: "Tax", types: EXPENSE, keywords: ["tax", "accounting", "calculation"] },
  { emoji: "🧷", label: "Other", types: BOTH, keywords: ["other", "miscellaneous", "general"] },
] as const;

export function getCategoryEmojiOptions(type: CategoryKind, query = "") {
  const normalized = query.trim().toLowerCase();

  return CATEGORY_EMOJI_CATALOG.filter((entry) => {
    if (!entry.types.includes(type)) return false;
    if (!normalized) return true;
    return [entry.label, ...entry.keywords].some((value) =>
      value.toLowerCase().includes(normalized),
    );
  });
}
