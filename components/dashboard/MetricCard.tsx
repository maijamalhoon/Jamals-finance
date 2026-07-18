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

import styles from "./MetricCard.module.css";

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

function compactPercentageLabel(label: string) {
  const compactSource = label.trim().replaceAll(" ", "");
  const match = compactSource.match(/^([+-]?)([\d,]+(?:\.\d+)?)%$/);
  if (!match) return label;

  const signedValue = Number(`${match[1]}${match[2].replaceAll(",", "")}`);
  if (!Number.isFinite(signedValue) || Math.abs(signedValue) < 1000) return label;

  const compactValue = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.abs(signedValue));
  const sign = signedValue < 0 ? "-" : match[1] === "+" ? "+" : "";

  return `${sign}${compactValue}%`;
}

function getAmountSize(value: string) {
  if (value.length > 22) return "xlong";
  if (value.length > 15) return "long";
  return "normal";
}

function getMetricAccent(
  iconName: MetricIconName,
  amount: MetricCardProps["amount"],
  accentColor: string,
) {
  if (iconName === "income") return "var(--success)";
  if (iconName === "expenses") return "var(--warning)";
  if (iconName !== "wallet" || typeof amount !== "number" || !Number.isFinite(amount)) {
    return accentColor;
  }
  if (amount < 0) return "var(--danger)";
  if (amount > 0) return "var(--success)";
  return "var(--info)";
}

function getCompactBasis(basis: string) {
  const normalized = basis.toLowerCase();
  if (normalized.includes("last month")) return "MoM";
  if (normalized.includes("gain")) return "gain";
  if (normalized.includes("cost")) return "vs cost";
  if (normalized.includes("withheld") || normalized.includes("try again")) return "";
  return basis.length <= 11 ? basis : "";
}

function getDisplayTitle(title: string) {
  if (title === "Month-to-date income") return "MTD income";
  if (title === "Month-to-date expenses") return "MTD expenses";
  if (title === "Investment contributions") return "Investments";
  return title;
}

function MetricSparkline({
  direction,
  accent,
}: {
  direction: DashboardComparison["direction"] | "none";
  accent: string;
}) {
  const path =
    direction === "up"
      ? "M2 18 C10 17 13 13 21 14 C29 15 31 11 39 12 C48 13 52 8 60 9 C66 9 69 6 72 5"
      : direction === "down"
        ? "M2 7 C10 8 14 6 21 9 C28 12 31 16 39 15 C48 14 52 19 60 18 C66 17 69 20 72 21"
        : "M2 13 C10 12 14 14 22 13 C30 12 34 14 42 13 C51 12 56 14 64 13 C68 12 70 13 72 13";

  return (
    <svg
      aria-hidden="true"
      className={styles.sparkline}
      viewBox="0 0 74 26"
      preserveAspectRatio="none"
    >
      <path
        className={styles.sparklinePath}
        d={path}
        style={{ stroke: accent }}
      />
    </svg>
  );
}

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
  const displayTitle = getDisplayTitle(title);
  const displaySubtitle =
    title === "Investment contributions" ? "MTD contributions" : subtitle ?? "Current period";
  const displayAmount =
    amount === null
      ? "Unavailable"
      : typeof amount === "number"
        ? formatCurrency(amount)
        : amount;
  const amountSize = getAmountSize(displayAmount);
  const displayComparison =
    availability === "partial"
      ? {
          label: "Partial data",
          basis: "Comparison withheld",
          direction: "none" as const,
          sentiment: "warning" as const,
          accessibleLabel: `${title} is based on partial data. A period comparison is not shown.`,
        }
      : availability === "unavailable" || !comparison
        ? {
            label: "Unavailable",
            basis: "Try again later",
            direction: "none" as const,
            sentiment: "warning" as const,
            accessibleLabel: `${title} is unavailable.`,
          }
        : comparison;
  const compactComparison = compactPercentageLabel(displayComparison.label);
  const compactBasis = getCompactBasis(displayComparison.basis);
  const toneColor = SENTIMENT_COLORS[displayComparison.sentiment];
  const metricAccent = getMetricAccent(iconName, amount, accentColor);
  const DirectionIcon =
    displayComparison.direction === "up"
      ? ArrowUpRight
      : displayComparison.direction === "down"
        ? ArrowDownRight
        : displayComparison.direction === "flat"
          ? Minus
          : CircleDot;

  return (
    <article
      aria-label={`${title}. ${displayAmount}. ${displayComparison.accessibleLabel}`}
      className={`dashboard-metric-card flex h-full min-h-[14.25rem] min-w-0 flex-col ${styles.card}`}
      style={{ "--metric-accent": metricAccent } as CSSProperties}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headingCopy}>
            <p className={styles.title}>{displayTitle}</p>
            <p className={styles.subtitle}>{displaySubtitle}</p>
          </div>

          <span
            aria-hidden="true"
            className={styles.icon}
            style={{
              color: metricAccent,
              borderColor: `color-mix(in srgb, ${metricAccent}, transparent 80%)`,
              backgroundColor: `color-mix(in srgb, ${metricAccent}, transparent 91%)`,
            }}
          >
            <Icon size={15} strokeWidth={2.15} />
          </span>
        </div>

        <p
          className={`dashboard-metric-amount ${styles.amount}`}
          data-amount-size={amountSize}
          title={displayAmount}
        >
          {amount === null ? displayAmount : <CountedAmount amount={displayAmount} />}
        </p>

        <div className={styles.footer}>
          <span
            className={styles.badge}
            title={`${displayComparison.label} ${displayComparison.basis}`.trim()}
            style={{
              "--comparison-color": toneColor,
            } as CSSProperties}
          >
            <DirectionIcon aria-hidden="true" size={12} strokeWidth={2.2} />
            <span className={styles.badgeValue}>{compactComparison}</span>
            {compactBasis ? <span className={styles.badgeBasis}>{compactBasis}</span> : null}
          </span>

          <MetricSparkline
            accent={metricAccent}
            direction={displayComparison.direction}
          />
        </div>
      </div>
    </article>
  );
}
