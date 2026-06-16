"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

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
  if (data.length === 0) {
    return (
      <div className="finance-panel p-5 h-full flex flex-col">
        <h3 className="text-white font-semibold text-sm mb-1">
          Spending Breakdown
        </h3>
        <p className="text-slate-500 text-xs">Top categories this month</p>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 text-sm">No expenses this month</p>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-panel p-5 h-full">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm">
          Spending Breakdown
        </h3>
        <p className="text-slate-500 text-xs mt-1">Top categories this month</p>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="relative flex-shrink-0"
          style={{ width: 140, height: 140 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={data[i].color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e2e8f0",
                }}
                formatter={(v: any) => [`PKR ${Number(v).toLocaleString()}`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-slate-500 text-[10px]">Total</p>
            <p className="text-white text-xs font-semibold">
              PKR{" "}
              {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.color }}
                />
                <span className="text-slate-300 text-xs truncate max-w-[90px]">
                  {item.name}
                </span>
              </div>
              <span className="text-slate-500 text-xs">
                {item.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
