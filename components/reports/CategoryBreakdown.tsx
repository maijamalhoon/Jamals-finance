interface CategoryData {
  name: string;
  amount: number;
  color: string;
  pct: number;
}

export default function CategoryBreakdown({ data }: { data: CategoryData[] }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <h3 className="text-white font-medium text-sm mb-4">
        Top Expense Categories
      </h3>

      {data.length === 0 ?
        <div className="py-12 text-center">
          <p className="text-gray-600 text-sm">No expenses this month</p>
        </div>
      : <div className="space-y-4">
          {data.map((cat, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span className="text-gray-300 text-sm">{cat.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-white text-sm font-medium">
                    PKR{" "}
                    {cat.amount.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    {cat.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
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
