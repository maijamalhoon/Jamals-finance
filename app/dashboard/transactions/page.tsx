import { Suspense, type ComponentProps } from "react";
import { ArrowLeftRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import ViewportTransactionList from "@/components/transactions/ViewportTransactionList";
import EmptyState from "@/components/ui/empty-state";
import { getTransactionIconMeta } from "@/lib/transaction-icons";
import { loadTransactions } from "@/lib/transactions";
import styles from "./transactions.module.css";

export const dynamic = "force-dynamic";

const STEP_LIMIT = 15;
const MAX_LIMIT = 100;

type SearchParams = {
  type?: string;
  search?: string;
  from?: string;
  to?: string;
  source?: string;
  category?: string;
  account?: string;
  person?: string;
  item?: string;
  min?: string;
  max?: string;
  sort?: string;
  limit?: string;
};

type TransactionSort = "newest" | "oldest" | "highest" | "lowest";
type TransactionListRow = ComponentProps<
  typeof ViewportTransactionList
>["transactions"][number];

function cleanSort(value?: string): TransactionSort {
  return value === "oldest" || value === "highest" || value === "lowest"
    ? value
    : "newest";
}

function transactionTime(value: unknown) {
  const parsed = new Date(String(value ?? "")).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function cleanLimit(value?: string) {
  if (!value || value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.min(Math.max(1, Math.floor(parsed)), MAX_LIMIT);
}

function cleanAmount(value?: string) {
  if (!value || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addParam(params: URLSearchParams, key: string, value?: string) {
  if (value && value.trim() !== "") {
    params.set(key, value);
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedSearchParams: SearchParams =
    (await Promise.resolve(searchParams)) ?? {};

  const type = resolvedSearchParams.type;
  const search = resolvedSearchParams.search;
  const from = resolvedSearchParams.from;
  const to = resolvedSearchParams.to;
  const source = resolvedSearchParams.source;
  const category = resolvedSearchParams.category;
  const account = resolvedSearchParams.account;
  const person = resolvedSearchParams.person;
  const item = resolvedSearchParams.item;
  const min = resolvedSearchParams.min;
  const max = resolvedSearchParams.max;
  const sort = cleanSort(resolvedSearchParams.sort);
  const requestedLimit = cleanLimit(resolvedSearchParams.limit);

  const supabase = await createClient();

  const searchTerm = search?.trim().toLowerCase();
  const sourceTerm = source?.trim().toLowerCase();
  const personTerm = person?.trim().toLowerCase();
  const itemTerm = item?.trim().toLowerCase();

  const minAmount = cleanAmount(min);
  const maxAmount = cleanAmount(max);

  const requestedDatabaseType =
    type === "payable"
      ? "expense"
      : type === "income" ||
          type === "expense" ||
          type === "refund" ||
          type === "investment" ||
          type === "goal" ||
          type === "transfer"
        ? type
        : undefined;

  const [rawTransactions, categoriesResult, accountsResult] = await Promise.all([
    loadTransactions(supabase, {
      type: requestedDatabaseType,
      from,
      to,
      category,
      account,
      minAmount,
      maxAmount,
      includeDeleted: true,
    }),
    supabase
      .from("categories")
      .select("id, name, parent_id")
      .order("name", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error) {
    console.error("[transactions] Category filters unavailable", {
      code: categoriesResult.error.code ?? "unknown",
    });
  }

  if (accountsResult.error) {
    console.error("[transactions] Account filters unavailable", {
      code: accountsResult.error.code ?? "unknown",
    });
  }

  const categoryRows = categoriesResult.data ?? [];
  const categoryById = new Map(
    categoryRows.map((row) => [row.id, row.name?.trim() || "Other"]),
  );
  const categoryOptions = categoryRows.map((row) => ({
    value: row.id,
    label:
      row.parent_id && categoryById.has(row.parent_id)
        ? `${categoryById.get(row.parent_id)} / ${row.name}`
        : row.name,
  }));
  const accountOptions = (accountsResult.data ?? []).map((row) => ({
    value: row.id,
    label: row.name,
  }));

  const transactions = ((rawTransactions ?? []) as TransactionListRow[])
    .filter(Boolean)
    .filter((transaction) => {
      const categoryName = transaction?.categories?.parent?.name
        ? `${transaction.categories.parent.name} ${transaction.categories?.name ?? ""}`
        : (transaction?.categories?.name ?? "");
      const accountName = transaction?.accounts?.name ?? "";
      const semanticType = getTransactionIconMeta({
        type: transaction?.type,
        note: transaction?.note,
        categoryName: transaction?.categories?.name,
        categoryIconKey: transaction?.categories?.icon_key,
        parentCategoryName: transaction?.categories?.parent?.name,
        sourceName: transaction?.source_name,
        itemName: transaction?.item_name,
      }).semanticType;
      const haystack = [
        transaction?.note,
        transaction?.source_name,
        transaction?.person_name,
        transaction?.item_name,
        transaction?.reference,
        categoryName,
        accountName,
        transaction?.type,
        semanticType,
        transaction?.deleted_at ? "deleted" : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (type === "payable" && semanticType !== "payable") return false;

      if (
        (type === "income" ||
          type === "expense" ||
          type === "refund" ||
          type === "investment" ||
          type === "goal" ||
          type === "transfer") &&
        String(transaction?.type) !== type
      ) {
        return false;
      }

      if (searchTerm && !haystack.includes(searchTerm)) return false;

      if (
        sourceTerm &&
        !String(transaction?.source_name ?? "")
          .toLowerCase()
          .includes(sourceTerm)
      ) {
        return false;
      }

      if (
        personTerm &&
        !String(transaction?.person_name ?? "")
          .toLowerCase()
          .includes(personTerm)
      ) {
        return false;
      }

      if (
        itemTerm &&
        !String(transaction?.item_name ?? "")
          .toLowerCase()
          .includes(itemTerm)
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      if (sort === "highest" || sort === "lowest") {
        const amountDifference =
          Number(right.amount ?? 0) - Number(left.amount ?? 0);
        return sort === "highest" ? amountDifference : -amountDifference;
      }

      const activityDifference =
        transactionTime(right.updated_at ?? right.created_at) -
        transactionTime(left.updated_at ?? left.created_at);
      if (activityDifference !== 0) {
        return sort === "newest" ? activityDifference : -activityDifference;
      }

      const createdDifference =
        transactionTime(right.created_at) - transactionTime(left.created_at);
      if (createdDifference !== 0) {
        return sort === "newest" ? createdDifference : -createdDifference;
      }

      const dateDifference =
        transactionTime(right.date) - transactionTime(left.date);
      return sort === "newest" ? dateDifference : -dateDifference;
    });

  const baseParams = new URLSearchParams();

  addParam(baseParams, "type", type);
  addParam(baseParams, "search", search);
  addParam(baseParams, "from", from);
  addParam(baseParams, "to", to);
  addParam(baseParams, "source", source);
  addParam(baseParams, "category", category);
  addParam(baseParams, "account", account);
  addParam(baseParams, "person", person);
  addParam(baseParams, "item", item);
  addParam(
    baseParams,
    "min",
    minAmount === null ? undefined : String(minAmount),
  );
  addParam(
    baseParams,
    "max",
    maxAmount === null ? undefined : String(maxAmount),
  );
  addParam(baseParams, "sort", sort === "newest" ? undefined : sort);

  return (
    <div className={`${styles.page} space-y-3 sm:space-y-5`}>
      <div className={styles.heading}>
        <h2 className="page-title">Transactions</h2>
      </div>

      <div className={styles.filtersShell}>
        <Suspense fallback={<div className="h-10 sm:mb-5 sm:h-12" />}>
          <TransactionFilters
            categories={categoryOptions}
            accounts={accountOptions}
          />
        </Suspense>
      </div>

      <div className="finance-panel min-w-0 overflow-hidden p-3 sm:p-5">
        {transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions found"
            description="Try changing filters or search."
          />
        ) : (
          <ViewportTransactionList
            transactions={transactions}
            requestedLimit={requestedLimit}
            baseQuery={baseParams.toString()}
            stepLimit={STEP_LIMIT}
            maxLimit={MAX_LIMIT}
          />
        )}
      </div>
    </div>
  );
}
