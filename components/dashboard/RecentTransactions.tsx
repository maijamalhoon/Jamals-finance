"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { ReceiptText } from "@/components/icons/jalvoro/compat";

import DashboardCardViewLink from "@/components/dashboard/DashboardCardViewLink";
import AddIncomeButton from "@/components/income/AddIncomeButton";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";
import {
  getRenderableTransactionAmount,
  type DashboardAvailability,
} from "@/lib/dashboard-financial-semantics";
import { createClient } from "@/lib/supabase/client";
import {
  getTransactionIconMeta,
  getTransactionPrefix,
  getTransactionToneClass,
} from "@/lib/transaction-icons";
import {
  loadTransactions,
  sortTransactionsNewestFirst,
} from "@/lib/transactions";

interface TransactionCategory {
  id?: string | null;
  name: string;
  color?: string | null;
  icon_key?: string | null;
  type?: string | null;
  parent?: { name: string } | null;
}

interface Transaction {
  id: string;
  type:
    | "income"
    | "expense"
    | "investment"
    | "goal"
    | "refund"
    | "transfer"
    | string;
  amount: number | string | null;
  note: string | null;
  date: string;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  categories: TransactionCategory | null;
  accounts: { name: string } | null;
}

function getTransactionLabel(
  transaction: Transaction,
  fallbackLabel: string,
) {
  if (transaction.type === "goal") {
    return transaction.item_name || "Goal contribution";
  }
  if (transaction.type === "transfer") return "Transfer";
  if (transaction.type === "investment") {
    return transaction.item_name || "Investment";
  }
  if (transaction.type === "refund") {
    return transaction.categories?.name || "Expense refund";
  }

  return (
    transaction.categories?.name ||
    transaction.source_name ||
    transaction.note ||
    fallbackLabel
  );
}

function Amount({ transaction }: { transaction: Transaction }) {
  const { formatCurrency } = useCurrency();
  const safeAmount = getRenderableTransactionAmount(transaction.amount);
  const iconMeta = getTransactionIconMeta({
    type: transaction.type,
    note: transaction.note,
    categoryName: transaction.categories?.name,
    categoryIconKey: transaction.categories?.icon_key,
    parentCategoryName: transaction.categories?.parent?.name,
    sourceName: transaction.source_name,
    itemName: transaction.item_name,
  });

  return (
    <span
      className={`inline-flex min-w-0 items-baseline justify-end gap-0.5 whitespace-nowrap text-[12px] font-black tracking-[-0.018em] tabular-nums sm:text-[13px] ${getTransactionToneClass(
        transaction.type,
        iconMeta.semanticType,
      )}`}
    >
      {safeAmount === null ? (
        <span className="font-semibold tracking-normal text-text-secondary">
          Unavailable
        </span>
      ) : (
        <>
          {getTransactionPrefix(transaction.type)}
          <CountedAmount
            amount={formatCurrency(safeAmount, { absolute: true })}
          />
        </>
      )}
    </span>
  );
}

export default function RecentTransactions({
  transactions,
  status,
}: {
  transactions: Transaction[];
  status: DashboardAvailability;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>(
    () => sortTransactionsNewestFirst(transactions).slice(0, 5),
  );

  useEffect(() => {
    let cancelled = false;

    setLatestTransactions(sortTransactionsNewestFirst(transactions).slice(0, 5));

    async function loadLatestTransactions() {
      const rows = await loadTransactions(supabase, {
        includeDeleted: false,
      });
      if (cancelled) return;

      setLatestTransactions(
        sortTransactionsNewestFirst(rows)
          .slice(0, 5) as unknown as Transaction[],
      );
    }

    void loadLatestTransactions();
    return () => {
      cancelled = true;
    };
  }, [supabase, transactions]);

  const visibleTransactions = useMemo(
    () => sortTransactionsNewestFirst(latestTransactions).slice(0, 5),
    [latestTransactions],
  );

  return (
    <section className="finance-reference-card motion-card-entry flex min-h-[280px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border/55 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center bg-transparent text-info shadow-none">
            <ReceiptText
              size={20}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
          </span>
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.13em] text-text-secondary sm:text-[12px]">
            Recent Transactions
          </h3>
        </div>

        {status !== "unavailable" && visibleTransactions.length > 0 ? (
          <DashboardCardViewLink
            href="/dashboard/transactions"
            label="View all transactions"
          />
        ) : null}
      </div>

      {status === "unavailable" || visibleTransactions.length === 0 ? (
        <div className="dashboard-chart-empty mt-4 min-h-[210px] flex-1">
          <EmptyState
            compact
            title={
              status === "unavailable"
                ? "Recent activity unavailable"
                : "No transactions yet"
            }
            description={
              status === "unavailable"
                ? "Refresh when your connection is stable."
                : "Your recent account activity will appear here."
            }
            action={
              status === "unavailable" ? undefined : (
                <AddIncomeButton
                  label="Add a transaction"
                  showIcon={false}
                />
              )
            }
          />
        </div>
      ) : (
        <div className="mt-1.5 flex min-w-0 flex-1 flex-col">
          {visibleTransactions.map((transaction, index) => {
            const iconMeta = getTransactionIconMeta({
              type: transaction.type,
              note: transaction.note,
              categoryName: transaction.categories?.name,
              categoryIconKey: transaction.categories?.icon_key,
              parentCategoryName: transaction.categories?.parent?.name,
              sourceName: transaction.source_name,
              itemName: transaction.item_name,
            });
            const Icon = iconMeta.icon;
            const label = getTransactionLabel(transaction, iconMeta.label);

            return (
              <article
                key={`${transaction.type}:${transaction.id}`}
                className="motion-table-row grid min-w-0 grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/45 py-3 first:pt-2 last:border-b-0 last:pb-0"
                style={
                  {
                    "--motion-reveal-delay": `${index * 35}ms`,
                  } as CSSProperties
                }
                aria-label={`${label}, ${transaction.type}, ${transaction.amount}`}
              >
                <span
                  className="grid size-[34px] shrink-0 place-items-center"
                  style={{ color: iconMeta.accent }}
                >
                  <Icon
                    size={20}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  />
                </span>

                <p
                  className="min-w-0 truncate text-[12px] font-bold leading-4 text-text-primary sm:text-[13px]"
                  title={label}
                >
                  {label}
                </p>

                <p className="shrink-0 text-right leading-4">
                  <Amount transaction={transaction} />
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
