import {
  Activity,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

interface TodaysOverviewProps {
  income: string;
  expenses: string;
  net: string;
  netPositive: boolean;
  transactionCount: number;
  avgDailySpend: string;
  topCategory: { name: string; amount: string } | null;
  savingsRate: number;
  activeDays: number;
  projectedExpenses: string;
  remainingDays: number;
}

export default function TodaysOverview({
  income,
  expenses,
  net,
  netPositive,
  transactionCount,
  avgDailySpend,
  topCategory,
  savingsRate,
  activeDays,
  projectedExpenses,
  remainingDays,
}: TodaysOverviewProps) {
  const engineStatus =
    savingsRate >= 25 ? "Cash flow is comfortably ahead of spend."
    : savingsRate >= 0 ? "Spend is controlled, but savings can widen."
    : "Expenses are outrunning income this month.";

  const focus =
    topCategory ?
      `${topCategory.name} leads spending at ${topCategory.amount}.`
    : "No expense category needs attention today.";

  const tiles = [
    { label: "Income", value: income, tone: "text-success" },
    { label: "Expenses", value: expenses, tone: "text-danger" },
    {
      label: "Net Today",
      value: net,
      tone: netPositive ? "text-success" : "text-danger",
    },
    {
      label: "Entries",
      value: String(transactionCount),
      tone: "text-info",
    },
  ];

  const diagnostics = [
    { label: "Active days", value: String(activeDays), tone: "text-text-primary" },
    { label: "Forecast", value: projectedExpenses, tone: "text-text-primary" },
    { label: "Days left", value: String(remainingDays), tone: "text-text-primary" },
    {
      label: "AI confidence",
      value: savingsRate >= 0 ? "Stable" : "Watch",
      tone: savingsRate >= 0 ? "text-success" : "text-warning",
    },
  ];

  return (
    <section className="finance-panel relative overflow-hidden p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                <Sparkles size={14} />
                Today's Overview
              </div>
              <h3 className="mt-2 text-2xl font-bold tracking-normal text-text-primary">
                Live financial pulse
              </h3>
            </div>
            <div className="finance-status-info grid h-11 w-11 flex-shrink-0 place-items-center rounded-[18px] border">
              <Activity size={19} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="finance-panel-soft p-4"
              >
                <p className="text-[11px] font-medium text-text-secondary">
                  {tile.label}
                </p>
                <p className={`mt-2 truncate text-base font-bold ${tile.tone}`}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {diagnostics.map((diag) => (
              <div
                key={diag.label}
                className="finance-panel-soft p-4"
              >
                <p className="text-[11px] font-medium text-text-secondary">
                  {diag.label}
                </p>
                <p className={`mt-2 truncate text-base font-bold ${diag.tone}`}>
                  {diag.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="finance-panel-soft p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <BrainCircuit size={16} className="text-violet-600" />
              AI engine insight
            </div>
            <p className="mt-3 text-sm leading-6 text-text-primary">
              {engineStatus}
            </p>
            <p className="mt-2 text-xs text-text-secondary">{focus}</p>
          </div>

          <div className="finance-panel-soft p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ShieldCheck size={16} className="text-success" />
              Command center check
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-text-secondary">Average daily spend</p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {avgDailySpend}
                </p>
              </div>
              <div className="finance-status-success grid h-11 w-11 place-items-center rounded-[18px] border">
                <Wallet size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
