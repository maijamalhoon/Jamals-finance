"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartMotion } from "@/components/motion/animation-config";
import ChartFrame from "@/components/ui/chart-frame";

interface ChartData {
  date: string;
  income: number;
  expenses: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="finance-panel p-3 text-xs shadow-xl">
      <p className="text-slate-500 mb-2">{label}</p>
      <p className="text-emerald-600">
        Income: PKR {payload[0]?.value?.toLocaleString()}
      </p>
      <p className="text-red-600 mt-1">
        Expenses: PKR {payload[1]?.value?.toLocaleString()}
      </p>
    </div>
  );
}

export default function IncomeExpenseChart({ data }: { data: ChartData[] }) {
  return (
    <div className="finance-panel h-full p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-slate-950 font-semibold text-sm">
            Income vs Expenses
          </h3>
          <p className="text-slate-500 text-xs mt-1">Daily flow this month</p>
        </div>
        <div className="flex items-center gap-4 rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500 text-xs">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-500 text-xs">Expenses</span>
          </div>
        </div>
      </div>
      <ChartFrame className="h-[220px] min-h-[220px] min-w-0 overflow-hidden sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--active)"
              strokeWidth={2}
              fill="var(--surface-secondary)"
              isAnimationActive
              {...chartMotion}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="var(--text-secondary)"
              strokeWidth={2}
              fill="var(--muted)"
              isAnimationActive
              {...chartMotion}
              animationBegin={140}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
