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
      ? "M2 15 C14 15 19 11 31 12 C43 14 49 9 61 10 C74 11 83 7 98 4"
      : direction === "down"
        ? "M2 4 C14 5 19 4 31 7 C43 10 49 14 61 13 C74 12 83 15 98 17"
        : "M2 10 C15 9 20 11 33 10 C46 9 53 11 66 10 C79 9 87 11 98 10";

  return (
    <svg
      key={animationKey}
      aria-hidden="true"
      className={`${styles.sparkline} dashboard-metric-progress`}
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
    >
      <path
        className={`${styles.sparklinePath} dashboard-metric-progress-path`}
        d={path}
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
