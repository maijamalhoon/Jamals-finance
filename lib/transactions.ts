type TransactionLoadOptions = {
  type?: "income" | "expense" | "investment" | "refund" | "transfer";
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  parent_id?: string | null;
};

type AccountTransferRow = {
  id: string;
  amount?: number | string | null;
  transfer_date: string;
  note?: string | null;
  reference?: string | null;
  created_at?: string | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
  from_account?: { name?: string | null } | { name?: string | null }[] | null;
  to_account?: { name?: string | null } | { name?: string | null }[] | null;
};

type DatedTransaction = {
  date?: string | null;
  created_at?: string | null;
  id?: string | number | null;
};

export type LoadedTransaction = DatedTransaction & {
  id: string;
  date: string;
  type?: string | null;
  amount?: number | string | null;
  note?: string | null;
  reference?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  categories?: (CategoryRow & { parent?: { name?: string | null } | null }) | null;
  accounts?: { name?: string | null } | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
};

function getSortTime(value?: string | null) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getRelationName(
  value: { name?: string | null } | { name?: string | null }[] | null | undefined,
) {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation?.name?.trim() || null;
}

function mapAccountTransfer(row: AccountTransferRow) {
  const fromName = getRelationName(row.from_account) || "From account";
  const toName = getRelationName(row.to_account) || "To account";

  return {
    id: row.id,
    type: "transfer" as const,
    amount: row.amount,
    note: row.note,
    reference: row.reference,
    date: row.transfer_date,
    created_at: row.created_at,
    source_name: null,
    person_name: null,
    item_name: null,
    categories: null,
    accounts: { name: `${fromName} -> ${toName}` },
    from_account_id: row.from_account_id,
    to_account_id: row.to_account_id,
  };
}

export function sortTransactionsNewestFirst<T extends DatedTransaction>(
  transactions: T[],
) {
  return [...transactions].sort((a, b) => {
    const dateDiff = getSortTime(b.date) - getSortTime(a.date);
    if (dateDiff !== 0) return dateDiff;

    const createdDiff = getSortTime(b.created_at) - getSortTime(a.created_at);
    if (createdDiff !== 0) return createdDiff;

    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });
}

export async function loadTransactions(
  supabase: SupabaseClient,
  options: TransactionLoadOptions = {},
): Promise<LoadedTransaction[]> {
  let rows: LoadedTransaction[] = [];

  if (options.type !== "transfer") {
    let query = supabase
      .from("transactions")
      .select("*, categories(id, name, color, parent_id), accounts(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (options.type) query = query.eq("type", options.type);
    if (options.from) query = query.gte("date", options.from);
    if (options.to) query = query.lte("date", options.to);
    if (options.category && options.category !== "all") {
      query = query.eq("category_id", options.category);
    }
    if (options.account && options.account !== "all") {
      query = query.eq("account_id", options.account);
    }
    if (
      typeof options.minAmount === "number" &&
      Number.isFinite(options.minAmount)
    ) {
      query = query.gte("amount", options.minAmount);
    }
    if (
      typeof options.maxAmount === "number" &&
      Number.isFinite(options.maxAmount)
    ) {
      query = query.lte("amount", options.maxAmount);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load transactions", {
        code: error.code ?? "unknown",
      });
    } else {
      rows = (data ?? []) as unknown as LoadedTransaction[];
    }
  }

  const categoryFilterActive = Boolean(
    options.category && options.category !== "all",
  );
  const shouldLoadTransfers =
    !categoryFilterActive && (!options.type || options.type === "transfer");

  if (shouldLoadTransfers) {
    let transferQuery = supabase
      .from("account_transfers")
      .select(
        "id, amount, transfer_date, note, reference, created_at, from_account_id, to_account_id, from_account:from_account_id(name), to_account:to_account_id(name)",
      )
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (options.from) transferQuery = transferQuery.gte("transfer_date", options.from);
    if (options.to) transferQuery = transferQuery.lte("transfer_date", options.to);
    if (
      typeof options.minAmount === "number" &&
      Number.isFinite(options.minAmount)
    ) {
      transferQuery = transferQuery.gte("amount", options.minAmount);
    }
    if (
      typeof options.maxAmount === "number" &&
      Number.isFinite(options.maxAmount)
    ) {
      transferQuery = transferQuery.lte("amount", options.maxAmount);
    }

    const { data: transfers, error: transferError } = await transferQuery;
    if (transferError) {
      console.error("Failed to load account transfers", {
        code: transferError.code ?? "unknown",
      });
    } else {
      const accountFilter =
        options.account && options.account !== "all" ? options.account : null;
      const mappedTransfers = ((transfers ?? []) as AccountTransferRow[])
        .filter(
          (transfer) =>
            !accountFilter ||
            transfer.from_account_id === accountFilter ||
            transfer.to_account_id === accountFilter,
        )
        .map(mapAccountTransfer);
      rows = [...rows, ...mappedTransfers];
    }
  }
  const parentIds = Array.from(
    new Set(
      rows
        .map((transaction) => transaction.categories?.parent_id)
        .filter(Boolean),
    ),
  );

  if (parentIds.length === 0) return sortTransactionsNewestFirst(rows);

  const { data: parents, error: parentError } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", parentIds);

  if (parentError) {
    console.error("Failed to load parent categories", {
      code: parentError.code ?? "unknown",
    });
    return sortTransactionsNewestFirst(rows);
  }

  const parentById = new Map(
    (parents ?? []).map((category: Pick<CategoryRow, "id" | "name">) => [
      category.id,
      { name: category.name },
    ]),
  );

  return sortTransactionsNewestFirst(
    rows.map((transaction) => {
      const category = transaction.categories as CategoryRow | null;
      if (!category?.parent_id) return transaction;

      return {
        ...transaction,
        categories: {
          ...category,
          parent: parentById.get(category.parent_id) ?? null,
        },
      };
    }),
  );
}
import type { SupabaseClient } from "@supabase/supabase-js";
