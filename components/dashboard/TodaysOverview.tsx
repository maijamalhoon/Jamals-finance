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
    { label: "Income", value: income, tone: "text-emerald-300" },
    { label: "Expenses", value: expenses, tone: "text-rose-300" },
    {
      label: "Net Today",
      value: net,
      tone: netPositive ? "text-emerald-300" : "text-rose-300",
    },
    { label: "Entries", value: String(transactionCount), tone: "text-cyan-200" },
  ];
  const diagnostics = [
    ["Active days", String(activeDays)],
    ["Forecast", projectedExpenses],
    ["Days left", String(remainingDays)],
    ["AI confidence", savingsRate >= 0 ? "Stable" : "Watch"],
  ];

  return (
    <section className="finance-panel relative overflow-hidden p-5 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                <Sparkles size={14} />
                Today's Overview
              </div>
              <h3 className="mt-2 text-2xl font-bold tracking-normal text-white">
                Live financial pulse
              </h3>
            </div>
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-3xl bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-200/20">
              <Activity size={19} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-4"
              >
                <p className="text-[11px] font-medium text-slate-500">
                  {tile.label}
                </p>
                <p className={`mt-2 truncate text-base font-bold ${tile.tone}`}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {diagnostics.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.06] bg-black/10 px-3 py-2"
              >
                <p className="text-[10px] text-slate-600">{label}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <BrainCircuit size={16} className="text-violet-200" />
              AI engine insight
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {engineStatus}
            </p>
            <p className="mt-2 text-xs text-slate-500">{focus}</p>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck size={16} className="text-emerald-200" />
              Command center check
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Average daily spend</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {avgDailySpend}
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-emerald-300/15 text-emerald-200">
                <Wallet size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
