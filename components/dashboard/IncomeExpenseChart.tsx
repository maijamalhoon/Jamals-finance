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
import ChartCard from "@/components/dashboard/ChartCard";

interface ChartData {
  date: string;
  income: number;
  expenses: number;
}

type ChartTooltipPayload = Array<{
  value?: number;
  dataKey?: "income" | "expenses";
}>;

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const income = payload.find((item) => item.dataKey === "income")?.value ?? 0;
  const expenses =
    payload.find((item) => item.dataKey === "expenses")?.value ?? 0;

  return (
    <div className="finance-panel p-3 text-xs shadow-[var(--shadow-soft)]">
      <p className="mb-2 font-medium text-text-secondary">{label}</p>
      <p className="text-success">
        Income: PKR {income.toLocaleString()}
      </p>
      <p className="mt-1 text-danger">
        Expenses: PKR {expenses.toLocaleString()}
      </p>
    </div>
  );
}

export default function IncomeExpenseChart({ data }: { data: ChartData[] }) {
  return (
    <ChartCard
      eyebrow="Daily Cash Flow"
      title="Income vs Expenses"
      description="In and out movement this month"
      legend={
        <div className="flex items-center justify-center gap-4 rounded-[18px] border border-border bg-surface-secondary px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-xs font-semibold text-text-secondary">In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-danger" />
            <span className="text-xs font-semibold text-text-secondary">Out</span>
          </div>
        </div>
      }
    >
      <ChartFrame className="h-[220px] min-h-[220px] min-w-0 overflow-hidden">
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
              stroke="var(--success)"
              strokeWidth={2}
              fill="color-mix(in srgb, var(--success), transparent 90%)"
              isAnimationActive
              {...chartMotion}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="var(--danger)"
              strokeWidth={2}
              fill="color-mix(in srgb, var(--danger), transparent 92%)"
              isAnimationActive
              {...chartMotion}
              animationBegin={140}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
