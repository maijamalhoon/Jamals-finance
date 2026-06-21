import { createClient } from "@/lib/supabase/server";
import TransactionRow from "@/components/transactions/TransactionRow";
import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import EmptyState from "@/components/ui/empty-state";
import { TrendingDown } from "lucide-react";
import { loadTransactions } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const now = new Date();

  const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const firstDayYear = `${now.getFullYear()}-01-01`;

  const raw = await loadTransactions(supabase, { type: "expense" });

  const expenses = raw ?? [];
  const thisMonthEntries = expenses.filter((t) => t.date >= firstDayMonth);
  const thisMonth = thisMonthEntries.reduce(
    (s, t) => s + Number(t.amount),
    0,
  );
  const thisYear = expenses
    .filter((t) => t.date >= firstDayYear)
    .reduce((s, t) => s + Number(t.amount), 0);

  const byMonth: Record<string, number> = {};
  expenses.forEach((t) => {
    const month = t.date.slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + Number(t.amount);
  });
  const highestMonth = Math.max(0, ...Object.values(byMonth));

  const categoryMap: Record<
    string,
    { amount: number; color: string; count: number }
  > = {};
  thisMonthEntries.forEach((t) => {
    const category = t.categories as any;
    const name =
      category?.parent?.name ? `${category.parent.name} / ${category.name}`
      : category?.name || "Other";
    const color = (t.categories as any)?.color || "#ef4444";
    if (!categoryMap[name]) categoryMap[name] = { amount: 0, color, count: 0 };
    categoryMap[name].amount += Number(t.amount);
    categoryMap[name].count++;
  });

  const categories = Object.entries(categoryMap)
    .map(([name, { amount, color, count }]) => ({ name, amount, color, count }))
    .sort((a, b) => b.amount - a.amount);

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Expenses</h2>
          <p className="page-subtitle">{expenses.length} total entries</p>
        </div>
        <AddExpenseButton />
      </div>

      <div className="finance-panel p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-950">
          Expenses by Account
        </h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(
            expenses.reduce<Record<string, number>>((acc, tx) => {
              const account = (tx.accounts as any)?.name || "No account";
              acc[account] = (acc[account] ?? 0) + Number(tx.amount);
              return acc;
            }, {}),
          ).map(([account, amount]) => (
            <div
              key={account}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="truncate text-xs text-slate-500">{account}</p>
              <p className="mt-1 text-sm font-bold text-rose-600">
                {fmt(amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="summary-card">
          <p className="mb-1.5 text-xs text-slate-500">This Month</p>
          <p className="text-xl font-bold text-slate-950">{fmt(thisMonth)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Approx. ${(thisMonth / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="summary-card">
          <p className="mb-1.5 text-xs text-slate-500">This Year</p>
          <p className="text-xl font-bold text-slate-950">{fmt(thisYear)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Approx. ${(thisYear / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="summary-card border-red-200 bg-red-50">
          <p className="mb-1.5 text-xs text-slate-500">Highest Month Ever</p>
          <p className="text-xl font-bold text-red-600">
            {fmt(highestMonth)}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Your most expensive month
          </p>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="finance-panel p-5">
          <h3 className="mb-4 text-sm font-medium text-slate-950">
            This Month by Category
          </h3>
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.name}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: category.color }}
                    />
                    <span className="truncate text-sm text-slate-700">
                      {category.name}
                    </span>
                    <span className="text-xs text-slate-600">
                      {category.count}{" "}
                      {category.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {fmt(category.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${thisMonth > 0 ? (category.amount / thisMonth) * 100 : 0}%`,
                      background: category.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="finance-panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-950">All Expenses</h3>
          <span className="text-xs text-slate-500">
            {expenses.length} entries
          </span>
        </div>

        <div className="desktop-list-header mb-1">
          <div className="w-10 flex-shrink-0" />
          <p className="flex-1">Description</p>
          <p className="w-32">Category</p>
          <p className="w-20 text-center">Type</p>
          <p className="w-32 text-right">Amount</p>
          <p className="w-24 text-right">Date</p>
          <div className="w-16 flex-shrink-0" />
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No expense records yet"
            description="Record your first expense to unlock category breakdowns and spend patterns."
          />
        ) : (
          expenses.map((tx) => <TransactionRow key={tx.id} tx={tx as any} />)
        )}
      </div>
    </div>
  );
}
