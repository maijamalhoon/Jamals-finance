import Money from "@/components/currency/Money";

interface CategoryData {
  name: string;
  amount: number;
  color: string;
  pct: number;
}

const FALLBACK_COLOR = "#64748b";

function isUsableColor(color: string | null | undefined): color is string {
  return (
    typeof color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
  );
}

export default function CategoryBreakdown({ data }: { data: CategoryData[] }) {
  return (
    <div className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">
        Top Expense Categories
      </h3>

      {data.length === 0 ?
        <div className="py-12 text-center">
          <p className="text-sm text-text-secondary">No expenses this month</p>
        </div>
      : <div className="space-y-4">
          {data.map((cat, i) => {
            const accent = isUsableColor(cat.color) ? cat.color : FALLBACK_COLOR;

            return (
              <div key={`${cat.name}-${i}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {cat.name}
                    </span>
                  </div>
                  <div className="min-w-0 shrink text-right">
                    <span className="block break-words text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">
                      <Money amount={cat.amount} />
                    </span>
                    <span className="text-xs text-text-secondary">
                      {cat.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="motion-progress-fill h-full rounded-full transition-all"
                    style={{ width: `${cat.pct}%`, background: accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
