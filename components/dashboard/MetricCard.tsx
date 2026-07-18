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

function getGraphPath(
  value: number,
  direction: DashboardComparison["direction"] | "none",
) {
  const templates: Record<DashboardComparison["direction"] | "none", number[]> = {
    up: [15, 14.5, 13, 10.5, 11, 7.5, 7, 4],
    down: [4, 5.5, 6, 8.5, 9.5, 12.5, 13, 16],
    flat: [10, 9.6, 10.3, 10, 9.7, 10.25, 10, 10],
    none: [10, 10, 10, 10, 10, 10, 10, 10],
  };
  const strength = 0.55 + Math.min(1, Math.max(0, value / 100)) * 0.7;
  const source = templates[direction];
  const points = source.map((rawY, index) => ({
    x: 1 + (index * 98) / Math.max(source.length - 1, 1),
    y: 10 + (rawY - 10) * strength,
  }));

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint.toFixed(2)} ${previous.y.toFixed(2)}, ${midpoint.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`);
}

function MetricGraphLine({
  value,
  direction,
  accent,
  animationKey,
}: {
  value: number;
  direction: DashboardComparison["direction"] | "none";
  accent: string;
  animationKey: string;
}) {
  return (
    <svg
      key={animationKey}
      aria-hidden="true"
      className={`${styles.graph} dashboard-metric-graph`}
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
    >
      <path
        className="dashboard-metric-graph-path dashboard-metric-graph-active"
        d={getGraphPath(value, direction)}
        pathLength={1}
        style={{ stroke: accent }}
        vectorEffect="non-scaling-stroke"
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
  const graphValue = getProgressValue(comparison, availability);
  const graphDirection = comparison?.direction ?? "none";
  const animationKey = `${displayAmount}-${comparison?.label ?? "none"}-${graphValue}`;

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
          {amount === null ? (
            displayAmount
          ) : (
            <CountedAmount amount={displayAmount} animateOnCompact duration={1.25} />
          )}
        </p>

        <div className={`${styles.footer} dashboard-metric-card-footer`}>
          <MetricGraphLine
            accent={metricAccent}
            animationKey={animationKey}
            direction={graphDirection}
            value={graphValue}
          />
        </div>
      </div>
    </article>
  );
}