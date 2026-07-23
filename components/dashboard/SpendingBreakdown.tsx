"use client";

import type { CSSProperties } from "react";
import { BarChart3 } from "@/components/icons/jalvoro/compat";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import DashboardCardViewLink from "@/components/dashboard/DashboardCardViewLink";
import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import { useDashboardAnimationReady } from "@/components/motion/useDashboardAnimationReady";
import ChartFrame from "@/components/ui/chart-frame";
import EmptyState from "@/components/ui/empty-state";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";
import { CHART_COLOR_PALETTE } from "@/lib/theme-colors";

import styles from "./SpendingBreakdown.module.css";

interface SpendingData {
  id?: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

type SpendingSegment = SpendingData & {
  accent: string;
  start: number;
  end: number;
};

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
}: {
  data: SpendingData[];
  total: number;
  status?: DashboardAvailability;
  periodLabel?: string;
}) {
  const { reduceMotion, durationScale } = useDashboardAnimationReady();
  const { formatCurrency } = useCurrency();
  const safeTotal = Number.isFinite(total) ? Math.max(total, 0) : 0;
  const donutTotalLabel = formatCurrency(
    safeTotal,
    safeTotal >= 1_000_000
      ? { compact: true, maximumFractionDigits: 1 }
      : undefined,
  );
  const sortedData = [...data]
    .map((item) => ({
      ...item,
      value: Number.isFinite(item.value) ? Math.max(item.value, 0) : 0,
      percentage: Number.isFinite(item.percentage)
        ? Math.max(item.percentage, 0)
        : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (status === "unavailable" || data.length === 0) {
    return (
      <section className="finance-reference-card motion-card-entry flex h-full min-h-[300px] flex-col overflow-hidden p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="dashboard-list-card-kicker-icon !border-transparent !bg-transparent !text-text-secondary !shadow-none">
              <BarChart3 size={15} strokeWidth={2.3} aria-hidden="true" />
            </span>
            <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              Spending Breakdown
            </h3>
          </div>
        </div>
        <div className="dashboard-chart-empty mt-4 flex-1">
          <EmptyState
            compact
            title={
              status === "unavailable"
                ? "Spending unavailable"
                : "No expenses this month"
            }
            description={
              status === "unavailable"
                ? "Refresh when your connection is stable."
                : "Add an expense to see your spending categories here."
            }
            action={
              status === "unavailable" ? undefined : (
                <AddExpenseButton label="Add an expense" showIcon={false} />
              )
            }
          />
        </div>
      </section>
    );
  }

  const segmentState = sortedData.reduce<{
    cursor: number;
    segments: SpendingSegment[];
  }>(
    (state, item, index) => {
      const accent = getCategoryAccent(item, index);
      const share =
        safeTotal > 0
          ? Math.max(0, Math.min((item.value / safeTotal) * 100, 100))
          : Math.max(0, Math.min(item.percentage, 100));
      const start = state.cursor;
      const end = Math.min(100, state.cursor + share);

      return {
        cursor: end,
        segments: [
          ...state.segments,
          {
            ...item,
            accent,
            start,
            end,
          },
        ],
      };
    },
    { cursor: 0, segments: [] },
  );
  const { segments } = segmentState;

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="dashboard-list-card-kicker-icon !border-transparent !bg-transparent !text-text-secondary !shadow-none">
            <BarChart3 size={15} strokeWidth={2.3} aria-hidden="true" />
          </span>
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Spending Breakdown
          </h3>
        </div>

        <DashboardCardViewLink
          href="/dashboard/expenses"
          label="View all expenses"
        />
      </div>

      <div className="mt-4 grid min-h-0 flex-1 items-center gap-6 sm:grid-cols-[minmax(220px,0.95fr)_minmax(0,1.05fr)] sm:gap-5 2xl:grid-cols-1">
        <div className="flex min-w-0 justify-center">
          <div
            aria-label={`Total spending ${formatCurrency(safeTotal)}`}
            className="relative aspect-square w-full max-w-[240px] [container-type:inline-size] min-[420px]:max-w-[248px] sm:max-w-[256px] md:max-w-[272px] lg:max-w-[288px] xl:max-w-[300px] 2xl:max-w-[260px]"
            role="img"
          >
            <ChartFrame>
              {({ width, height }) => (
                <PieChart width={width} height={height} accessibilityLayer>
                  <Pie
                    data={segments}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={2}
                    cornerRadius={8}
                    isAnimationActive={!reduceMotion}
                    animationBegin={0}
                    animationDuration={Math.round(700 * durationScale)}
                    animationEasing="ease-out"
                    stroke="var(--card)"
                    strokeWidth={3}
                  >
                    {segments.map((item, index) => (
                      <Cell
                        key={item.id ?? `${item.name}-${index}`}
                        fill={item.accent}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      maxWidth: "min(78vw, 260px)",
                      background: "var(--chart-tooltip)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-soft)",
                      padding: "10px 12px",
                    }}
                    itemStyle={{
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontWeight: 750,
                      padding: 0,
                    }}
                    labelStyle={{ display: "none" }}
                    formatter={(value, _name, item) => {
                      const segment = item.payload as SpendingSegment | undefined;
                      return [
                        formatCurrency(Number(value ?? 0)),
                        segment?.name ?? "Spending",
                      ];
                    }}
                  />
                </PieChart>
              )}
            </ChartFrame>

            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div className="flex w-[50%] min-w-0 flex-col items-center justify-center">
                <p
                  className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-black leading-none tracking-[-0.04em] text-text-primary tabular-nums"
                  style={{ fontSize: "clamp(0.72rem, 6.1cqw, 1.08rem)" }}
                  title={formatCurrency(safeTotal)}
                >
                  <CountedAmount amount={donutTotalLabel} duration={0.82} />
                </p>
                <p className="mt-1 whitespace-nowrap text-[9px] font-semibold text-text-secondary sm:text-[10px]">
                  Total spent
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-2.5">
          {segments.map((item, index) => (
            <div
              key={item.id ?? `${item.name}-${index}`}
              className="motion-card-entry grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
              style={
                { "--motion-reveal-delay": `${index * 55}ms` } as CSSProperties
              }
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={styles.dot}
                  style={
                    {
                      "--spending-dot-accent": item.accent,
                      "--spending-dot-delay": `${index * -0.48}s`,
                      backgroundColor: item.accent,
                    } as CSSProperties
                  }
                />
                <span className="truncate text-[12px] font-semibold text-text-primary sm:text-[13px] 2xl:text-[12px]">
                  {item.name}
                </span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5 text-right tabular-nums">
                <span className="max-w-[8.5rem] truncate text-[10px] font-extrabold text-text-primary sm:text-[11px]">
                  {formatCurrency(item.value)}
                </span>
                <span className="whitespace-nowrap text-[10px] font-bold text-text-secondary sm:text-[11px]">
                  {formatPercentage(item.percentage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
