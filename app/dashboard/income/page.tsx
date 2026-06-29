import { createClient } from "@/lib/supabase/server";
import TransactionRow from "@/components/transactions/TransactionRow";
import AddIncomeButton from "@/components/income/AddIncomeButton";
import EmptyState from "@/components/ui/empty-state";
import { TrendingUp } from "lucide-react";
import { loadTransactions } from "@/lib/transactions";
import { formatDateKey, getAppDateParts } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const supabase = await createClient();
  const now = getAppDateParts();

  const firstDayMonth = formatDateKey(now.year, now.month, 1);
  const firstDayYear = `${now.year}-01-01`;

  const raw = await loadTransactions(supabase, { type: "income" });

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
    const name = t.source_name || (t.categories as any)?.name || "Other";
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
      <div className="page-heading finance-surface-glass">
        <div className="min-w-0">
          <h2 className="page-title">Income</h2>
          <p className="page-subtitle">{income.length} total entries</p>
        </div>
        <AddIncomeButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            This Month
          </p>
          <p className="break-words text-xl font-bold text-text-primary">
            {fmt(thisMonth)}
          </p>
        </div>

        <div className="summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            This Year
          </p>
          <p className="break-words text-xl font-bold text-text-primary">
            {fmt(thisYear)}
          </p>
        </div>

        <div className="summary-card min-w-0 border-success/30 bg-success/10">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            Best Month Ever
          </p>
          <p className="break-words text-xl font-bold text-success">
            {fmt(bestMonth)}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Your highest earning month
          </p>
        </div>
      </div>

      <div className="finance-panel p-5">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Income by Account
        </h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(
            income.reduce<Record<string, number>>((acc, tx) => {
              const account = (tx.accounts as any)?.name || "No account";
              acc[account] = (acc[account] ?? 0) + Number(tx.amount);
              return acc;
            }, {}),
          ).map(([account, amount]) => (
            <div
              key={account}
              className="finance-panel-soft min-w-0 p-3"
            >
              <p className="truncate text-xs font-medium text-text-secondary">
                {account}
              </p>
              <p className="mt-1 break-words text-sm font-bold text-success">
                {fmt(amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {sources.length > 0 && (
        <div className="finance-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">
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
                    <span className="truncate text-sm font-medium text-text-primary">
                      {source.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {source.count}{" "}
                      {source.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <span className="min-w-0 break-words text-right text-sm font-semibold text-success">
                    {fmt(source.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="motion-progress-fill h-full rounded-full transition-all"
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            All Income
          </h3>
          <span className="text-xs font-medium text-text-secondary">
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
          <EmptyState
            icon={TrendingUp}
            title="No income records yet"
            description="Add your first earning to start seeing source breakdowns and income trends."
          />
        ) : (
          income.map((tx) => <TransactionRow key={tx.id} tx={tx as any} />)
        )}
      </div>
    </div>
  );
}
