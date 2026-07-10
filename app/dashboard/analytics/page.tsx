import AnalyticsClient from "@/components/analytics/AnalyticsClient";
import {
  calculateInvestmentMetrics,
  parseDateKey,
  toFiniteNumber,
  type AnalyticsInvestmentData,
  type AnalyticsTransactionData,
} from "@/lib/analytics/calculations";
import { formatDateKey, getAppDateKey, getAppDateParts } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RawCategory {
  id?: string | null;
  name?: string | null;
  color?: string | null;
}

interface RawTransaction {
  id?: string | null;
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
  categories?: RawCategory | RawCategory[] | null;
}

interface RawInvestment {
  id?: string | null;
  name?: string | null;
  symbol?: string | null;
  type?: string | null;
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
  created_at?: string | null;
}

const INVESTMENT_TYPE_COLORS: Record<string, string> = {
  crypto: "#ff9700",
  stocks: "#4f83ff",
  stock: "#4f83ff",
  mutual_fund: "#22c55e",
  mutualfund: "#22c55e",
  fund: "#22c55e",
  savings: "#22c55e",
  real_estate: "#a855f7",
  other: "#64748b",
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCategoryDetail(
  category: RawCategory | RawCategory[] | null | undefined,
) {
  const selected = Array.isArray(category) ? category[0] : category;

  return {
    id: selected?.id || "uncategorized",
    name: selected?.name?.trim() || "Other",
    color: selected?.color ?? null,
  };
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const nowKey = getAppDateKey();
  const now = getAppDateParts();
  const oldestNeededDate = formatDateKey(now.year - 1, 1, 1);

  const [transactionsResult, investmentsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, date, type, categories(id, name, color)")
      .gte("date", oldestNeededDate)
      .lte("date", nowKey),
    supabase
      .from("investments")
      .select(
        "id, name, symbol, type, quantity, purchase_price, current_price, created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (transactionsResult.error) {
    console.error("[analytics] Transactions query failed", {
      code: transactionsResult.error.code,
    });
  }

  if (investmentsResult.error) {
    console.error("[analytics] Investments query failed", {
      code: investmentsResult.error.code,
    });
  }

  const transactions: AnalyticsTransactionData[] = (
    (transactionsResult.data ?? []) as RawTransaction[]
  ).flatMap((transaction, index) => {
    const date = parseDateKey(transaction.date);
    const amount = toFiniteNumber(transaction.amount);
    const type = String(transaction.type || "").toLowerCase();

    if (!date || amount === null || amount <= 0 || !["income", "expense"].includes(type)) {
      return [];
    }

    const category = getCategoryDetail(transaction.categories);

    return [
      {
        id: transaction.id || `transaction-row-${index}`,
        amount,
        date: formatDateKey(date.year, date.month, date.day),
        type,
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
      },
    ];
  });

  const investments: AnalyticsInvestmentData[] = (
    (investmentsResult.data ?? []) as RawInvestment[]
  ).flatMap((investment, index) => {
    const metrics = calculateInvestmentMetrics(
      investment.quantity,
      investment.purchase_price,
      investment.current_price,
    );

    if (!metrics) return [];

    const rawType = String(investment.type || "other").toLowerCase();
    const storedName = investment.name?.trim();
    const storedSymbol = investment.symbol?.trim();

    return [
      {
        id: investment.id || `investment-row-${index}`,
        name: storedName || "Unnamed investment",
        symbol: storedSymbol || null,
        type: titleCase(rawType),
        ...metrics,
        color:
          INVESTMENT_TYPE_COLORS[rawType] ?? INVESTMENT_TYPE_COLORS.other,
      },
    ];
  });

  return (
    <AnalyticsClient
      transactions={transactions}
      investments={investments}
      transactionsStatus={transactionsResult.error ? "error" : "available"}
      investmentsStatus={investmentsResult.error ? "error" : "available"}
      now={nowKey}
    />
  );
}
