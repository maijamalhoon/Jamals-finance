import type { CSSProperties } from "react";
import { PieChart } from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";

interface SpendingData {
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
] as const;

function isUsableColor(color: string | null | undefined) {
  return Boolean(color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color));
}

function getCategoryAccent(item: SpendingData, index: number) {
  if (isUsableColor(item.color)) return item.color;

  const stableSeed = item.name
    .split("")
    .reduce((total, letter) => total + letter.charCodeAt(0), index);

  return CATEGORY_PALETTE[stableSeed % CATEGORY_PALETTE.length];
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return `PKR ${safeValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function formatPercentage(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return `${Math.round(safeValue)}%`;
}

export default function SpendingBreakdown({
  data,
  total,
  periodLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }),
}: {
  data: SpendingData[];
  total: number;
  periodLabel?: string;
}) {
  const safeTotal = Number.isFinite(total) ? Math.max(total, 0) : 0;
  const sortedData = [...data]
    .map((item) => ({
      ...item,
      value: Number.isFinite(item.value) ? Math.max(item.value, 0) : 0,
      percentage:
        Number.isFinite(item.percentage) ? Math.max(item.percentage, 0) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (data.length === 0) {
    return (
      <section className="finance-reference-card motion-card-entry flex h-full min-h-[380px] min-w-0 flex-col overflow-hidden p-5 sm:p-6">
        <div className="mb-5 min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-secondary text-text-tertiary [&>svg]:h-3.5 [&>svg]:w-3.5">
              <PieChart />
            </span>
            <span className="truncate">Spending Breakdown</span>
          </div>
          <h3 className="text-[18px] font-semibold leading-tight tracking-normal text-text-primary">
            Top Categories
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Top categories this month
          </p>
        </div>
        <div className="dashboard-chart-empty flex-1">
          <EmptyState
            compact
            icon={PieChart}
            title="No expenses this month"
            description="Expense categories will appear here once you add spending."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[380px] min-w-0 flex-col overflow-hidden p-5 sm:p-6">
      <div className="mb-5 min-w-0">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-secondary text-text-tertiary [&>svg]:h-3.5 [&>svg]:w-3.5">
            <PieChart />
          </span>
          <span className="truncate">Spending Breakdown</span>
        </div>
        <h3 className="text-[18px] font-semibold leading-tight tracking-normal text-text-primary">
          Top Categories
        </h3>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          {periodLabel}
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        {sortedData.map((item, i) => {
          const accent = getCategoryAccent(item, i);
          const percent = Math.max(0, Math.min(item.percentage, 100));
          const progressWidth =
            safeTotal > 0 && percent > 0 ? Math.max(2, percent) : 0;
          const rowStyle = {
            "--motion-reveal-delay": `${i * 65}ms`,
            "--category-accent": accent,
          } as CSSProperties;
          const percentageStyle = {
            ...rowStyle,
            animationDelay: `${i * 65 + 105}ms`,
          } as CSSProperties;

          return (
            <div
              key={`${item.name}-${i}`}
              className="motion-card-entry min-w-0 border-b border-border/70 py-3 first:pt-0 last:border-b-0 last:pb-0"
              style={rowStyle}
            >
              <div className="mb-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2.5 sm:gap-x-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,var(--category-accent),transparent_84%)]"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="truncate text-[13px] font-semibold leading-5 text-text-primary sm:text-sm">
                    {item.name}
                  </span>
                </div>
                <span
                  className="motion-counter-ready whitespace-nowrap text-right text-[12px] font-semibold leading-5 text-text-primary sm:text-[13px]"
                  style={{ animationDelay: `${i * 65 + 85}ms` }}
                >
                  <CountedAmount amount={formatCurrency(item.value)} />
                </span>
                <span
                  className="motion-counter-ready w-10 whitespace-nowrap text-right text-[12px] font-bold leading-5 text-[var(--category-accent)] sm:text-[13px]"
                  style={percentageStyle}
                >
                  <CountedAmount amount={formatPercentage(item.percentage)} />
                </span>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accent}, var(--card) 88%)`,
                }}
              >
                <div
                  className="motion-progress-fill h-full rounded-full"
                  style={{
                    width: `${progressWidth}%`,
                    backgroundColor: accent,
                    animationDelay: `${i * 70 + 150}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex min-w-0 items-center justify-between gap-3 rounded-[20px] border border-border/80 bg-surface-secondary/80 px-4 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.28)]">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold leading-5 text-text-primary">
            <CountedAmount amount={formatCurrency(safeTotal)} />
          </p>
          <p className="mt-1 truncate text-[11px] font-medium leading-none text-text-secondary">
            Total tracked
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold leading-none text-text-secondary shadow-[0_1px_2px_rgb(16_24_40_/_0.04)]">
          {periodLabel}
        </span>
      </div>
    </section>
  );
}
