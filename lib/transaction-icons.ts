import {
  ArrowLeftRight,
  Car,
  Coffee,
  Landmark,
  ReceiptText,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type TransactionIconMeta = {
  label: string;
  icon: LucideIcon;
  accent: string;
};

type TransactionIconInput = {
  type?: "income" | "expense" | "transfer" | string | null;
  note?: string | null;
  categoryName?: string | null;
  parentCategoryName?: string | null;
};

const MATCHERS: {
  label: string;
  icon: LucideIcon;
  accent: string;
  keywords: string[];
}[] = [
  {
    label: "Transfer",
    icon: ArrowLeftRight,
    accent: "#2563eb",
    keywords: ["transfer", "moved", "wallet to", "bank to", "account to"],
  },
  {
    label: "Ride",
    icon: Car,
    accent: "#16a34a",
    keywords: ["ride", "rides", "indrive", "careem", "uber", "bike"],
  },
  {
    label: "Food",
    icon: Coffee,
    accent: "#dc2626",
    keywords: ["food", "dining", "drink", "drinks", "lunch", "dinner", "cafe"],
  },
  {
    label: "Shopping",
    icon: ShoppingBag,
    accent: "#dc2626",
    keywords: ["shopping", "market", "store", "clothes", "item"],
  },
  {
    label: "Bills",
    icon: ReceiptText,
    accent: "#dc2626",
    keywords: ["bill", "bills", "electric", "gas", "water", "internet", "utility"],
  },
  {
    label: "Bank",
    icon: Landmark,
    accent: "#2563eb",
    keywords: ["bank", "jazzcash", "easypaisa", "wallet", "card"],
  },
  {
    label: "Goals",
    icon: Target,
    accent: "#7c3aed",
    keywords: ["goal", "goals", "target", "milestone"],
  },
];

export function getTransactionIconMeta({
  type,
  note,
  categoryName,
  parentCategoryName,
}: TransactionIconInput): TransactionIconMeta {
  const haystack = [type, note, categoryName, parentCategoryName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matched = MATCHERS.find((matcher) =>
    matcher.keywords.some((keyword) => haystack.includes(keyword)),
  );

  if (matched) return matched;

  if (type === "income") {
    return {
      label: "Income",
      icon: TrendingUp,
      accent: "#16a34a",
    };
  }

  if (type === "expense") {
    return {
      label: "Expense",
      icon: TrendingDown,
      accent: "#dc2626",
    };
  }

  if (type === "transfer") {
    return {
      label: "Transfer",
      icon: ArrowLeftRight,
      accent: "#2563eb",
    };
  }

  return {
    label: "Transaction",
    icon: WalletCards,
    accent: "#64748b",
  };
}

export function getTransactionToneClass(type?: string | null) {
  if (type === "income") {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (type === "expense") {
    return "text-red-600 dark:text-red-400";
  }

  return "text-blue-600 dark:text-blue-400";
}

export function getTransactionPrefix(type?: string | null) {
  if (type === "income") return "+ ";
  if (type === "expense") return "- ";
  return "";
}

export function getTransactionSoftStyle(accent: string) {
  return {
    color: accent,
    borderColor: `color-mix(in srgb, ${accent}, transparent 76%)`,
    backgroundColor: `color-mix(in srgb, ${accent}, transparent 92%)`,
  };
}
