import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeftRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionRow from "@/components/transactions/TransactionRow";
import EmptyState from "@/components/ui/empty-state";
import { loadTransactions } from "@/lib/transactions";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 15;
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
  limit?: string;
};

function cleanLimit(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(DEFAULT_LIMIT, parsed), MAX_LIMIT);
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
  const limit = resolvedSearchParams.limit;

  const supabase = await createClient();

  const searchTerm = search?.trim().toLowerCase();
  const sourceTerm = source?.trim().toLowerCase();
  const personTerm = person?.trim().toLowerCase();
  const itemTerm = item?.trim().toLowerCase();

  const minAmount = min ? Number(min) : null;
  const maxAmount = max ? Number(max) : null;

  const rawTransactions = await loadTransactions(supabase, {
    type: type === "income" || type === "expense" ? type : undefined,
    from,
    to,
    category,
    account,
    minAmount,
    maxAmount,
  });

  const transactions = (rawTransactions ?? [])
    .filter(Boolean)
    .filter((transaction: any) => {
      const categoryName =
        transaction?.categories?.parent?.name ?
          `${transaction.categories.parent.name} ${transaction.categories?.name ?? ""}`
        : (transaction?.categories?.name ?? "");

      const accountName = transaction?.accounts?.name ?? "";

      const haystack = [
        transaction?.note,
        transaction?.source_name,
        transaction?.person_name,
        transaction?.item_name,
        categoryName,
        accountName,
        transaction?.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (
        (type === "income" || type === "expense" || type === "transfer") &&
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
  addParam(nextParams, "min", min);
  addParam(nextParams, "max", max);

  nextParams.set("limit", String(nextLimit));

  return (
    <div className="space-y-5">
      <div className="page-heading finance-surface-glass overflow-hidden">
        <div className="min-w-0">
          <h2 className="page-title">Transactions</h2>
          <p className="page-subtitle">
            Showing {visibleTransactions.length} of {transactions.length}{" "}
            transaction{transactions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="mb-5 h-12" />}>
        <TransactionFilters />
      </Suspense>

      <div className="finance-panel min-w-0 overflow-hidden p-3 sm:p-5">
        <div className="desktop-list-header mb-2">
          <div className="w-10 flex-shrink-0" />
          <p className="flex-1">Description</p>
          <p className="w-32">Category</p>
          <p className="w-24 text-center">Type</p>
          <p className="w-32 text-right">Amount</p>
          <p className="w-24 text-right">Date</p>
          <div className="w-24 flex-shrink-0" />
        </div>

        {transactions.length === 0 ?
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions found"
            description="Try changing filters or search."
          />
        : <>
            <div className="space-y-1">
              {visibleTransactions.map((tx: any) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>

            {hasMore ?
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
            : transactions.length > MAX_LIMIT ?
              <p className="mt-5 border-t border-border pt-5 text-center text-xs text-text-secondary">
                Showing first {MAX_LIMIT}. Use filters to narrow results.
              </p>
            : null}
          </>
        }
      </div>
    </div>
  );
}
