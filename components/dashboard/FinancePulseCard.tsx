import {
  Activity,
  CalendarDays,
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
  );
}
