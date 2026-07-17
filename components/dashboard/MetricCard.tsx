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
  const compactBasis =
    displayComparison.basis === "vs same period last month" ?
      "vs last month"
    : displayComparison.basis;
  const toneColor = SENTIMENT_COLORS[displayComparison.sentiment];
  const DirectionIcon =
    displayComparison.direction === "up" ? ArrowUpRight
    : displayComparison.direction === "down" ? ArrowDownRight
    : displayComparison.direction === "flat" ? Minus
    : CircleDot;

  return (
    <article
      aria-label={`${title}. ${displayAmount}. ${displayComparison.accessibleLabel}`}
      className="dashboard-metric-card flex h-full min-h-[14.25rem] min-w-0 flex-col"
      style={{ "--metric-accent": accentColor } as CSSProperties}
    >
      <span aria-hidden="true" className="dashboard-metric-shape" />

      <div className="relative z-10 flex min-w-0 items-start justify-between gap-1.5">
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

      <div className="relative z-10 mt-4 flex min-w-0 flex-1 flex-col">
        <p className="min-h-8 text-[10.5px] font-semibold uppercase leading-4 tracking-[0.08em] text-text-secondary">
          {title}
        </p>
        <p className="mt-1 min-w-0 break-words text-[clamp(1.2rem,1.65vw,1.55rem)] font-extrabold leading-tight tracking-[-0.025em] text-text-primary tabular-nums [overflow-wrap:anywhere]">
          {amount === null ? displayAmount : <CountedAmount amount={displayAmount} />}
        </p>
        <div className="mt-auto grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-x-2 pt-3 text-[10px] font-medium leading-4 text-text-secondary">
          <span>{subtitle ?? "Current period"}</span>
          <span className="text-right">{compactBasis}</span>
        </div>
      </div>
    </article>
  );
}
