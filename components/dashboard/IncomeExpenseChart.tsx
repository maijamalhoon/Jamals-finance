"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DollarSign } from "lucide-react";
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
  const chartRows = data.map((point, index) => ({
    ...point,
    day: index + 1,
  }));
  const maxValue = Math.max(
    1000,
    ...chartRows.flatMap((point) => [point.income, point.expenses]),
  );

  return (
    <ChartCard
      eyebrow="Income vs Expenses"
      eyebrowIcon={<DollarSign />}
      title="Daily Cash Flow"
      legendPlacement="header"
      legend={
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-[#19c76f]" />
            <span className="text-[11px] font-medium text-[#7f8798]">In</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-[#ff3b35]" />
            <span className="text-[11px] font-medium text-[#7f8798]">Out</span>
          </div>
        </div>
      }
    >
      <ChartFrame className="h-[169px] min-h-[169px] min-w-0 overflow-hidden" tone="green">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <LineChart
            data={chartRows}
            margin={{ top: 5, right: 4, left: -9, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 6"
              stroke="#e8ecf3"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "#8a93a4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={1}
              minTickGap={16}
            />
            <YAxis
              domain={[0, Math.ceil(maxValue / 250) * 250]}
              tick={{ fill: "#8a93a4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(value) => String(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="income"
              dot={false}
              isAnimationActive
              stroke="#19c76f"
              strokeLinecap="round"
              strokeWidth={2.4}
              {...chartMotion}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              dot={false}
              isAnimationActive
              stroke="#ff3b35"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeWidth={2.4}
              {...chartMotion}
              animationBegin={140}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
