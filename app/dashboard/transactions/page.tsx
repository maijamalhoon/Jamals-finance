import Link from "next/link";
import { Suspense, type ComponentProps } from "react";
import { ArrowLeftRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionRow from "@/components/transactions/TransactionRow";
import EmptyState from "@/components/ui/empty-state";
import { getTransactionIconMeta } from "@/lib/transaction-icons";
import { loadTransactions } from "@/lib/transactions";
import styles from "./transactions.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 8;
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
type TransactionListRow = ComponentProps<typeof TransactionRow>["tx"];

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
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(DEFAULT_LIMIT, parsed), MAX_LIMIT);
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
  const limit = resolvedSearchParams.limit;

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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (type === "payable" && semanticType !== "payable") {
        return false;
      }

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

      const createdDifference =
        transactionTime(right.created_at) - transactionTime(left.created_at);
      if (createdDifference !== 0) {
        return sort === "newest" ? createdDifference : -createdDifference;
      }

      const dateDifference =
        transactionTime(right.date) - transactionTime(left.date);
      return sort === "newest" ? dateDifference : -dateDifference;
    });

  const visibleLimit = cleanLimit(limit);
  const visibleTransactions = transactions.slice(0, visibleLimit);

  const hasMore =
    visibleTransactions.length < transactions.length &&
    visibleLimit < MAX_LIMIT;

  const nextLimit = Math.min(
    visibleLimit + STEP_LIMIT,
    MAX_LIMIT,
    transactions.length,
  );

  const nextParams = new URLSearchParams();

  addParam(nextParams, "type", type);
  addParam(nextParams, "search", search);
  addParam(nextParams, "from", from);
  addParam(nextParams, "to", to);
  addParam(nextParams, "source", source);
  addParam(nextParams, "category", category);
  addParam(nextParams, "account", account);
  addParam(nextParams, "person", person);
  addParam(nextParams, "item", item);
  addParam(
    nextParams,
    "min",
    minAmount === null ? undefined : String(minAmount),
  );
  addParam(
    nextParams,
    "max",
    maxAmount === null ? undefined : String(maxAmount),
  );
  addParam(nextParams, "sort", sort === "newest" ? undefined : sort);

  nextParams.set("limit", String(nextLimit));

  return (
    <div className={`${styles.page} space-y-3 sm:space-y-5`}>
      <div className="page-heading finance-surface-glass overflow-hidden">
        <div className="min-w-0">
          <h2 className="page-title">Transactions</h2>
          <p className="page-subtitle">
            Showing {visibleTransactions.length} of {transactions.length}{" "}
            transaction{transactions.length !== 1 ? "s" : ""}
          </p>
        </div>
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
          <>
            <div className="space-y-1">
              {visibleTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>

            {hasMore ? (
              <div className="mt-5 flex flex-col items-center justify-center gap-2 border-t border-border pt-5">
                <Link
                  href={`/dashboard/transactions?${nextParams.toString()}`}
                  scroll={false}
                  className="finance-focus inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-bold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:shadow-md"
                >
                  Show{" "}
                  {Math.min(
                    STEP_LIMIT,
                    transactions.length - visibleTransactions.length,
                  )}{" "}
                  more
                </Link>

                <p className="text-xs text-text-secondary">
                  {visibleTransactions.length} shown,{" "}
                  {transactions.length - visibleTransactions.length} remaining
                </p>
              </div>
            ) : transactions.length > MAX_LIMIT ? (
              <p className="mt-5 border-t border-border pt-5 text-center text-xs text-text-secondary">
                Showing first {MAX_LIMIT}. Use filters to narrow results.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
