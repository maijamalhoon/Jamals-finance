import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string | null;
  date: string;
  categories: { name: string; color: string } | null;
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
          icon={ArrowDownLeft}
          title="No transactions yet"
          description="Add your first income or expense to see recent activity here."
        />
      : <div className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const catColor = tx.categories?.color || "#818cf8";
            const catInitial = tx.categories?.name?.charAt(0) || "T";
            return (
              <div
                key={tx.id}
                className="grid grid-cols-[auto,1fr] gap-3 py-3 transition-colors hover:bg-slate-50/70 sm:flex sm:items-center"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ring-1 ring-slate-200"
                  style={{ background: `${catColor}22`, color: catColor }}
                >
                  {catInitial}
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
                  className={`col-start-2 inline-flex w-fit items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium sm:col-start-auto sm:flex-shrink-0 ${
                    tx.type === "income" ?
                      "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                  }`}
                >
                  {tx.type === "income" ?
                    <ArrowDownLeft size={12} />
                  : <ArrowUpRight size={12} />}
                  {tx.type === "income" ? "Income" : "Expense"}
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
