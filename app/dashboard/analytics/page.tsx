import AnalyticsClient, {
  type AnalyticsInvestmentData,
  type AnalyticsTransactionData,
} from "@/components/analytics/AnalyticsClient";
import { formatDateKey, getAppDateKey, getAppDateParts } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RawCategory {
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
  type?: string | null;
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
  created_at?: string | null;
}

interface RawAccount {
  balance?: number | string | null;
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

function tickerFromName(name: string, type: string) {
  const clean = name.trim();

  if (!clean) return titleCase(type).slice(0, 6).toUpperCase();

  const words = clean.split(/\s+/);

  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();

  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

function getCategoryName(
  category: RawCategory | RawCategory[] | null | undefined,
) {
  const selected = Array.isArray(category) ? category[0] : category;
  return selected?.name || "Other";
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const now = getAppDateParts();
  const oldestNeededDate = formatDateKey(now.year - 1, 1, 1);

  const [
    { data: rawTransactions },
    { data: rawInvestments },
    { data: rawAccounts },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, date, type, categories(name, color)")
      .gte("date", oldestNeededDate)
      .lte("date", getAppDateKey()),
    supabase
      .from("investments")
      .select(
        "id, name, type, quantity, purchase_price, current_price, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("balance"),
  ]);

  const transactions: AnalyticsTransactionData[] = (
    (rawTransactions ?? []) as RawTransaction[]
  )
    .filter(
      (transaction) =>
        transaction.date && transaction.amount && transaction.type,
    )
    .map((transaction, index) => ({
      id: transaction.id || `transaction-${index}`,
      amount: Number(transaction.amount) || 0,
      date: transaction.date as string,
      type: String(transaction.type || "").toLowerCase(),
      categoryName: getCategoryName(transaction.categories),
    }));

  const accountsTotal = ((rawAccounts ?? []) as RawAccount[]).reduce(
    (sum, account) => sum + (Number(account.balance) || 0),
    0,
  );

  const investments: AnalyticsInvestmentData[] = (
    (rawInvestments ?? []) as RawInvestment[]
  )
    .slice(0, 4)
    .map((investment, index) => {
      const rawType = String(investment.type || "other").toLowerCase();
      const quantity = Number(investment.quantity) || 0;
      const purchasePrice = Number(investment.purchase_price) || 0;
      const currentPrice = Number(investment.current_price) || 0;
      const invested = quantity * purchasePrice;
      const value = quantity * currentPrice;
      const pnl = value - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const name = investment.name || `Investment ${index + 1}`;

      return {
        id: investment.id || `investment-${index}`,
        name,
        ticker: tickerFromName(name, rawType),
        type: titleCase(rawType),
        value,
        pnl,
        pnlPct: Number(pnlPct.toFixed(1)),
        color: INVESTMENT_TYPE_COLORS[rawType] ?? INVESTMENT_TYPE_COLORS.other,
      };
    });

  return (
    <AnalyticsClient
      transactions={transactions}
      investments={investments}
      accountsTotal={accountsTotal}
    />
  );
}
