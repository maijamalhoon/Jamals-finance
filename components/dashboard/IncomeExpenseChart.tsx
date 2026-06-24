"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  const hasCashFlow = chartRows.some(
    (point) => point.income > 0 || point.expenses > 0,
  );
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
            <span className="h-px w-5 bg-[var(--dashboard-chart-income)]" />
            <span className="text-[11px] font-medium text-text-secondary">In</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-[var(--dashboard-chart-expense)]" />
            <span className="text-[11px] font-medium text-text-secondary">Out</span>
          </div>
        </div>
      }
    >
      {hasCashFlow ? (
        <ChartFrame className="h-[169px] min-h-[169px] min-w-0 overflow-hidden" tone="green">
          {({ width, height }) => (
            <LineChart
              data={chartRows}
              height={height}
              margin={{ top: 5, right: 4, left: -9, bottom: 0 }}
              width={width}
            >
              <CartesianGrid
                strokeDasharray="2 6"
                stroke="var(--dashboard-chart-grid)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--dashboard-chart-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={1}
                minTickGap={16}
              />
              <YAxis
                domain={[0, Math.ceil(maxValue / 250) * 250]}
                tick={{ fill: "var(--dashboard-chart-muted)", fontSize: 11 }}
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
                stroke="var(--dashboard-chart-income)"
                strokeLinecap="round"
                strokeWidth={2.4}
                {...chartMotion}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                dot={false}
                isAnimationActive
                stroke="var(--dashboard-chart-expense)"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeWidth={2.4}
                {...chartMotion}
                animationBegin={140}
              />
            </LineChart>
          )}
        </ChartFrame>
      ) : (
        <div className="dashboard-chart-empty h-[169px] min-h-[169px]">
          <div>
            <span className="dashboard-chart-empty-icon">
              <DollarSign size={16} />
            </span>
            <p className="text-xs font-semibold text-text-primary">No cash flow yet</p>
            <p className="mt-1 text-[11px] text-text-secondary">Income and expenses will appear here.</p>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
