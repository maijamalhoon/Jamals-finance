interface CategoryData {
  name: string;
  amount: number;
  color: string;
  pct: number;
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
          {data.map((cat, i) => (
            <div key={i}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: cat.color }}
                  />
                  <span className="truncate text-sm font-medium text-text-primary">
                    {cat.name}
                  </span>
                </div>
                <div className="min-w-0 shrink text-right">
                  <span className="block break-words text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">
                    {`PKR ${cat.amount.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}`}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {cat.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="motion-progress-fill h-full rounded-full transition-all"
                  style={{ width: `${cat.pct}%`, background: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
