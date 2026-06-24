import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";
import { getTransactionIconMeta } from "@/lib/transaction-icons";

interface Transaction {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number;
  note: string | null;
  date: string;
  categories: { name: string; color: string; parent?: { name: string } | null } | null;
  accounts: { name: string } | null;
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return `PKR ${safeValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAmountTone(type: Transaction["type"]) {
  if (type === "income") return "text-success";
  if (type === "expense") return "text-danger";
  return "text-active";
}

function getAmountPrefix(type: Transaction["type"]) {
  if (type === "income") return "+ ";
  if (type === "expense") return "- ";
  return "";
}

function getPillTone(type: Transaction["type"]) {
  if (type === "income") return "finance-status-success";
  if (type === "expense") return "finance-status-danger";
  return "finance-status-info";
}

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const visibleTransactions = transactions.slice(0, 5);

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[380px] min-w-0 flex-col overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-secondary text-text-tertiary [&>svg]:h-3.5 [&>svg]:w-3.5">
              <ArrowLeftRight />
            </span>
            <span className="truncate">Activity</span>
          </div>
          <h3 className="text-[18px] font-semibold leading-tight tracking-normal text-text-primary">
            Recent Transactions
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Latest account activity
          </p>
        </div>

        {visibleTransactions.length > 0 ? (
          <Link
            href="/dashboard/transactions"
            className="finance-focus finance-pressable shrink-0 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-[11px] font-semibold leading-none text-active hover:bg-hover"
          >
            View All
          </Link>
        ) : null}
      </div>

      {visibleTransactions.length === 0 ? (
        <div className="dashboard-chart-empty flex-1">
          <EmptyState
            compact
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Add your first income or expense to see recent activity here."
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2.5">
          {visibleTransactions.map((tx, index) => {
            const iconMeta = getTransactionIconMeta({
              type: tx.type,
              note: tx.note,
              categoryName: tx.categories?.name,
              parentCategoryName: tx.categories?.parent?.name,
            });
            const TypeIcon = iconMeta.icon;
            const title = tx.note || tx.categories?.name || "Transaction";
            const category = tx.categories?.name || "Uncategorized";
            const account = tx.accounts?.name || "No account";
            const rowStyle = {
              "--motion-reveal-delay": `${index * 55}ms`,
            } as CSSProperties;

            return (
              <article
                key={tx.id}
                className="motion-table-row grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[20px] border border-transparent bg-surface-secondary/60 p-3 transition-colors duration-200 hover:border-border hover:bg-hover sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                style={rowStyle}
              >
                <div
                  className="finance-icon-bubble h-9 w-9"
                  style={{
                    borderColor: `color-mix(in srgb, ${iconMeta.accent}, transparent 70%)`,
                    backgroundColor: `color-mix(in srgb, ${iconMeta.accent}, transparent 88%)`,
                    color: iconMeta.accent,
                  }}
                >
                  <TypeIcon size={16} strokeWidth={2.1} />
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-5 text-text-primary">
                      {title}
                    </p>
                    <span
                      className={`finance-state-pill shrink-0 text-[10px] sm:hidden ${getPillTone(tx.type)}`}
                    >
                      {iconMeta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-text-secondary">
                    {category} - {formatDate(tx.date)} - {account}
                  </p>
                </div>

                <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 sm:col-span-1 sm:block sm:text-right">
                  <span
                    className={`finance-state-pill hidden text-[10px] sm:inline-flex ${getPillTone(tx.type)}`}
                  >
                    <TypeIcon size={11} strokeWidth={2.1} />
                    {iconMeta.label}
                  </span>
                  <p
                    className={`mt-0 whitespace-nowrap text-[13px] font-bold leading-5 sm:mt-1 ${getAmountTone(tx.type)}`}
                  >
                    {getAmountPrefix(tx.type)}
                    <CountedAmount amount={formatCurrency(Number(tx.amount))} />
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
