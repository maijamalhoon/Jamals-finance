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
import { FEATURE_COLOR_CSS } from "@/lib/theme-colors";

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
    accent: FEATURE_COLOR_CSS.transfer,
    keywords: ["transfer", "moved", "wallet to", "bank to", "account to"],
  },
  {
    label: "Ride",
    icon: Car,
    accent: FEATURE_COLOR_CSS.primary,
    keywords: ["ride", "rides", "indrive", "careem", "uber", "bike"],
  },
  {
    label: "Food",
    icon: Coffee,
    accent: FEATURE_COLOR_CSS.expense,
    keywords: ["food", "dining", "drink", "drinks", "lunch", "dinner", "cafe"],
  },
  {
    label: "Shopping",
    icon: ShoppingBag,
    accent: FEATURE_COLOR_CSS.expense,
    keywords: ["shopping", "market", "store", "clothes", "item"],
  },
  {
    label: "Bills",
    icon: ReceiptText,
    accent: FEATURE_COLOR_CSS.payables,
    keywords: ["bill", "bills", "electric", "gas", "water", "internet", "utility"],
  },
  {
    label: "Bank",
    icon: Landmark,
    accent: FEATURE_COLOR_CSS.transfer,
    keywords: ["bank", "jazzcash", "easypaisa", "wallet", "card"],
  },
  {
    label: "Goals",
    icon: Target,
    accent: FEATURE_COLOR_CSS.goals,
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
      accent: FEATURE_COLOR_CSS.income,
    };
  }

  if (type === "expense") {
    return {
      label: "Expense",
      icon: TrendingDown,
      accent: FEATURE_COLOR_CSS.expense,
    };
  }

  if (type === "transfer") {
    return {
      label: "Transfer",
      icon: ArrowLeftRight,
      accent: FEATURE_COLOR_CSS.transfer,
    };
  }

  return {
    label: "Transaction",
    icon: WalletCards,
    accent: FEATURE_COLOR_CSS.muted,
  };
}

export function getTransactionToneClass(type?: string | null) {
  if (type === "income") {
    return "text-income";
  }

  if (type === "expense") {
    return "text-expense";
  }

  return "text-transfer";
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
