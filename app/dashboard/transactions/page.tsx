import { Suspense, type ComponentProps } from "react";
import { ArrowLeftRight } from "lucide-react";

import AddIncomeButton from "@/components/income/AddIncomeButton";
import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionSearchAutoClose from "@/components/transactions/TransactionSearchAutoClose";
import ViewportTransactionList from "@/components/transactions/ViewportTransactionList";
import EmptyState from "@/components/ui/empty-state";
import { getPaginationState } from "@/lib/pagination";
import { getTransactionIconMeta } from "@/lib/transaction-icons";
import { loadTransactions } from "@/lib/transactions";
import styles from "./transactions.module.css";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = {
  type?: string;
  search?: string;
  from?: string;
  to?: string;
  period?: string;
  source?: string;
  category?: string;
  account?: string;
  person?: string;
  item?: string;
  min?: string;
  max?: string;
  sort?: string;
  page?: string;
};

type TransactionSort = "newest" | "oldest" | "highest" | "lowest" | "name";
type TransactionListRow = ComponentProps<
  typeof ViewportTransactionList
>["transactions"][number];

function cleanSort(value?: string): TransactionSort {
  return value === "oldest" ||
    value === "highest" ||
    value === "lowest" ||
    value === "name"
    ? value
    : "newest";
}

function transactionTime(value: unknown) {
  const parsed = new Date(String(value ?? "")).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function transactionName(transaction: TransactionListRow) {
  const type = String(transaction?.type ?? "").toLowerCase();
  const parentName = transaction?.categories?.parent?.name?.trim();
  const categoryName = transaction?.categories?.name?.trim();

  if (type === "transfer") {
    return (
      transaction?.accounts?.name?.trim() ||
      transaction?.note?.trim() ||
      "Transfer"
    );
  }

  if (type === "goal") {
    return transaction?.item_name?.trim() || "Goal contribution";
  }

  if (type === "investment") {
    return transaction?.item_name?.trim() || categoryName || "Investment";
  }

  if (type === "refund") {
    return categoryName || transaction?.note?.trim() || "Expense refund";
  }

  if (parentName && categoryName) return `${parentName} / ${categoryName}`;
  if (categoryName) return categoryName;
  if (type === "income") return transaction?.source_name?.trim() || "Income";
  if (type === "expense") return "Expense";

  return (
    transaction?.item_name?.trim() ||
    transaction?.source_name?.trim() ||
    transaction?.person_name?.trim() ||
    transaction?.note?.trim() ||
    transaction?.accounts?.name?.trim() ||
    "Transaction"
  );
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
  const period = resolvedSearchParams.period;
  const source = resolvedSearchParams.source;
  const category = resolvedSearchParams.category;
  const account = resolvedSearchParams.account;
  const person = resolvedSearchParams.person;
  const item = resolvedSearchParams.item;
  const min = resolvedSearchParams.min;
  const max = resolvedSearchParams.max;
  const sort = cleanSort(resolvedSearchParams.sort);
  const page = resolvedSearchParams.page;

  const supabase = await createClient();

  const searchTerm = search?.trim().toLowerCase();
  const sourceTerm = source?.trim().toLowerCase();
  const personTerm = person?.trim().toLowerCase();
  const itemTerm = item?.trim().toLowerCase();

  const minAmount = cleanAmount(min);
  const maxAmount = cleanAmount(max);
  const hasActiveFilters = Boolean(
    type ||
      searchTerm ||
      from ||
      to ||
      sourceTerm ||
      category ||
      account ||
      personTerm ||
      itemTerm ||
      minAmount !== null ||
      maxAmount !== null ||
      sort !== "newest",
  );

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

  const rawTransactions = await loadTransactions(supabase, {
    type: requestedDatabaseType,
    from,
    to,
    category,
    account,
    minAmount,
    maxAmount,
    includeDeleted: true,
  });

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

      if (sort === "name") {
        const nameDifference = transactionName(left).localeCompare(
          transactionName(right),
          "en",
          { sensitivity: "base", numeric: true },
        );
        if (nameDifference !== 0) return nameDifference;
      }

      const dateDifference =
        transactionTime(right.date) - transactionTime(left.date);
      if (dateDifference !== 0) {
        return sort === "oldest" ? -dateDifference : dateDifference;
      }

      const createdDifference =
        transactionTime(right.created_at) - transactionTime(left.created_at);
      if (createdDifference !== 0) {
        return sort === "oldest" ? -createdDifference : createdDifference;
      }

      const activityDifference =
        transactionTime(right.updated_at ?? right.created_at) -
        transactionTime(left.updated_at ?? left.created_at);
      if (activityDifference !== 0) {
        return sort === "oldest" ? -activityDifference : activityDifference;
      }

      const idDifference = String(right.id ?? "").localeCompare(
        String(left.id ?? ""),
      );
      return sort === "oldest" ? -idDifference : idDifference;
    });

  const pagination = getPaginationState(transactions.length, page, PAGE_SIZE);
  const visibleTransactions = transactions.slice(
    pagination.startIndex,
    pagination.endIndex,
  );

  const baseParams = new URLSearchParams();

  addParam(baseParams, "type", type);
  addParam(baseParams, "search", search);
  addParam(baseParams, "from", from);
  addParam(baseParams, "to", to);
  addParam(baseParams, "period", period);
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
          <>
            <TransactionFilters />
            <TransactionSearchAutoClose />
          </>
        </Suspense>
      </div>

      <div className="finance-panel min-w-0 overflow-hidden p-3 sm:p-5">
        {transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={hasActiveFilters ? "No transactions found" : "No transactions yet"}
            description={
              hasActiveFilters
                ? "Try changing the filters or search."
                : "Your account activity will appear here."
            }
            action={
              hasActiveFilters ? undefined : (
                <AddIncomeButton
                  label="Add a transaction"
                  showIcon={false}
                />
              )
            }
          />
        ) : (
          <ViewportTransactionList
            transactions={visibleTransactions}
            pagination={pagination}
            basePath="/dashboard/transactions"
            baseQuery={baseParams.toString()}
            groupByMonth={sort === "newest" || sort === "oldest"}
          />
        )}
      </div>
    </div>
  );
}
