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
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm">Recent Transactions</h3>
        <button className="text-indigo-400 text-xs border border-gray-700/60 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors">
          View All
        </button>
      </div>

      {transactions.length === 0 ?
        <div className="py-12 text-center">
          <p className="text-gray-600 text-sm">No transactions yet</p>
          <p className="text-gray-700 text-xs mt-1">
            Add your first income or expense below
          </p>
        </div>
      : <div className="space-y-0.5">
          {transactions.map((tx) => {
            const catColor = tx.categories?.color || "#6366f1";
            const catInitial = tx.categories?.name?.charAt(0) || "T";
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 py-3 border-b border-gray-800/40 last:border-0"
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: catColor + "25", color: catColor }}
                >
                  {catInitial}
                </div>

                {/* Name + Account */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {tx.note || tx.categories?.name || "Transaction"}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {tx.accounts?.name || "—"}
                  </p>
                </div>

                {/* Type Badge */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                    tx.type === "income" ?
                      "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {tx.type === "income" ? "Income" : "Expense"}
                </span>

                {/* Amount + Date */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-semibold ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}
                  >
                    PKR {Number(tx.amount).toLocaleString()}
                  </p>
                  <p className="text-gray-600 text-xs">
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
