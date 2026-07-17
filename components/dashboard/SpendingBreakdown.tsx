"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { PieChart } from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import { useDashboardAnimationReady } from "@/components/motion/useDashboardAnimationReady";
import EmptyState from "@/components/ui/empty-state";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";
import { CHART_COLOR_PALETTE } from "@/lib/theme-colors";

interface SpendingData {
  id?: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

function isUsableColor(color: string | null | undefined): color is string {
  return (
    typeof color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
  );
}

function getCategoryAccent(item: SpendingData, index: number) {
  if (isUsableColor(item.color)) return item.color;

  const stableSeed = item.name
    .split("")
    .reduce((total, letter) => total + letter.charCodeAt(0), index);

  return CHART_COLOR_PALETTE[stableSeed % CHART_COLOR_PALETTE.length];
}

function formatPercentage(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return `${safeValue.toFixed(1)}%`;
}

export default function SpendingBreakdown({
  data,
  total,
  status = "available",
  periodLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }),
}: {
  data: SpendingData[];
  total: number;
  status?: DashboardAvailability;
  periodLabel?: string;
}) {
  const { ready, reduceMotion } = useDashboardAnimationReady();
  const { formatCurrency } = useCurrency();
  const safeTotal = Number.isFinite(total) ? Math.max(total, 0) : 0;
  const sortedData = [...data]
    .map((item) => ({
      ...item,
      value: Number.isFinite(item.value) ? Math.max(item.value, 0) : 0,
      percentage:
        Number.isFinite(item.percentage) ? Math.max(item.percentage, 0) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (status === "unavailable" || data.length === 0) {
    return (
      <section className="finance-reference-card motion-card-entry flex h-full min-h-[300px] flex-col overflow-hidden p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="dashboard-list-card-kicker-icon">
              <PieChart />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                Spending Breakdown
              </h3>
              <p className="mt-1 truncate text-[10px] font-medium text-text-tertiary">
                {periodLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="dashboard-chart-empty mt-4 flex-1">
          <EmptyState
            compact
            icon={PieChart}
            title={
              status === "unavailable"
                ? "Spending unavailable"
                : "No expenses this month"
            }
            description={
              status === "unavailable"
                ? "Refresh when your connection is stable."
                : "Expense categories will appear here once you add spending."
            }
          />
        </div>
      </section>
    );
  }

  let cursor = 0;
  const segments = sortedData.map((item, index) => {
    const accent = getCategoryAccent(item, index);
    const share =
      safeTotal > 0
        ? Math.max(0, Math.min((item.value / safeTotal) * 100, 100))
        : Math.max(0, Math.min(item.percentage, 100));
    const start = cursor;
    const end = Math.min(100, cursor + share);
    cursor = end;
    return {
      ...item,
      accent,
      start,
      end,
    };
  });
  const gradientParts = segments.map(
    (item) => `${item.accent} ${item.start}% ${item.end}%`,
  );
  if (cursor < 100) {
    gradientParts.push(`var(--surface-secondary) ${cursor}% 100%`);
  }
  const donutStyle = {
    background: `conic-gradient(${gradientParts.join(", ")})`,
    opacity: ready ? 1 : 0.35,
    transform: ready ? "scale(1) rotate(0deg)" : "scale(0.9) rotate(-14deg)",
    transitionDuration: reduceMotion ? "0ms" : "700ms",
  } as CSSProperties;

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="dashboard-list-card-kicker-icon">
            <PieChart />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              Spending Breakdown
            </h3>
            <p className="mt-1 truncate text-[10px] font-medium text-text-tertiary">
              {periodLabel}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/expenses"
          className="dashboard-list-card-action"
        >
          Details
        </Link>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 items-center gap-5 sm:grid-cols-[minmax(130px,0.8fr)_minmax(0,1.2fr)] sm:gap-4 2xl:grid-cols-1">
        <div className="flex justify-center 2xl:justify-start">
          <div
            aria-label={`Total spending ${formatCurrency(safeTotal)}`}
            className="relative grid size-[150px] shrink-0 place-items-center rounded-full transition-[opacity,transform] sm:size-[160px] 2xl:size-[150px]"
            role="img"
            style={donutStyle}
          >
            <div className="absolute inset-[18px] rounded-full border border-border/60 bg-card shadow-[inset_0_1px_5px_rgb(15_23_42_/_0.06)]" />
            <div className="relative z-10 max-w-[105px] text-center">
              <p className="break-words text-[15px] font-black leading-tight tracking-[-0.02em] text-text-primary tabular-nums [overflow-wrap:anywhere]">
                <CountedAmount amount={formatCurrency(safeTotal)} duration={0.82} />
              </p>
              <p className="mt-1 text-[10px] font-semibold text-text-secondary">
                Total spent
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-2.5">
          {segments.map((item, index) => (
            <div
              key={item.id ?? `${item.name}-${index}`}
              className="motion-card-entry grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
              style={{ "--motion-reveal-delay": `${index * 55}ms` } as CSSProperties}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
                <span className="truncate text-[12px] font-semibold text-text-primary sm:text-[13px] 2xl:text-[12px]">
                  {item.name}
                </span>
              </div>
              <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-text-secondary sm:text-xs">
                {formatPercentage(item.percentage)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
