import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

interface FinancePulseCardProps {
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

export default function FinancePulseCard({
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
}: FinancePulseCardProps) {
  const engineStatus =
    savingsRate >= 25 ? "Cash flow is comfortably ahead of spending."
    : savingsRate >= 0 ? "Spending is controlled, but savings can widen."
    : "Expense pressure is outrunning income this month.";

  const focus =
    topCategory ?
      `${topCategory.name} leads spend at ${topCategory.amount}.`
    : "No expense category needs attention today.";

  const summaryTiles = [
    { label: "Income", value: income, tone: "finance-status-success", icon: Wallet },
    { label: "Expenses", value: expenses, tone: "finance-status-danger", icon: Activity },
    {
      label: "Net Today",
      value: net,
      tone: netPositive ? "finance-status-success" : "finance-status-danger",
      icon: Target,
    },
    {
      label: "Entries",
      value: String(transactionCount),
      tone: "finance-status-info",
      icon: CalendarDays,
    },
  ];

  const diagnostics = [
    { label: "Month progress", value: `${activeDays} active days`, icon: Activity },
    { label: "Spend forecast", value: projectedExpenses, icon: Gauge },
    { label: "Days remaining", value: String(remainingDays), icon: CalendarDays },
    {
      label: "AI confidence",
      value: savingsRate >= 0 ? "Stable" : "Watch",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="finance-reference-card relative overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-active">
            <Sparkles size={14} />
            Finance Overview
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-normal text-text-primary">
              Live Financial Pulse
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Live
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/ai-insights"
          className="finance-focus inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-3 py-2 text-xs font-bold text-text-primary transition-all hover:-translate-y-px hover:bg-hover"
        >
          All Insights
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryTiles.map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className={`rounded-[22px] border p-4 ${tone}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em]">
                {label}
              </p>
              <Icon size={15} />
            </div>
            <p className="mt-3 truncate text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="my-5 h-px bg-border" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {diagnostics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-[20px] border border-border bg-surface-secondary p-4"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold text-text-secondary">
              <Icon size={14} className="text-active" />
              {label}
            </div>
            <p className="mt-2 truncate text-sm font-bold text-text-primary">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-border bg-card/70 p-4 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <BrainCircuit size={16} className="text-active" />
              AI Engine Insight
            </div>
            <p className="mt-2 text-sm leading-6 text-text-primary">
              {engineStatus}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {focus} Average daily spend is {avgDailySpend}.
            </p>
          </div>
          <Link
            href="/dashboard/ai-insights"
            className="primary-action min-w-[126px] rounded-full"
          >
            Analyze
          </Link>
        </div>
      </div>
    </section>
  );
}
