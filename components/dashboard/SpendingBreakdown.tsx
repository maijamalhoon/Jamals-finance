"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { PieChart } from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";
import { useDashboardAnimationReady } from "@/components/motion/useDashboardAnimationReady";
import EmptyState from "@/components/ui/empty-state";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

interface SpendingData {
  id?: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const CATEGORY_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0d9488",
] as const;

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

  return CATEGORY_PALETTE[stableSeed % CATEGORY_PALETTE.length];
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
    .sort((a, b) => b.value - a.value);

  if (status === "unavailable" || data.length === 0) {
    return (
      <section className="finance-reference-card dashboard-list-card motion-card-entry">
        <div className="dashboard-list-card-header">
          <div className="min-w-0">
            <div className="dashboard-list-card-kicker">
              <span className="dashboard-list-card-kicker-icon">
                <PieChart />
              </span>
              <span className="truncate">Spending Breakdown</span>
            </div>
            <h3 className="dashboard-list-card-title">Top Categories</h3>
            <p className="dashboard-list-card-subtitle">{periodLabel}</p>
          </div>
        </div>
        <div className="dashboard-chart-empty flex-1">
          <EmptyState
            compact
            icon={PieChart}
            title={status === "unavailable" ? "Spending unavailable" : "No expenses this month"}
            description={
              status === "unavailable" ?
                "Refresh when your connection is stable."
              : "Expense categories will appear here once you add spending."
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="finance-reference-card dashboard-list-card motion-card-entry">
      <div className="dashboard-list-card-header">
        <div className="min-w-0">
          <div className="dashboard-list-card-kicker">
            <span className="dashboard-list-card-kicker-icon">
              <PieChart />
            </span>
            <span className="truncate">Spending Breakdown</span>
          </div>
          <h3 className="dashboard-list-card-title">Top Categories</h3>
          <p className="dashboard-list-card-subtitle">{periodLabel}</p>
        </div>

        <Link
          href="/dashboard/expenses"
          className="dashboard-list-card-action"
        >
          Details
        </Link>
      </div>

      <div className="dashboard-list-rows">
        {sortedData.map((item, i) => {
          const accent = getCategoryAccent(item, i);
          const percent = Math.max(0, Math.min(item.percentage, 100));
          const progressWidth = safeTotal > 0 && percent > 0 ? percent : 0;
          const progressScale = ready ? progressWidth / 100 : 0;
          const rowStyle = {
            "--motion-reveal-delay": `${i * 65}ms`,
            "--category-accent": accent,
            "--progress-accent": accent,
          } as CSSProperties;
          const progressStyle = {
            transform: `scaleX(${progressScale})`,
            transitionDuration: reduceMotion ? "0ms" : "820ms",
          } as CSSProperties;
          const percentageStyle = {
            ...rowStyle,
            animationDelay: `${i * 65 + 105}ms`,
          } as CSSProperties;

          return (
            <div
              key={item.id ?? `${item.name}-${i}`}
              className="dashboard-list-row motion-card-entry overflow-hidden"
              data-rank={i + 1}
              style={rowStyle}
            >
              <div className="mb-2.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2.5 sm:gap-x-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,var(--category-accent),transparent_84%)]"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="line-clamp-2 break-words text-[13px] font-semibold leading-5 text-text-primary sm:text-sm">
                    {item.name}
                  </span>
                </div>
                <span
                  className="motion-counter-ready max-w-[7.5rem] break-words text-right text-[12px] font-semibold leading-5 text-text-primary [overflow-wrap:anywhere] sm:max-w-none sm:whitespace-nowrap sm:text-[13px]"
                  style={{ animationDelay: `${i * 65 + 85}ms` }}
                >
                  <CountedAmount
                    amount={formatCurrency(item.value)}
                    duration={0.82}
                  />
                </span>
                <span
                  className="motion-counter-ready w-10 whitespace-nowrap text-right text-[12px] font-bold leading-5 text-[var(--category-accent)] sm:text-[13px]"
                  style={percentageStyle}
                >
                  <CountedAmount amount={formatPercentage(item.percentage)} duration={0.78} />
                </span>
              </div>

              <div className="dashboard-progress-track">
                <div
                  className="dashboard-progress-fill"
                  style={progressStyle}
                />
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
