import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { getTransactionIconMeta } from "@/lib/transaction-icons";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string | null;
  date: string;
  categories: { name: string; color: string; parent?: { name: string } | null } | null;
  accounts: { name: string } | null;
}

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="finance-reference-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Recent Transactions
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Latest account activity
          </p>
        </div>
        <Link
          href="/dashboard/transactions"
          className="finance-focus rounded-[12px] border border-border bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-active transition-all hover:-translate-y-px hover:bg-hover"
        >
          View All
        </Link>
      </div>

      {transactions.length === 0 ?
        <EmptyState
          compact
          icon={ArrowLeftRight}
          title="No transactions yet"
          description="Add your first income or expense to see recent activity here."
        />
      : <div className="space-y-2">
          {transactions.map((tx) => {
            const iconMeta = getTransactionIconMeta({
              type: tx.type,
              note: tx.note,
              categoryName: tx.categories?.name,
              parentCategoryName: tx.categories?.parent?.name,
            });
            const TypeIcon = iconMeta.icon;
            return (
              <div
                key={tx.id}
                className="motion-table-row grid grid-cols-[auto,1fr] gap-3 rounded-[18px] border border-border bg-surface-secondary p-3 transition-all hover:-translate-y-0.5 hover:bg-hover focus-within:bg-hover sm:flex sm:items-center"
              >
                <div
                  className="finance-icon-bubble h-9 w-9"
                  style={{
                    backgroundColor: `${iconMeta.accent}18`,
                    color: iconMeta.accent,
                  }}
                >
                  <TypeIcon size={16} strokeWidth={2.1} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {tx.note || tx.categories?.name || "Transaction"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {tx.categories?.name || "Uncategorized"} ·{" "}
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <span
                  className={`finance-state-pill col-start-2 w-fit text-xs sm:col-start-auto sm:flex-shrink-0 ${
                    tx.type === "income" ?
                      "finance-status-success"
                    : "finance-status-danger"
                  }`}
                >
                  <TypeIcon size={12} strokeWidth={2.1} />
                  {iconMeta.label}
                </span>

                <div className="col-span-2 flex items-center justify-between text-left sm:block sm:flex-shrink-0 sm:text-right">
                  <p className={`text-sm font-bold ${tx.type === "income" ? "text-success" : "text-danger"}`}>
                    {tx.type === "income" ? "+" : "-"} PKR{" "}
                    {Number(tx.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {tx.accounts?.name || "No account"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
