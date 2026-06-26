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
import { chartMotion } from "@/components/motion/animation-config";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import ChartFrame from "@/components/ui/chart-frame";

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
  const { formatCurrency } = useCurrency();

  if (!active || !payload?.length) return null;

  const income = Number(payload[0]?.value ?? 0);
  const expenses = Number(payload[1]?.value ?? 0);
  const net = income - expenses;

  return (
    <div className="finance-panel p-3 text-xs shadow-xl">
      <p className="mb-2 font-medium text-slate-400">{label}</p>
      <p className="text-green-300">Income: {formatCurrency(income)}</p>
      <p className="mt-1 text-red-300">
        Expenses: {formatCurrency(expenses)}
      </p>
      <p className={`mt-1 ${net >= 0 ? "text-sky-300" : "text-orange-300"}`}>
        Net: {formatCurrency(net)}
      </p>
    </div>
  );
}

export default function MonthlyChart({ data }: Props) {
  return (
    <div className="finance-panel p-4 sm:p-5">
      <h3 className="mb-5 text-sm font-semibold text-text-primary">
        Monthly Overview (Last 6 Months)
      </h3>
      <ChartFrame className="h-[260px] min-h-[260px] min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 720, height: 280 }}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="income"
              name="Income"
              fill="var(--active)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              isAnimationActive
              {...chartMotion}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="var(--text-secondary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              isAnimationActive
              {...chartMotion}
              animationBegin={140}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
