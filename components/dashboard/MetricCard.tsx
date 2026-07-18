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

function getProgressValue(
  comparison: DashboardComparison | null,
  availability: DashboardAvailability,
) {
  if (availability === "unavailable" || !comparison) return 0;

  const label = comparison.label.trim().replaceAll(",", "").toLowerCase();
  if (label.includes("no activity")) return 0;
  if (label.includes("new activity")) return 100;

  const percentage = label.match(/([+-]?\d+(?:\.\d+)?)%/);
  if (percentage) {
    const magnitude = Math.abs(Number(percentage[1]));
    if (Number.isFinite(magnitude)) {
      return Math.min(100, Math.max(0, (magnitude / (magnitude + 100)) * 100));
    }
  }

  if (comparison.direction === "flat") return 50;
  if (comparison.direction === "up" || comparison.direction === "down") return 40;
  return 0;
}

function MetricProgressLine({
  value,
  accent,
  animationKey,
}: {
  value: number;
  accent: string;
  animationKey: string;
}) {
  return (
    <div aria-hidden="true" className="dashboard-metric-progress">
      <span
        key={animationKey}
        className="dashboard-metric-progress-fill"
        style={
          {
            "--metric-progress": `${value}%`,
            backgroundColor: accent,
          } as CSSProperties
        }
      />
    </div>
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
  const progressValue = getProgressValue(comparison, availability);
  const animationKey = `${displayAmount}-${comparison?.label ?? "none"}-${progressValue}`;

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
            value={progressValue}
          />
        </div>
      </div>
    </article>
  );
}
