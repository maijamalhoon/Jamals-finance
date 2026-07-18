"use client";

import type { CSSProperties } from "react";

import CountedAmount from "@/components/motion/CountedAmount";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

import styles from "./FinancePulseCard.module.css";

interface FinancePulseCardProps {
  income: number | string | null;
  expenses: number | string | null;
  net: number | string | null;
  netTone: "positive" | "negative" | "neutral";
  remainingDays: number;
  status: DashboardAvailability;
}

function toFiniteNumber(value: number | string | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
  const displayIncome =
    income === null ? "Unavailable" : typeof income === "number" ? formatCurrency(income) : income;
  const displayExpenses =
    expenses === null ? "Unavailable" : typeof expenses === "number" ? formatCurrency(expenses) : expenses;
  const displayNet = net === null ? "Unavailable" : typeof net === "number" ? formatCurrency(net) : net;
  const numericIncome = toFiniteNumber(income);
  const numericExpenses = toFiniteNumber(expenses);
  const netDetail =
    status !== "available"
      ? "Today’s data unavailable"
      : netTone === "positive"
        ? "Positive cash flow"
        : netTone === "negative"
          ? "Expense pressure"
          : "Break-even today";
  const summaryTiles = [
    {
      label: "Income Today",
      value: displayIncome,
      detail:
        status !== "available"
          ? "Temporarily unavailable"
          : numericIncome === 0
            ? "No deposits yet"
            : "Deposits recorded",
      accent: "var(--success)",
    },
    {
      label: "Expenses Today",
      value: displayExpenses,
      detail:
        status !== "available"
          ? "Temporarily unavailable"
          : numericExpenses === 0
            ? "No spending yet"
            : "Spending recorded",
      accent: "var(--warning)",
    },
    {
      label: "Net Today",
      value: displayNet,
      detail: netDetail,
      accent:
        netTone === "positive"
          ? "var(--success)"
          : netTone === "negative"
            ? "var(--danger)"
            : "var(--text-secondary)",
    },
    {
      label: "Days Remaining",
      value: String(remainingDays),
      detail: "In monthly cycle",
      accent: "var(--active)",
    },
  ];

  return (
    <section
      aria-label="Today’s financial pulse"
      className={`${styles.grid} grid gap-3 sm:grid-cols-2 xl:grid-cols-4`}
    >
      {summaryTiles.map(({ label, value, detail, accent }) => (
        <article
          key={label}
          aria-label={`${label}. ${value}. ${detail}`}
          className={`dashboard-pulse-tile ${styles.tile}`}
          style={{ "--pulse-accent": accent } as CSSProperties}
        >
          <div className={styles.header}>
            <p className={styles.label}>{label}</p>
            <span
              aria-hidden="true"
              className={styles.dot}
              style={{
                backgroundColor: accent,
                boxShadow: `0 0 0 3px color-mix(in srgb, ${accent}, transparent 90%)`,
              }}
            />
          </div>

          <p className={styles.value} title={value}>
            {value === "Unavailable" ? value : <CountedAmount amount={value} />}
          </p>

          <p className={styles.detail}>{detail}</p>
        </article>
      ))}
    </section>
  );
}
