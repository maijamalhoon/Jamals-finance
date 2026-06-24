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
  const summaryTiles = [
    {
      label: "Income",
      value: income,
      detail: "Today",
      accent: "var(--success)",
      icon: Wallet,
    },
    {
      label: "Expenses",
      value: expenses,
      detail: "Today spend",
      accent: "var(--danger)",
      icon: Activity,
    },
    {
      label: "Net Today",
      value: net,
      detail: netDetail,
      accent:
        netTone === "positive" ? "var(--success)"
        : netTone === "negative" ? "var(--danger)"
        : "var(--text-secondary)",
      icon: Target,
    },
    {
      label: "Days Remaining",
      value: String(remainingDays),
      detail: "Month cycle",
      accent: "var(--active)",
      icon: CalendarDays,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-border/80 bg-surface-secondary/70 px-4 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.34)] sm:px-5 sm:py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[14px] border border-active/20 bg-active/10 text-active" aria-hidden>
              <Sparkles size={14} />
            </span>
            <h2 className="text-base font-bold tracking-normal text-text-primary">
              Live Financial Pulse
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] text-text-secondary">{pulseStatus}</p>
        </div>

        <Link
          href="/dashboard/ai-insights"
          className="finance-focus finance-pressable flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-text-primary hover:bg-hover"
        >
          Insights
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryTiles.map(({ label, value, detail, accent, icon: Icon }) => (
          <article
            key={label}
            className="relative overflow-hidden rounded-[16px] border border-border/70 bg-card/72 px-3 py-2.5 shadow-[0_1px_2px_rgb(16_24_40_/_0.035)]"
          >
            <span
              className="absolute inset-y-2 left-0 w-1 rounded-r-full"
              style={{ backgroundColor: accent }}
            />
            <div className="flex items-start justify-between gap-3 pl-1.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-bold text-text-primary sm:text-[15px]">
                  <CountedAmount amount={value} />
                </p>
              </div>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent}, transparent 90%)`,
                }}
              >
                <Icon size={13} strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-1 truncate pl-1.5 text-[10.5px] font-semibold text-text-secondary">
              {detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
