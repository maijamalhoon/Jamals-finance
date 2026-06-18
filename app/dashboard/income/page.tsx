import { createClient } from "@/lib/supabase/server";
import TransactionRow from "@/components/transactions/TransactionRow";
import AddIncomeButton from "@/components/income/AddIncomeButton";

export default async function IncomePage() {
  const supabase = await createClient();
  const now = new Date();

  const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const firstDayYear = `${now.getFullYear()}-01-01`;

  const { data: raw } = await supabase
    .from("transactions")
    .select("*, categories(name, color), accounts(name)")
    .eq("type", "income")
    .order("date", { ascending: false });

  const income = raw ?? [];
  const thisMonthEntries = income.filter((t) => t.date >= firstDayMonth);
  const thisMonth = thisMonthEntries.reduce(
    (s, t) => s + Number(t.amount),
    0,
  );
  const thisYear = income
    .filter((t) => t.date >= firstDayYear)
    .reduce((s, t) => s + Number(t.amount), 0);

  const byMonth: Record<string, number> = {};
  income.forEach((t) => {
    const month = t.date.slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + Number(t.amount);
  });
  const bestMonth = Math.max(0, ...Object.values(byMonth));

  const sourceMap: Record<
    string,
    { amount: number; color: string; count: number }
  > = {};
  thisMonthEntries.forEach((t) => {
    const name = (t.categories as any)?.name || "Other";
    const color = (t.categories as any)?.color || "#22c55e";
    if (!sourceMap[name]) sourceMap[name] = { amount: 0, color, count: 0 };
    sourceMap[name].amount += Number(t.amount);
    sourceMap[name].count++;
  });

  const sources = Object.entries(sourceMap)
    .map(([name, { amount, color, count }]) => ({ name, amount, color, count }))
    .sort((a, b) => b.amount - a.amount);

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Income</h2>
          <p className="page-subtitle">{income.length} total entries</p>
        </div>
        <AddIncomeButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="summary-card">
          <p className="mb-1.5 text-xs text-slate-500">This Month</p>
          <p className="text-xl font-bold text-white">{fmt(thisMonth)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Approx. ${(thisMonth / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="summary-card">
          <p className="mb-1.5 text-xs text-slate-500">This Year</p>
          <p className="text-xl font-bold text-white">{fmt(thisYear)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Approx. ${(thisYear / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="summary-card border-green-500/20 bg-green-500/5">
          <p className="mb-1.5 text-xs text-slate-500">Best Month Ever</p>
          <p className="text-xl font-bold text-green-400">{fmt(bestMonth)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Your highest earning month
          </p>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="finance-panel p-5">
          <h3 className="mb-4 text-sm font-medium text-white">
            This Month by Source
          </h3>
          <div className="space-y-4">
            {sources.map((source) => (
              <div key={source.name}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: source.color }}
                    />
                    <span className="truncate text-sm text-slate-300">
                      {source.name}
                    </span>
                    <span className="text-xs text-slate-600">
                      {source.count}{" "}
                      {source.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-400">
                    {fmt(source.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${thisMonth > 0 ? (source.amount / thisMonth) * 100 : 0}%`,
                      background: source.color,
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
          <h3 className="text-sm font-medium text-white">All Income</h3>
          <span className="text-xs text-slate-500">
            {income.length} entries
          </span>
        </div>

        <div className="desktop-list-header mb-1">
          <div className="w-10 flex-shrink-0" />
          <p className="flex-1">Description</p>
          <p className="w-32">Source</p>
          <p className="w-20 text-center">Type</p>
          <p className="w-32 text-right">Amount</p>
          <p className="w-24 text-right">Date</p>
          <div className="w-16 flex-shrink-0" />
        </div>

        {income.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">No income records yet</p>
            <p className="mt-1 text-xs text-slate-600">
              Click "Add Income" to record your first earning
            </p>
          </div>
        ) : (
          income.map((tx) => <TransactionRow key={tx.id} tx={tx as any} />)
        )}
      </div>
    </div>
  );
}
