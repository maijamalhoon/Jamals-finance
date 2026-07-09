"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  getTransactionIconMeta,
  getTransactionPrefix,
  getTransactionSoftStyle,
  getTransactionToneClass,
} from "@/lib/transaction-icons";

interface Transaction {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number | string;
  note: string | null;
  date: string;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  categories: {
    name: string;
    color?: string | null;
    parent?: { name: string } | null;
  } | null;
  accounts: { name: string } | null;
}

function formatDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "No date";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getFlowTitle(tx: Transaction) {
  if (tx.type === "income") {
    return tx.source_name || tx.categories?.name || tx.note || "Income";
  }

  if (tx.type === "expense") {
    return tx.categories?.name || tx.note || "Expense";
  }

  return "Transfer";
}

function getFlowSubtitle(tx: Transaction) {
  const account = tx.accounts?.name || "No account";
  const date = formatDate(tx.date);

  if (tx.type === "income") return `Came to ${account} • ${date}`;
  if (tx.type === "expense") return `Paid from ${account} • ${date}`;

  return `${account} • ${date}`;
}

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { formatCurrency } = useCurrency();
  const visibleTransactions = transactions.slice(0, 5);

  return (
    <section className="finance-reference-card dashboard-list-card motion-card-entry">
      <div className="dashboard-list-card-header">
        <div className="min-w-0">
          <div className="dashboard-list-card-kicker">
            <span className="dashboard-list-card-kicker-icon">
              <ArrowLeftRight />
            </span>
            <span className="truncate">Activity</span>
          </div>

          <h3 className="dashboard-list-card-title">Recent Transactions</h3>
          <p className="dashboard-list-card-subtitle">
            Latest account activity
          </p>
        </div>

        {transactions.length > 0 ?
          <Link
            href="/dashboard/transactions"
            className="dashboard-list-card-action"
          >
            View all
          </Link>
        : null}
      </div>

      {visibleTransactions.length === 0 ?
        <div className="dashboard-chart-empty flex-1">
          <EmptyState
            compact
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Add income or expense to see activity here."
          />
        </div>
      : <div className="dashboard-list-rows">
          <div className="flex min-w-0 flex-col gap-1">
            {visibleTransactions.map((tx, index) => {
              const iconMeta = getTransactionIconMeta({
                type: tx.type,
                note: tx.note,
                categoryName: tx.categories?.name,
                parentCategoryName: tx.categories?.parent?.name,
              });

              const Icon = iconMeta.icon;

              const rowStyle = {
                "--motion-reveal-delay": `${index * 35}ms`,
              } as CSSProperties;

              return (
                <article
                  key={tx.id}
                  style={rowStyle}
                  className="motion-table-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-transparent px-2.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-hover/70 hover:shadow-sm"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border transition-transform duration-200 group-hover:scale-105"
                    style={getTransactionSoftStyle(iconMeta.accent)}
                  >
                    <Icon size={16} strokeWidth={2.35} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold leading-5 text-text-primary sm:text-sm">
                      {getFlowTitle(tx)}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-text-secondary">
                      {getFlowSubtitle(tx)}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 whitespace-nowrap text-right text-[13px] font-black leading-5 tabular-nums ${getTransactionToneClass(
                      tx.type,
                    )}`}
                  >
                    {getTransactionPrefix(tx.type)}
                    <CountedAmount
                      amount={formatCurrency(Number(tx.amount ?? 0), {
                        absolute: true,
                      })}
                    />
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      }
    </section>
  );
}
