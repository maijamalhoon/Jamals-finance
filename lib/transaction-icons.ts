import {
  ArrowLeftRight,
  BriefcaseBusiness,
  HandCoins,
  ReceiptText,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import {
  getCategoryIconComponent,
  getSemanticCategoryIconKey,
  type CategoryKind,
} from "@/lib/category-visuals";
import { FEATURE_COLOR_CSS } from "@/lib/theme-colors";

export type TransactionIconMeta = {
  label: string;
  icon: LucideIcon;
  accent: string;
  semanticType:
    | "income"
    | "expense"
    | "transfer"
    | "investment"
    | "payable"
    | "goal"
    | "refund"
    | "transaction";
};

type TransactionIconInput = {
  type?:
    | "income"
    | "expense"
    | "transfer"
    | "investment"
    | "goal"
    | "refund"
    | string
    | null;
  note?: string | null;
  categoryName?: string | null;
  categoryIconKey?: string | null;
  parentCategoryName?: string | null;
  sourceName?: string | null;
  itemName?: string | null;
};

function normalizedText(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").trim().toLowerCase();
}

function isPayableContext(value: string) {
  return [
    "payable",
    "liability",
    "debt repayment",
    "debt payment",
    "loan repayment",
    "payment returned to",
  ].some((keyword) => value.includes(keyword));
}

function isGoalContext(value: string) {
  return ["goal contribution", "goal allocation", "savings goal"].some(
    (keyword) => value.includes(keyword),
  );
}

function getCategoryIcon(
  type: CategoryKind,
  categoryName?: string | null,
  parentCategoryName?: string | null,
  note?: string | null,
  categoryIconKey?: string | null,
) {
  if (categoryIconKey) return getCategoryIconComponent(categoryIconKey);

  const semanticName =
    categoryName?.trim() || parentCategoryName?.trim() || note?.trim() || "";
  return getCategoryIconComponent(
    getSemanticCategoryIconKey(semanticName, type),
  );
}

/**
 * One shared visual resolver for the Transactions page and dashboard Recent
 * Transactions card. Category icon identity stays stable, while transaction
 * direction controls the display colour: income green, expense red, and the
 * dedicated finance tones for transfers, investments, payables and goals.
 */
export function getTransactionIconMeta({
  type,
  note,
  categoryName,
  categoryIconKey,
  parentCategoryName,
  sourceName,
  itemName,
}: TransactionIconInput): TransactionIconMeta {
  const normalizedType = type?.trim().toLowerCase() ?? "";
  const context = normalizedText([
    normalizedType,
    note,
    categoryName,
    parentCategoryName,
    sourceName,
    itemName,
  ]);

  if (normalizedType === "transfer") {
    return {
      label: "Transfer",
      icon: ArrowLeftRight,
      accent: FEATURE_COLOR_CSS.transfer,
      semanticType: "transfer",
    };
  }

  if (normalizedType === "goal" || isGoalContext(context)) {
    return {
      label: "Goal contribution",
      icon: Target,
      accent: FEATURE_COLOR_CSS.goals,
      semanticType: "goal",
    };
  }

  if (normalizedType === "investment") {
    return {
      label: "Investment contribution",
      icon: BriefcaseBusiness,
      accent: FEATURE_COLOR_CSS.investment,
      semanticType: "investment",
    };
  }

  if (normalizedType === "refund") {
    return {
      label: "Expense refund",
      icon: RotateCcw,
      accent: FEATURE_COLOR_CSS.transfer,
      semanticType: "refund",
    };
  }

  if (normalizedType === "income") {
    return {
      label: "Income",
      icon: getCategoryIcon(
        "income",
        categoryName,
        parentCategoryName,
        note,
        categoryIconKey,
      ),
      accent: FEATURE_COLOR_CSS.income,
      semanticType: "income",
    };
  }

  if (normalizedType === "expense") {
    const payable = isPayableContext(context);
    return {
      label: payable ? "Payable payment" : "Expense",
      icon:
        payable && !categoryIconKey && !categoryName
          ? HandCoins
          : getCategoryIcon(
              "expense",
              categoryName,
              parentCategoryName,
              note,
              categoryIconKey,
            ),
      accent: payable ? FEATURE_COLOR_CSS.payables : FEATURE_COLOR_CSS.expense,
      semanticType: payable ? "payable" : "expense",
    };
  }

  return {
    label: "Transaction",
    icon: ReceiptText,
    accent: FEATURE_COLOR_CSS.muted,
    semanticType: "transaction",
  };
}

export function getTransactionToneClass(type?: string | null) {
  if (type === "income") return "text-income";
  if (type === "expense") return "text-expense";
  if (type === "investment") return "text-investment";
  if (type === "goal") return "text-goals";
  if (type === "refund") return "text-info";
  return "text-transfer";
}

export function getTransactionPrefix(type?: string | null) {
  if (type === "income" || type === "refund") return "+ ";
  if (type === "expense" || type === "investment") return "- ";
  return "";
}

export function getTransactionSoftStyle(accent: string) {
  return {
    color: accent,
    borderColor: `color-mix(in srgb, ${accent}, transparent 76%)`,
    backgroundColor: `color-mix(in srgb, ${accent}, transparent 92%)`,
  };
}
