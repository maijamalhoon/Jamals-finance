"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDot,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import type {
  DashboardAvailability,
  DashboardComparison,
} from "@/lib/dashboard-financial-semantics";

type MetricIconName = "wallet" | "income" | "expenses" | "investments";

interface MetricCardProps {
  title: string;
  subtitle?: string;
  amount: number | string | null;
  comparison: DashboardComparison | null;
  availability: DashboardAvailability;
  iconName: MetricIconName;
  accentColor: string;
}

const ICONS: Record<MetricIconName, typeof Wallet> = {
  wallet: Wallet,
  income: TrendingUp,
  expenses: TrendingDown,
  investments: Zap,
};

const SENTIMENT_COLORS = {
  positive: "var(--success)",
  negative: "var(--danger)",
  neutral: "var(--text-secondary)",
  info: "var(--info)",
  warning: "var(--warning)",
} as const;

export default function MetricCard({
  title,
  subtitle,
  amount,
  comparison,
  availability,
  iconName,
  accentColor,
}: MetricCardProps) {
  const { formatCurrency } = useCurrency();
  const Icon = ICONS[iconName];
  const displayAmount =
    amount === null ? "Unavailable"
    : typeof amount === "number" ? formatCurrency(amount)
    : amount;
  const displayComparison =
    availability === "partial" ?
      {
        label: "Partial data",
        basis: "Comparison withheld",
        direction: "none" as const,
        sentiment: "warning" as const,
        accessibleLabel: `${title} is based on partial data. A period comparison is not shown.`,
      }
    : availability === "unavailable" || !comparison ?
      {
        label: "Unavailable",
        basis: "Try again later",
        direction: "none" as const,
        sentiment: "warning" as const,
        accessibleLabel: `${title} is unavailable.`,
      }
    : comparison;
  const toneColor = SENTIMENT_COLORS[displayComparison.sentiment];
  const DirectionIcon =
    displayComparison.direction === "up" ? ArrowUpRight
    : displayComparison.direction === "down" ? ArrowDownRight
    : displayComparison.direction === "flat" ? Minus
    : CircleDot;

  return (
    <article
      aria-label={`${title}. ${displayAmount}. ${displayComparison.accessibleLabel}`}
      className="dashboard-metric-card"
      style={{ "--metric-accent": accentColor } as CSSProperties}
    >
      <span aria-hidden="true" className="dashboard-metric-shape" />

      <div className="relative z-10 flex min-w-0 items-start justify-between gap-2">
        <span className="dashboard-metric-icon" aria-hidden="true">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <span
          className="dashboard-comparison-badge"
          style={{
            "--comparison-color": toneColor,
            flexShrink: 0,
            maxWidth: "none",
            whiteSpace: "nowrap",
          } as CSSProperties}
        >
          <DirectionIcon aria-hidden="true" size={12} />
          <span>{displayComparison.label}</span>
        </span>
      </div>

      <div className="relative z-10 mt-5 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
          {title}
        </p>
        <p className="mt-1.5 min-w-0 break-words text-[clamp(1.2rem,1.65vw,1.55rem)] font-black leading-tight tracking-[-0.035em] text-text-primary tabular-nums [overflow-wrap:anywhere]">
          {amount === null ? displayAmount : <CountedAmount amount={displayAmount} />}
        </p>
        <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10.5px] font-semibold leading-4 text-text-secondary">
          <span>{subtitle ?? "Current period"}</span>
          <span className="text-right">{displayComparison.basis}</span>
        </div>
      </div>
    </article>
  );
}
