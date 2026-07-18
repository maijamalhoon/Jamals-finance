"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, ReceiptText } from "lucide-react";

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
import { sortTransactionsNewestFirst } from "@/lib/transactions";

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
  type: "income" | "expense" | "investment" | "goal" | "refund" | "transfer" | string;
  amount: number | string | null;
  note: string | null;
  date: string;
  created_at?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  categories: TransactionCategory | null;
  accounts: { name: string } | null;
}

type CategoryVisualRow = {
  id: string;
  icon_key: string | null;
  type: string | null;
};

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

  return (
    <span
      className={`inline-flex min-w-0 items-baseline justify-end gap-0.5 whitespace-nowrap text-[12px] font-black tracking-[-0.018em] tabular-nums sm:text-[13px] ${getTransactionToneClass(
        transaction.type,
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
  const [categoryVisuals, setCategoryVisuals] = useState<
    Record<string, CategoryVisualRow>
  >({});
  const [goalTransactions, setGoalTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    const categoryIds = Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.categories?.id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    async function loadPersistentVisualsAndGoals() {
      const categoryRequest =
        categoryIds.length > 0
          ? supabase
              .from("categories")
              .select("id, icon_key, type")
              .in("id", categoryIds)
          : Promise.resolve({ data: [], error: null });

      const goalsRequest = supabase
        .from("transactions")
        .select(
          "id, type, amount, note, date, created_at, source_name, person_name, item_name, categories(id, name, color, icon_key, type), accounts(name)",
        )
        .eq("type", "goal")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      const [categoryResult, goalResult] = await Promise.all([
        categoryRequest,
        goalsRequest,
      ]);
      if (cancelled) return;

      if (!categoryResult.error) {
        const nextVisuals = Object.fromEntries(
          ((categoryResult.data ?? []) as CategoryVisualRow[]).map((row) => [
            row.id,
            row,
          ]),
        );
        setCategoryVisuals(nextVisuals);
      }

      if (!goalResult.error) {
        setGoalTransactions((goalResult.data ?? []) as unknown as Transaction[]);
      }
    }

    void loadPersistentVisualsAndGoals();
    return () => {
      cancelled = true;
    };
  }, [supabase, transactions]);

  const visibleTransactions = useMemo(() => {
    const enrichedTransactions = transactions.map((transaction) => {
      const categoryId = transaction.categories?.id;
      const visual = categoryId ? categoryVisuals[categoryId] : null;
      if (!transaction.categories || !visual) return transaction;

      return {
        ...transaction,
        categories: {
          ...transaction.categories,
          icon_key: visual.icon_key,
          type: visual.type,
        },
      };
    });

    const unique = new Map<string, Transaction>();
    [...enrichedTransactions, ...goalTransactions].forEach((transaction) => {
      unique.set(`${transaction.type}:${transaction.id}`, transaction);
    });

    return sortTransactionsNewestFirst(Array.from(unique.values())).slice(0, 5);
  }, [categoryVisuals, goalTransactions, transactions]);

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
          <Link
            href="/dashboard/transactions"
            className="dashboard-card-action finance-focus group inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs sm:px-4 sm:text-sm"
          >
            View all
            <ArrowRight
              size={14}
              strokeWidth={2.2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>

      {status === "unavailable" || visibleTransactions.length === 0 ? (
        <div className="dashboard-chart-empty mt-4 min-h-[210px] flex-1">
          <EmptyState
            compact
            icon={ArrowLeftRight}
            title={
              status === "unavailable"
                ? "Recent activity unavailable"
                : "No transactions yet"
            }
            description={
              status === "unavailable"
                ? "Refresh when your connection is stable."
                : "Record account activity to see it here."
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
                style={{
                  "--motion-reveal-delay": `${index * 35}ms`,
                } as React.CSSProperties}
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
