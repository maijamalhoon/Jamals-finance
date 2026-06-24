import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";

interface FinancePulseCardProps {
  income: string;
  expenses: string;
  net: string;
  netTone: "positive" | "negative" | "neutral";
  remainingDays: number;
}

export default function FinancePulseCard({
  income,
  expenses,
  net,
  netTone,
  remainingDays,
}: FinancePulseCardProps) {
  const pulseStatus =
    netTone === "positive" ? "Today is positive"
    : netTone === "negative" ? "Today needs attention"
    : "No net movement today";
  const netDetail =
    netTone === "positive" ? "Positive cash flow"
    : netTone === "negative" ? "Expense pressure"
    : "Break-even today";
  const netClass =
    netTone === "positive" ? "finance-status-success"
    : netTone === "negative" ? "finance-status-danger"
    : "border-border bg-surface-secondary text-text-secondary";

  const summaryTiles = [
    {
      label: "Income",
      value: income,
      detail: "Today",
      tone: "finance-status-success",
      icon: Wallet,
    },
    {
      label: "Expenses",
      value: expenses,
      detail: "Today spend",
      tone: "finance-status-danger",
      icon: Activity,
    },
    {
      label: "Net Today",
      value: net,
      detail: netDetail,
      tone: netClass,
      icon: Target,
    },
    {
      label: "Days Remaining",
      value: String(remainingDays),
      detail: "Month cycle",
      tone: "finance-status-info",
      icon: CalendarDays,
    },
  ];

  return (
    <section className="finance-surface relative overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="finance-icon-container" data-size="sm" aria-hidden>
              <Sparkles size={14} />
            </span>
            <h2 className="text-lg font-bold tracking-normal text-text-primary">
              Live Financial Pulse
            </h2>
          </div>
          <p className="mt-1 text-xs text-text-secondary">{pulseStatus}</p>
        </div>

        <Link
          href="/dashboard/ai-insights"
          className="finance-focus finance-interactive-tile flex min-h-9 items-center gap-1.5 border-border bg-surface-secondary px-3 py-2 text-xs font-bold text-text-primary"
        >
          Insights
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryTiles.map(({ label, value, detail, tone, icon: Icon }) => (
          <article key={label} className={`rounded-[18px] border p-3.5 ${tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em]">
                  {label}
                </p>
                <p className="mt-2 truncate text-base font-bold sm:text-lg">
                  <CountedAmount amount={value} />
                </p>
              </div>
              <Icon size={15} className="mt-0.5 shrink-0" />
            </div>
            <p className="mt-2 truncate text-[11px] font-semibold opacity-80">
              {detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
