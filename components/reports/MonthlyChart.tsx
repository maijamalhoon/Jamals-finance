"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: { month: string; income: number; expenses: number }[];
}

interface TooltipPayload {
  value?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const income = Number(payload[0]?.value ?? 0);
  const expenses = Number(payload[1]?.value ?? 0);
  const net = income - expenses;

  return (
    <div className="finance-panel p-3 text-xs shadow-xl">
      <p className="mb-2 font-medium text-slate-400">{label}</p>
      <p className="text-green-300">Income: PKR {income.toLocaleString()}</p>
      <p className="mt-1 text-red-300">
        Expenses: PKR {expenses.toLocaleString()}
      </p>
      <p className={`mt-1 ${net >= 0 ? "text-sky-300" : "text-orange-300"}`}>
        Net: PKR {net.toLocaleString()}
      </p>
    </div>
  );
}

export default function MonthlyChart({ data }: Props) {
  return (
    <div className="finance-panel p-4 sm:p-5">
      <h3 className="mb-5 text-sm font-semibold text-white">
        Monthly Overview (Last 6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.12)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="income"
            name="Income"
            fill="#86efac"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#fca5a5"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
