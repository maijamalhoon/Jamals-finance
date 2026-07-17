"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartMotion } from "@/components/motion/animation-config";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import ChartFrame from "@/components/ui/chart-frame";

interface Props {
  data: { month: string; income: number; expenses: number }[];
  title?: string;
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
      <p className="mb-2 font-medium text-text-secondary">{label}</p>
      <p className="text-success">Income: {formatCurrency(income)}</p>
      <p className="mt-1 text-danger">
        Expenses: {formatCurrency(expenses)}
      </p>
      <p className={`mt-1 ${net >= 0 ? "text-active" : "text-warning"}`}>
        Net: {formatCurrency(net)}
      </p>
    </div>
  );
}

export default function MonthlyChart({ data, title = "Cash-flow overview" }: Props) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <h3 className="mb-5 text-sm font-semibold text-text-primary">
        {title}
      </h3>
      <p className="sr-only">
        {data.length === 0
          ? "No cash-flow points are available."
          : data
              .map(
                (point) =>
                  `${point.month}: income ${formatCurrency(point.income)}, expenses ${formatCurrency(point.expenses)}`,
              )
              .join(". ")}
      </p>
      <ChartFrame className="h-[260px] min-h-[260px] min-w-0 overflow-hidden">
        {({ width, height }) => (
          <BarChart
            width={width}
            height={height}
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
              tickFormatter={(value) =>
                formatCurrency(Number(value), { compact: true })
              }
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
        )}
      </ChartFrame>
    </div>
  );
}
