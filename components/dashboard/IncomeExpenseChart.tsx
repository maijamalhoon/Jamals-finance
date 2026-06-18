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

interface ChartData {
  date: string;
  income: number;
  expenses: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="finance-panel p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      <p className="text-green-300">
        Income: PKR {payload[0]?.value?.toLocaleString()}
      </p>
      <p className="text-red-300 mt-1">
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
          <h3 className="text-white font-semibold text-sm">
            Income vs Expenses
          </h3>
          <p className="text-slate-500 text-xs mt-1">Daily flow this month</p>
        </div>
        <div className="flex items-center gap-4 rounded-lg bg-white/[0.04] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-300" />
            <span className="text-slate-400 text-xs">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-300" />
            <span className="text-slate-400 text-xs">Expenses</span>
          </div>
        </div>
      </div>
      <div className="h-[220px] sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#86efac" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#86efac" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.26} />
              <stop offset="95%" stopColor="#fca5a5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.12)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#86efac"
            strokeWidth={2}
            fill="url(#incomeGrad)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#fca5a5"
            strokeWidth={2}
            fill="url(#expenseGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
