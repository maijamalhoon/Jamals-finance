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
      <div className="finance-panel flex h-full min-h-[260px] flex-col p-5">
        <h3 className="text-slate-950 font-semibold text-sm mb-1">
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
    <div className="finance-panel h-full p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-slate-950 font-semibold text-sm">
          Spending Breakdown
        </h3>
        <p className="text-slate-500 text-xs mt-1">Top categories this month</p>
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
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
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#101828",
                }}
                formatter={(v: any) => [`PKR ${Number(v).toLocaleString()}`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-slate-500 text-[10px]">Total</p>
            <p className="text-slate-950 text-xs font-semibold">
              PKR{" "}
              {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="w-full flex-1 space-y-3">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.color }}
                />
                <span className="truncate text-xs text-slate-700">
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
