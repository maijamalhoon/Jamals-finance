import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";
import { getTransactionIconMeta } from "@/lib/transaction-icons";

interface Transaction {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number | string;
  note: string | null;
  date: string;
  categories: {
    name: string;
    color?: string | null;
    parent?: { name: string } | null;
  } | null;
  accounts: { name: string } | null;
}

function formatCurrency(value: number | string) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? Math.abs(numericValue) : 0;

  return `PKR ${safeValue.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "No date";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAmountClass(type: Transaction["type"]) {
  if (type === "income") return "text-success";
  if (type === "expense") return "text-danger";
  return "text-active";
}

function getAmountPrefix(type: Transaction["type"]) {
  if (type === "income") return "+ ";
  if (type === "expense") return "- ";
  return "";
}

function getDisplayName(tx: Transaction) {
  if (tx.type === "transfer") return "Transfer";
  return tx.note || tx.categories?.name || "Transaction";
}

function getTransactionSubtitle(tx: Transaction) {
  const category = tx.categories?.name || "Uncategorized";
  const account = tx.accounts?.name || "No account";

  return `${category} - ${formatDate(tx.date)} - ${account}`;
}

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
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
          <p className="dashboard-list-card-subtitle">Latest account activity</p>
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
          <div className="flex min-w-0 flex-col">
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
                "--transaction-accent": iconMeta.accent,
              } as CSSProperties;

              return (
                <article
                  key={tx.id}
                  style={rowStyle}
                  className="dashboard-list-row motion-table-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 transition-colors duration-200 hover:bg-hover/40"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
                    style={{
                      color: iconMeta.accent,
                      borderColor: `color-mix(in srgb, ${iconMeta.accent}, transparent 76%)`,
                      backgroundColor: `color-mix(in srgb, ${iconMeta.accent}, transparent 92%)`,
                    }}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-text-primary sm:text-sm">
                      {getDisplayName(tx)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-text-secondary">
                      {getTransactionSubtitle(tx)}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 whitespace-nowrap text-right text-[13px] font-bold leading-5 tabular-nums ${getAmountClass(tx.type)}`}
                  >
                    {getAmountPrefix(tx.type)}
                    <CountedAmount amount={formatCurrency(tx.amount)} />
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
