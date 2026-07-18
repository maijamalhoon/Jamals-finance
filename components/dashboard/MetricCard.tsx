"use client";

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

function getAmountSize(value: string) {
  if (value.length > 17) return "xlong";
  if (value.length > 11) return "long";
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

function getDisplayTitle(title: string) {
  if (title === "Net savings") return "Savings";
  if (title === "Month-to-date income") return "Income";
  if (title === "Month-to-date expenses") return "Expense";
  if (title === "Investment contributions") return "Investment";
  return title;
}

function getAvailabilityLabel(availability: DashboardAvailability) {
  if (availability === "partial") return "Partial data";
  if (availability === "unavailable") return "Unavailable";
  return "Available";
}

function MetricProgressLine({
  direction,
  accent,
  animationKey,
}: {
  direction: DashboardComparison["direction"] | "none";
  accent: string;
  animationKey: string;
}) {
  const path =
    direction === "up"
      ? "M2 21 C14 20 19 15 31 16 C43 18 49 12 61 13 C74 14 83 9 98 6"
      : direction === "down"
        ? "M2 7 C14 8 19 6 31 10 C43 14 49 18 61 17 C74 15 83 20 98 22"
        : "M2 14 C15 13 20 15 33 14 C46 13 53 15 66 14 C79 13 87 15 98 14";

  return (
    <svg
      key={animationKey}
      aria-hidden="true"
      className={`${styles.sparkline} dashboard-metric-progress`}
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
    >
      <path
        className={`${styles.sparklinePath} dashboard-metric-progress-path`}
        d={path}
        pathLength={1}
        style={{ stroke: accent }}
      />
    </svg>
  );
}

export default function MetricCard({
  title,
  amount,
  comparison,
  availability,
  iconName,
  accentColor,
}: MetricCardProps) {
  const { formatCurrency } = useCurrency();
  const displayTitle = getDisplayTitle(title);
  const displayAmount =
    amount === null
      ? "Unavailable"
      : typeof amount === "number"
        ? formatCurrency(amount)
        : amount;
  const amountSize = getAmountSize(displayAmount);
  const metricAccent = getMetricAccent(iconName, amount, accentColor);
  const progressDirection =
    availability === "available" && comparison ? comparison.direction : "none";
  const animationKey = `${displayAmount}-${progressDirection}`;

  return (
    <article
      aria-label={`${displayTitle}. ${displayAmount}. ${getAvailabilityLabel(availability)}.`}
      className={`dashboard-metric-card flex h-full min-h-[14.25rem] min-w-0 flex-col ${styles.card}`}
      style={{ "--metric-accent": metricAccent } as CSSProperties}
    >
      <div className={`${styles.content} dashboard-metric-card-content`}>
        <div className={`${styles.header} dashboard-metric-card-header`}>
          <p className={`${styles.title} dashboard-metric-card-title`}>{displayTitle}</p>
        </div>

        <p
          className={`dashboard-metric-amount dashboard-metric-card-amount ${styles.amount}`}
          data-amount-size={amountSize}
          title={displayAmount}
        >
          {amount === null ? displayAmount : <CountedAmount amount={displayAmount} />}
        </p>

        <div className={`${styles.footer} dashboard-metric-card-footer`}>
          <MetricProgressLine
            accent={metricAccent}
            animationKey={animationKey}
            direction={progressDirection}
          />
        </div>
      </div>
    </article>
  );
}
