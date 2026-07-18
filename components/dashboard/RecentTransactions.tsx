"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight } from "lucide-react";

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
  const suffix = includeDate ? ` · ${formatCompactDate(tx.date)}` : "";

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

function Amount({ transaction }: { transaction: Transaction }) {
  const { formatCurrency } = useCurrency();
  const safeAmount = getRenderableTransactionAmount(transaction.amount);

  return (
    <span
      className={`inline-flex min-w-0 items-baseline justify-end gap-0.5 whitespace-nowrap font-bold tracking-[-0.018em] tabular-nums ${getTransactionToneClass(
        transaction.type,
      )}`}
    >
      {safeAmount === null ? (
        <span className="font-semibold tracking-normal text-text-secondary">Unavailable</span>
      ) : (
        <>
          {getTransactionPrefix(transaction.type)}
          <CountedAmount amount={formatCurrency(safeAmount, { absolute: true })} />
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
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border/55 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-brand/20 bg-brand/8 text-brand">
            <ArrowLeftRight size={15} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.13em] text-text-secondary sm:text-[12px]">
            Recent Transactions
          </h3>
        </div>

        {status !== "unavailable" && transactions.length > 0 ? (
          <Link
            href="/dashboard/transactions"
            className="finance-focus group inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-[11px] font-bold text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
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
        <>
          <div className="mt-1.5 hidden min-w-0 overflow-x-auto md:block">
            <table className="w-full min-w-[620px] table-fixed border-collapse text-left lg:min-w-[760px]">
              <colgroup>
                <col className="w-[59%] lg:w-[38%]" />
                <col className="hidden lg:table-column lg:w-[17%]" />
                <col className="hidden lg:table-column lg:w-[15%]" />
                <col className="w-[18%] lg:w-[13%]" />
                <col className="w-[23%] lg:w-[17%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/65 text-[9px] font-bold uppercase tracking-[0.11em] text-text-tertiary lg:text-[10px]">
                  <th className="py-2 pr-4">Description</th>
                  <th className="hidden px-4 py-2 lg:table-cell">Account</th>
                  <th className="hidden px-4 py-2 lg:table-cell">Category</th>
                  <th className="px-3 py-2 lg:px-4">Date</th>
                  <th className="py-2 pl-3 text-right lg:pl-4">Amount</th>
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
                      className="motion-table-row group border-b border-border/45 transition-colors duration-200 last:border-b-0 hover:bg-surface-secondary/30"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-[11px] border transition-[transform,border-color,background-color] duration-200 group-hover:-translate-y-px"
                            style={getTransactionSoftStyle(iconMeta.accent)}
                          >
                            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p
                              className="truncate text-[12px] font-bold leading-4 text-text-primary lg:text-[13px]"
                              title={getFlowTitle(tx)}
                            >
                              {getFlowTitle(tx)}
                            </p>
                            <p
                              className="mt-0.5 truncate text-[9px] font-medium leading-3.5 text-text-secondary lg:text-[10px] lg:leading-4"
                              title={getFlowSubtitle(tx, false)}
                            >
                              {getFlowSubtitle(tx, false)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        className="hidden max-w-[180px] truncate px-4 py-2.5 text-[11px] font-medium text-text-secondary lg:table-cell"
                        title={tx.accounts?.name || "No account"}
                      >
                        {tx.accounts?.name || "No account"}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        <span
                          className="inline-flex max-w-[150px] items-center gap-1.5 text-[10px] font-bold"
                          style={{ color: iconMeta.accent }}
                          title={getCategoryLabel(tx)}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: iconMeta.accent }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{getCategoryLabel(tx)}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[10px] font-medium text-text-secondary tabular-nums lg:px-4 lg:text-[11px]">
                        {formatFullDate(tx.date)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pl-3 text-right text-[11px] lg:pl-4 lg:text-[12px]">
                        <Amount transaction={tx} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-1.5 flex min-w-0 flex-col md:hidden">
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
                  className="motion-table-row grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2.5 border-b border-border/45 py-3 first:pt-2 last:border-b-0 last:pb-0"
                >
                  <span
                    className="grid size-8.5 shrink-0 place-items-center rounded-[12px] border"
                    style={getTransactionSoftStyle(iconMeta.accent)}
                  >
                    <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                  </span>

                  <div className="min-w-0">
                    <p
                      className="truncate text-[12px] font-bold leading-4 text-text-primary"
                      title={getFlowTitle(tx)}
                    >
                      {getFlowTitle(tx)}
                    </p>
                    <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                      <p
                        className="min-w-0 truncate text-[10px] font-medium leading-4 text-text-secondary"
                        title={getFlowSubtitle(tx)}
                      >
                        {getFlowSubtitle(tx)}
                      </p>
                      <p className="shrink-0 text-right text-[clamp(9px,2.75vw,11px)] leading-4">
                        <Amount transaction={tx} />
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
