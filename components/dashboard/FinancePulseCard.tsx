"use client";

import {
  Activity,
  CalendarDays,
  Target,
  Wallet,
} from "lucide-react";
import type { CSSProperties } from "react";

import CountedAmount from "@/components/motion/CountedAmount";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

interface FinancePulseCardProps {
  income: number | string | null;
  expenses: number | string | null;
  net: number | string | null;
  netTone: "positive" | "negative" | "neutral";
  remainingDays: number;
  status: DashboardAvailability;
}

export default function FinancePulseCard({
  income,
  expenses,
  net,
  netTone,
  remainingDays,
  status,
}: FinancePulseCardProps) {
  const { formatCurrency } = useCurrency();
  const displayIncome = income === null ? "Unavailable" : typeof income === "number" ? formatCurrency(income) : income;
  const displayExpenses = expenses === null ? "Unavailable" : typeof expenses === "number" ? formatCurrency(expenses) : expenses;
  const displayNet = net === null ? "Unavailable" : typeof net === "number" ? formatCurrency(net) : net;
  const netDetail =
    status !== "available" ? "Today’s data unavailable"
    : netTone === "positive" ? "Positive cash flow"
    : netTone === "negative" ? "Expense pressure"
    : "Break-even today";
  const summaryTiles = [
    {
      label: "Income",
      value: displayIncome,
      detail: status === "available" ? "Today" : "Temporarily unavailable",
      accent: "var(--success)",
      icon: Wallet,
    },
    {
      label: "Expenses",
      value: displayExpenses,
      detail: status === "available" ? "Today spend" : "Temporarily unavailable",
      accent: "var(--danger)",
      icon: Activity,
    },
    {
      label: "Net Today",
      value: displayNet,
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
    <section aria-label="Today’s financial pulse" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryTiles.map(({ label, value, detail, accent, icon: Icon }) => (
        <article
          key={label}
          className="dashboard-pulse-tile"
          style={{ "--pulse-accent": accent } as CSSProperties}
        >
          <span aria-hidden="true" className="dashboard-pulse-accent" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                {label}
              </p>
              <p
                className="dashboard-pulse-value mt-1.5 break-words font-black leading-tight text-text-primary tabular-nums [overflow-wrap:anywhere]"
                title={value}
              >
                {value === "Unavailable" ? value : <CountedAmount amount={value} />}
              </p>
            </div>
            <span
              className="dashboard-pulse-icon grid h-8 w-8 shrink-0 place-items-center rounded-[13px] border"
              style={{
                color: accent,
                borderColor: `color-mix(in srgb, ${accent}, transparent 74%)`,
                backgroundColor: `color-mix(in srgb, ${accent}, transparent 90%)`,
              }}
            >
              <Icon size={13} strokeWidth={2.2} />
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[10.5px] font-semibold leading-4 text-text-secondary">
            {detail}
          </p>
        </article>
      ))}
    </section>
  );
}
