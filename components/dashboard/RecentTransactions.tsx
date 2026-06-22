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
    <div className="finance-panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-slate-950 font-semibold text-sm">
            Recent Transactions
          </h3>
          <p className="text-slate-500 text-xs mt-1">Latest activity</p>
        </div>
        <Link
          href="/dashboard/transactions"
          className="text-blue-600 text-xs border border-blue-100 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
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
      : <div className="divide-y divide-border">
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
                className="motion-table-row -mx-2 grid grid-cols-[auto,1fr] gap-3 rounded-[14px] px-2 py-3 transition-all hover:bg-hover focus-within:bg-hover sm:flex sm:items-center"
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

                <div className="flex-1 min-w-0">
                  <p className="text-slate-950 text-sm font-medium truncate">
                    {tx.note || tx.categories?.name || "Transaction"}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {tx.accounts?.name || "No account"}
                  </p>
                </div>

                <span
                  className="finance-state-pill col-start-2 w-fit text-xs sm:col-start-auto sm:flex-shrink-0"
                >
                  <TypeIcon size={12} strokeWidth={2.1} />
                  {iconMeta.label}
                </span>

                <div className="col-span-2 flex items-center justify-between text-left sm:block sm:flex-shrink-0 sm:text-right">
                  <p
                    className={`text-sm font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {tx.type === "income" ? "+" : "-"} PKR{" "}
                    {Number(tx.amount).toLocaleString()}
                  </p>
                  <p className="text-slate-600 text-xs">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
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
