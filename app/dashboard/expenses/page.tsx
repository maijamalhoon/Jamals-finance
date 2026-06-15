import { createClient } from "@/lib/supabase/server";
import TransactionRow from "@/components/transactions/TransactionRow";
import AddExpenseButton from "@/components/expenses/AddExpenseButton";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const now = new Date();

  const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const firstDayYear = `${now.getFullYear()}-01-01`;

  // Fetch all expense transactions
  const { data: raw } = await supabase
    .from("transactions")
    .select("*, categories(name, color), accounts(name)")
    .eq("type", "expense")
    .order("date", { ascending: false });

  const expenses = raw ?? [];

  // ── Stats ──────────────────────────────────────────────
  const thisMonth = expenses
    .filter((t) => t.date >= firstDayMonth)
    .reduce((s, t) => s + Number(t.amount), 0);

  const thisYear = expenses
    .filter((t) => t.date >= firstDayYear)
    .reduce((s, t) => s + Number(t.amount), 0);

  // Highest spending month ever
  const byMonth: Record<string, number> = {};
  expenses.forEach((t) => {
    const m = t.date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + Number(t.amount);
  });
  const worstMonth = Math.max(0, ...Object.values(byMonth));

  // ── This month breakdown by category ──────────────────
  const catMap: Record<
    string,
    { amount: number; color: string; count: number }
  > = {};
  expenses
    .filter((t) => t.date >= firstDayMonth)
    .forEach((t) => {
      const name = (t.categories as any)?.name || "Other";
      const color = (t.categories as any)?.color || "#ef4444";
      if (!catMap[name]) catMap[name] = { amount: 0, color, count: 0 };
      catMap[name].amount += Number(t.amount);
      catMap[name].count++;
    });

  const categories = Object.entries(catMap)
    .map(([name, { amount, color, count }]) => ({ name, amount, color, count }))
    .sort((a, b) => b.amount - a.amount);

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold">Expenses</h2>
          <p className="text-gray-500 text-sm mt-1">
            {expenses.length} total entries
          </p>
        </div>
        <AddExpenseButton />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1.5">This Month</p>
          <p className="text-white text-xl font-bold">{fmt(thisMonth)}</p>
          <p className="text-gray-600 text-xs mt-0.5">
            ≈ ${(thisMonth / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1.5">This Year</p>
          <p className="text-white text-xl font-bold">{fmt(thisYear)}</p>
          <p className="text-gray-600 text-xs mt-0.5">
            ≈ ${(thisYear / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1.5">Highest Month Ever</p>
          <p className="text-red-400 text-xl font-bold">{fmt(worstMonth)}</p>
          <p className="text-gray-600 text-xs mt-0.5">
            Your most expensive month
          </p>
        </div>
      </div>

      {/* This Month — Breakdown by Category */}
      {categories.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 mb-4">
          <h3 className="text-white font-medium text-sm mb-4">
            This Month by Category
          </h3>
          <div className="space-y-4">
            {categories.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: c.color }}
                    />
                    <span className="text-gray-300 text-sm">{c.name}</span>
                    <span className="text-gray-600 text-xs">
                      {c.count} {c.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <span className="text-red-400 text-sm font-semibold">
                    {fmt(c.amount)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${thisMonth > 0 ? (c.amount / thisMonth) * 100 : 0}%`,
                      background: c.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Expense List */}
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium text-sm">All Expenses</h3>
          <span className="text-gray-500 text-xs">
            {expenses.length} entries
          </span>
        </div>

        {/* Column Headers */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50 mb-1">
          <div className="w-9 flex-shrink-0" />
          <p className="flex-1 text-gray-500 text-xs font-medium uppercase tracking-wide">
            Description
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-32 hidden md:block">
            Category
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-32 text-right">
            Amount
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-24 text-right">
            Date
          </p>
          <div className="w-16 flex-shrink-0" />
        </div>

        {/* Rows */}
        {expenses.length === 0 ?
          <div className="py-16 text-center">
            <p className="text-gray-600 text-sm">No expense records yet</p>
            <p className="text-gray-700 text-xs mt-1">
              Click "Add Expense" to record your first expense
            </p>
          </div>
        : expenses.map((tx) => <TransactionRow key={tx.id} tx={tx as any} />)}
      </div>
    </div>
  );
}
