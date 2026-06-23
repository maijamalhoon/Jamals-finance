import { PieChart } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

interface SpendingData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export default function SpendingBreakdown({
  data,
  total,
}: {
  data: SpendingData[];
  total: number;
}) {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

  if (data.length === 0) {
    return (
      <div className="finance-reference-card flex h-full min-h-[360px] flex-col p-5">
        <h3 className="mb-1 text-sm font-semibold text-text-primary">
          Spending Breakdown
        </h3>
        <p className="text-xs text-text-secondary">Top categories this month</p>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            compact
            icon={PieChart}
            title="No expenses this month"
            description="Expense categories will appear here once you add spending."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="finance-reference-card flex h-full min-h-[380px] flex-col p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-text-primary">
          Spending Breakdown
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          Top categories this month
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {sortedData.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            className="group rounded-[18px] border border-border bg-surface-secondary p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-hover hover:shadow-[var(--shadow-soft)]"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full border-0 shadow-none"
                  style={{ background: item.color }}
                />
                <p className="truncate text-sm font-medium text-text-primary">
                  {item.name}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-text-primary">
                  PKR{" "}
                  {item.value.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-text-primary">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-card">
              <div
                className="motion-progress-fill h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(2, Math.min(item.percentage, 100))}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[18px] border border-border bg-surface-secondary px-3 py-2.5">
        <span className="text-xs font-semibold text-text-secondary">
          Total tracked
        </span>
        <span className="text-sm font-bold text-text-primary">
          PKR {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}
