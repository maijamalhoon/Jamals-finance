"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { month: string; income: number; expenses: number }[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const net = payload[0]?.value - payload[1]?.value;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      <p className="text-green-400">
        Income: PKR {payload[0]?.value?.toLocaleString()}
      </p>
      <p className="text-red-400 mt-1">
        Expenses: PKR {payload[1]?.value?.toLocaleString()}
      </p>
      <p className={`mt-1 ${net >= 0 ? "text-blue-400" : "text-orange-400"}`}>
        Net: PKR {net.toLocaleString()}
      </p>
    </div>
  );
}

export default function MonthlyChart({ data }: Props) {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <h3 className="text-white font-medium text-sm mb-5">
        Monthly Overview (Last 6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1f2937"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="income"
            name="Income"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
