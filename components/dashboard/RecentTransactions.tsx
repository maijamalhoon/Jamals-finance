"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";
import {
  getTransactionIconMeta,
  getTransactionPrefix,
  getTransactionSoftStyle,
  getTransactionToneClass,
} from "@/lib/transaction-icons";
import { getRenderableTransactionAmount } from "@/lib/dashboard-financial-semantics";

interface Transaction {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number | string | null;
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

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCompactDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return "No date";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return "No date";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFlowTitle(tx: Transaction) {
  if (tx.type === "income") {
    return tx.source_name || tx.categories?.name || tx.note || "Income";
  }
  if (tx.type === "expense") {
    return tx.categories?.name || tx.note || "Expense";
  }
  if (tx.type === "investment") {
    return tx.note || tx.item_name || "Investment contribution";
  }
  if (tx.type === "refund") {
    return tx.note || tx.categories?.name || "Expense refund";
  }
  return tx.note || "Transfer";
}

function getFlowSubtitle(tx: Transaction, includeDate = true) {
  const account = tx.accounts?.name || "No account";
  const suffix = includeDate ? ` - ${formatCompactDate(tx.date)}` : "";

  if (tx.type === "income") return `Came to ${account}${suffix}`;
  if (tx.type === "expense") return `Paid from ${account}${suffix}`;
  if (tx.type === "investment") return `Invested from ${account}${suffix}`;
  if (tx.type === "refund") return `Returned to ${account}${suffix}`;
  return `${account}${suffix}`;
}

function getCategoryLabel(tx: Transaction) {
  if (tx.type === "transfer") return "Transfer";
  if (tx.type === "income") return tx.categories?.name || "Income";
  if (tx.type === "investment") return "Investment";
  if (tx.type === "refund") return "Refund";
  return tx.categories?.name || "Expense";
}

function Amount({
  transaction,
}: {
  transaction: Transaction;
}) {
  const { formatCurrency } = useCurrency();
  const safeAmount = getRenderableTransactionAmount(transaction.amount);

  return (
    <span
      className={`font-black tabular-nums ${getTransactionToneClass(
        transaction.type,
      )}`}
    >
      {safeAmount === null ? (
        <span className="font-semibold text-text-secondary">Unavailable</span>
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
  const visibleTransactions = transactions.slice(0, 5);

  return (
    <section className="finance-reference-card motion-card-entry flex min-h-[280px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="dashboard-list-card-kicker-icon">
            <ArrowLeftRight />
          </span>
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Recent Transactions
          </h3>
        </div>

        {status !== "unavailable" && transactions.length > 0 ? (
          <Link
            href="/dashboard/transactions"
            className="dashboard-list-card-action"
          >
            View all
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
        <>
          <div className="mt-3 hidden min-w-0 overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-[0.08em] text-text-tertiary">
                  <th className="pb-2 pr-4">Description</th>
                  <th className="px-4 pb-2">Account</th>
                  <th className="px-4 pb-2">Category</th>
                  <th className="px-4 pb-2">Date</th>
                  <th className="pb-2 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
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
                    <tr
                      key={tx.id}
                      style={rowStyle}
                      className="motion-table-row group border-b border-border/65 last:border-b-0 hover:bg-hover/55"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-full border shadow-[var(--surface-highlight)] transition-transform duration-200 group-hover:scale-105"
                            style={getTransactionSoftStyle(iconMeta.accent)}
                          >
                            <Icon size={14} strokeWidth={2.3} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-bold text-text-primary">
                              {getFlowTitle(tx)}
                            </p>
                            <p className="truncate text-[10px] font-medium text-text-secondary">
                              {getFlowSubtitle(tx, false)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-2.5 text-[11px] font-medium text-text-secondary">
                        {tx.accounts?.name || "No account"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex max-w-[150px] truncate rounded-full border px-2 py-1 text-[10px] font-bold"
                          style={getTransactionSoftStyle(iconMeta.accent)}
                        >
                          {getCategoryLabel(tx)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[11px] font-medium text-text-secondary">
                        {formatFullDate(tx.date)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pl-4 text-right text-[12px]">
                        <Amount transaction={tx} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex min-w-0 flex-col md:hidden">
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
                  className="motion-table-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/65 py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full border shadow-[var(--surface-highlight)]"
                    style={getTransactionSoftStyle(iconMeta.accent)}
                  >
                    <Icon size={15} strokeWidth={2.3} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-text-primary">
                      {getFlowTitle(tx)}
                    </p>
                    <p className="truncate text-[10px] font-medium text-text-secondary">
                      {getFlowSubtitle(tx)}
                    </p>
                  </div>
                  <p className="max-w-[7rem] break-words text-right text-[11px] [overflow-wrap:anywhere]">
                    <Amount transaction={tx} />
                  </p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
