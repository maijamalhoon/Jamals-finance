"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const categories = [
  { name: "Food & Dining", value: 42739, pct: 28, color: "#22c55e" },
  { name: "Transport", value: 30509, pct: 20, color: "#a855f7" },
  { name: "Shopping", value: 27467, pct: 18, color: "#f59e0b" },
  { name: "Bills & Utilities", value: 22896, pct: 15, color: "#3b82f6" },
  { name: "Others", value: 28239, pct: 19, color: "#ec4899" },
];

export default function SpendingBreakdown() {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 h-full">
      <h3 className="text-white font-medium text-sm mb-4">
        Spending Breakdown
      </h3>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div
          className="relative flex-shrink-0"
          style={{ width: 140, height: 140 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={2}
                dataKey="value"
              >
                {categories.map((c, i) => (
                  <Cell key={i} fill={c.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: any) => [`PKR ${Number(v).toLocaleString()}`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-gray-500 text-[10px]">Total</p>
            <p className="text-white text-xs font-semibold">PKR 152,640</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          {categories.map((c, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c.color }}
                />
                <span className="text-gray-400 text-xs">{c.name}</span>
              </div>
              <span className="text-gray-500 text-xs">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
