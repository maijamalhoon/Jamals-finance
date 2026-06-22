import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  PiggyBank,
  ReceiptText,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type TransactionIconMeta = {
  label: string;
  icon: LucideIcon;
  accent: string;
};

type TransactionIconInput = {
  type?: "income" | "expense" | string | null;
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
    accent: "#3b82f6",
    keywords: ["transfer", "moved", "wallet to", "bank to", "account to"],
  },
  {
    label: "Savings",
    icon: PiggyBank,
    accent: "#22c55e",
    keywords: ["saving", "savings", "save", "reserve", "emergency fund"],
  },
  {
    label: "Bills",
    icon: ReceiptText,
    accent: "#f59e0b",
    keywords: ["bill", "bills", "electric", "gas", "water", "internet", "utility"],
  },
  {
    label: "Goals",
    icon: Target,
    accent: "#8b5cf6",
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

  if (matched) {
    return {
      label: matched.label,
      icon: matched.icon,
      accent: matched.accent,
    };
  }

  if (type === "income") {
    return { label: "Income", icon: ArrowDownLeft, accent: "#22c55e" };
  }

  if (type === "expense") {
    return { label: "Expense", icon: ArrowUpRight, accent: "#ef4444" };
  }

  return { label: "Transaction", icon: WalletCards, accent: "#818cf8" };
}
