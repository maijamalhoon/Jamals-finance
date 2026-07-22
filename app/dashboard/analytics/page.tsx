import AnalyticsClient from "@/components/analytics/AnalyticsClient";
import type { AnalyticsTransferData } from "@/lib/analytics/account-activity";
import {
  calculateInvestmentMetrics,
  getCombinedQueryRange,
  hasPartialAccountMetadata,
  parseAnalyticsSearchParams,
  parseDateKey,
  toFiniteNumber,
  type AnalyticsAccountStatus,
  type AnalyticsInvestmentData,
  type AnalyticsSearchParams,
  type AnalyticsTransactionData,
} from "@/lib/analytics/calculations";
import { formatDateKey, getAppDateKey } from "@/lib/dates";
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
  category_id?: string | null;
  account_id?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  deleted_at?: string | null;
  categories?: RawCategory | RawCategory[] | null;
}

interface RawAccount {
  id?: string | null;
  name?: string | null;
  type?: string | null;
}

interface RawTransfer {
  id?: string | null;
  amount?: number | string | null;
  transfer_date?: string | null;
  deleted_at?: string | null;
  from_account?: RawAccount | RawAccount[] | null;
  to_account?: RawAccount | RawAccount[] | null;
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
  crypto: "var(--chart-series-3)",
  stocks: "var(--chart-series-1)",
  stock: "var(--chart-series-1)",
  mutual_fund: "var(--chart-series-2)",
  mutualfund: "var(--chart-series-2)",
  fund: "var(--chart-series-2)",
  savings: "var(--chart-series-2)",
  real_estate: "var(--chart-series-4)",
  other: "var(--chart-series-5)",
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function getCategoryDetail(
  category: RawCategory | RawCategory[] | null | undefined,
  storedCategoryId: string | null | undefined,
) {
  const selected = Array.isArray(category) ? category[0] : category;
  return {
    id: selected?.id?.trim() || storedCategoryId?.trim() || "uncategorized",
    name: selected?.name?.trim() || "Other",
    color: selected?.color?.trim() || null,
  };
}

function sanitizeTransactions(
  rows: RawTransaction[],
  accountLookup: ReadonlyMap<string, RawAccount>,
) {
  return rows.flatMap<AnalyticsTransactionData>((transaction) => {
    const id = transaction.id?.trim();
    const date = parseDateKey(transaction.date);
    const amount = toFiniteNumber(transaction.amount);
    const type = transaction.type?.trim().toLowerCase();

    if (
      transaction.deleted_at ||
      !id ||
      !date ||
      amount === null ||
      amount <= 0 ||
      (type !== "income" && type !== "expense" && type !== "refund")
    ) {
      return [];
    }

    const accountId = transaction.account_id?.trim() || null;
    const account = accountId ? accountLookup.get(accountId) : null;
    const category = getCategoryDetail(transaction.categories, transaction.category_id);

    return [
      {
        id,
        amount,
        date: formatDateKey(date.year, date.month, date.day),
        type,
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        accountId,
        accountName: account?.name?.trim() || null,
        accountType: account?.type?.trim() || null,
        sourceName: transaction.source_name?.trim() || null,
        personName: transaction.person_name?.trim() || null,
        itemName: transaction.item_name?.trim() || null,
      },
    ];
  });
}

function sanitizeTransfers(rows: RawTransfer[]) {
  return rows.flatMap<AnalyticsTransferData>((transfer) => {
    const id = transfer.id?.trim();
    const date = parseDateKey(transfer.transfer_date);
    const amount = toFiniteNumber(transfer.amount);
    const from = firstRelation(transfer.from_account);
    const to = firstRelation(transfer.to_account);
    const fromAccountId = from?.id?.trim() || null;
    const toAccountId = to?.id?.trim() || null;

    if (
      transfer.deleted_at ||
      !id ||
      !date ||
      amount === null ||
      amount <= 0 ||
      (!fromAccountId && !toAccountId)
    ) {
      return [];
    }

    return [
      {
        id,
        amount,
        date: formatDateKey(date.year, date.month, date.day),
        fromAccountId,
        fromAccountName: from?.name?.trim() || null,
        toAccountId,
        toAccountName: to?.name?.trim() || null,
      },
    ];
  });
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<AnalyticsSearchParams>;
}) {
  const supabase = await createClient();
  const now = getAppDateKey();
  const parsedSearch = parseAnalyticsSearchParams((await searchParams) ?? {}, now);
  const queryRange = getCombinedQueryRange(parsedSearch.selection);

  const [
    transactionsResult,
    transfersResult,
    investmentsResult,
    transactionCountResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, amount, date, type, category_id, account_id, source_name, person_name, item_name, deleted_at, categories(id, name, color)",
      )
      .is("deleted_at", null)
      .gte("date", queryRange.start)
      .lte("date", queryRange.end)
      .order("date", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("account_transfers")
      .select(
        "id, amount, transfer_date, deleted_at, from_account:from_account_id(id, name, type), to_account:to_account_id(id, name, type)",
      )
      .is("deleted_at", null)
      .gte("transfer_date", queryRange.start)
      .lte("transfer_date", queryRange.end)
      .order("transfer_date", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("investments")
      .select(
        "id, name, symbol, type, quantity, purchase_price, current_price, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
  ]);

  if (transactionsResult.error) {
    console.error("[analytics] Transactions query failed", {
      code: transactionsResult.error.code,
    });
  }
  if (transfersResult.error) {
    console.error("[analytics] Transfers query failed", {
      code: transfersResult.error.code,
    });
  }
  if (investmentsResult.error) {
    console.error("[analytics] Investments query failed", {
      code: investmentsResult.error.code,
    });
  }
  if (transactionCountResult.error) {
    console.error("[analytics] Transaction count query failed", {
      code: transactionCountResult.error.code,
    });
  }

  const rawTransactions = (transactionsResult.data ?? []) as RawTransaction[];
  const accountIds = Array.from(
    new Set(
      rawTransactions
        .map((row) => row.account_id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ).sort((left, right) => left.localeCompare(right));

  let accountStatus: AnalyticsAccountStatus = "available";
  let rawAccounts: RawAccount[] = [];
  if (!transactionsResult.error && accountIds.length > 0) {
    const accountsResult = await supabase
      .from("accounts")
      .select("id, name, type")
      .in("id", accountIds);

    if (accountsResult.error) {
      accountStatus = "partial";
      console.error("[analytics] Account labels query failed", {
        code: accountsResult.error.code,
      });
    } else {
      rawAccounts = (accountsResult.data ?? []) as RawAccount[];
      if (
        hasPartialAccountMetadata(
          accountIds,
          rawAccounts.map((account) => account.id),
        )
      ) {
        accountStatus = "partial";
      }
    }
  }

  const accountLookup = new Map(
    rawAccounts.flatMap((account) => {
      const id = account.id?.trim();
      return id ? [[id, account] as const] : [];
    }),
  );

  const transactions = sanitizeTransactions(rawTransactions, accountLookup);
  const transfers = transfersResult.error
    ? []
    : sanitizeTransfers((transfersResult.data ?? []) as RawTransfer[]);
  const investments = (
    (investmentsResult.data ?? []) as RawInvestment[]
  ).flatMap<AnalyticsInvestmentData>((investment) => {
    const id = investment.id?.trim();
    const metrics = calculateInvestmentMetrics(
      investment.quantity,
      investment.purchase_price,
      investment.current_price,
    );
    if (!id || !metrics) return [];

    const rawType = String(investment.type || "other").trim().toLowerCase();
    return [
      {
        id,
        name: investment.name?.trim() || "Unnamed investment",
        symbol: investment.symbol?.trim() || null,
        type: titleCase(rawType),
        ...metrics,
        color: INVESTMENT_TYPE_COLORS[rawType] ?? INVESTMENT_TYPE_COLORS.other,
      },
    ];
  });

  return (
    <AnalyticsClient
      transactions={transactions}
      transfers={transfers}
      investments={investments}
      transactionsStatus={transactionsResult.error ? "error" : "available"}
      transfersStatus={transfersResult.error ? "error" : "available"}
      accountsStatus={accountStatus}
      investmentsStatus={investmentsResult.error ? "error" : "available"}
      hasAnyTransactions={
        transactionCountResult.error
          ? null
          : (transactionCountResult.count ?? 0) > 0
      }
      selection={parsedSearch.selection}
      invalidRangeWasReset={parsedSearch.wasReset}
      now={now}
    />
  );
}
