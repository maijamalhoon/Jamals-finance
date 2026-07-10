"use client";

import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { DollarSign } from "lucide-react";
import { chartMotion } from "@/components/motion/animation-config";
import { useCurrency } from "@/components/currency/CurrencyProvider";
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
  const { formatCurrency } = useCurrency();

  if (!active || !payload?.length) return null;
  const income = payload.find((item) => item.dataKey === "income")?.value ?? 0;
  const expenses =
    payload.find((item) => item.dataKey === "expenses")?.value ?? 0;
  const net = income - expenses;

  return (
    <div className="min-w-[178px] rounded-[16px] border border-border bg-card/95 p-3 text-xs shadow-[var(--shadow-soft)] backdrop-blur-md">
      <p className="mb-2 font-semibold text-text-primary">{label}</p>
      <div className="space-y-1.5">
        <p className="flex items-center justify-between gap-5 font-medium text-success">
          <span>Income</span>
          <span className="font-bold tabular-nums">{formatCurrency(income)}</span>
        </p>
        <p className="flex items-center justify-between gap-5 font-medium text-danger">
          <span>Expenses</span>
          <span className="font-bold tabular-nums">{formatCurrency(expenses)}</span>
        </p>
        <p className="flex items-center justify-between gap-5 border-t border-border/70 pt-1.5 font-medium text-text-primary">
          <span>Net</span>
          <span className="font-bold tabular-nums">{formatCurrency(net)}</span>
        </p>
      </div>
    </div>
  );
}

export default function IncomeExpenseChart({ data }: { data: ChartData[] }) {
  const { formatCurrency } = useCurrency();
  const chartRows = useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        income: Number.isFinite(Number(point.income)) ? Number(point.income) : 0,
        expenses:
          Number.isFinite(Number(point.expenses)) ? Number(point.expenses) : 0,
        day: index + 1,
      })),
    [data],
  );
  const hasCashFlow = chartRows.some(
    (point) => point.income > 0 || point.expenses > 0,
  );
  const maxValue = useMemo(
    () =>
      Math.max(
        1000,
        ...chartRows.flatMap((point) => [point.income, point.expenses]),
      ),
    [chartRows],
  );

  return (
    <ChartCard
      eyebrow="Income vs Expenses"
      eyebrowIcon={<DollarSign />}
      title="Daily Cash Flow"
      legendPlacement="header"
      legend={
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-px w-4 bg-[var(--dashboard-chart-income)]" />
            <span className="text-[9.5px] font-medium text-text-secondary">
              In
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-[var(--dashboard-chart-expense)]" />
            <span className="text-[9.5px] font-medium text-text-secondary">
              Out
            </span>
          </div>
        </div>
      }
    >
      {hasCashFlow ? (
        <ChartFrame
          className="h-[162px] min-h-[162px] min-w-0 overflow-hidden"
          tone="green"
        >
          {({ width, height }) => (
            <ComposedChart
              data={chartRows}
              height={height}
              margin={{ top: 10, right: 10, left: 16, bottom: 0 }}
              width={width}
            >
              <defs>
                <linearGradient id="dailyIncomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dashboard-chart-income)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--dashboard-chart-income)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dailyExpenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dashboard-chart-expense)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--dashboard-chart-expense)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 8"
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
                tickFormatter={(value) => {
                  const day = Number(value);
                  return day % 2 === 1 || day === chartRows.length ?
                      String(day)
                    : "";
                }}
              />
              <YAxis
                domain={[0, Math.ceil(maxValue / 250) * 250]}
                tick={{ fill: "var(--dashboard-chart-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickMargin={8}
                tickFormatter={(value) =>
                  formatCurrency(Number(value), { compact: true })
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                isAnimationActive
                stroke="var(--dashboard-chart-income)"
                strokeLinecap="round"
                strokeWidth={2.35}
                fill="url(#dailyIncomeFill)"
                {...chartMotion}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                isAnimationActive
                stroke="var(--dashboard-chart-expense)"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeWidth={2.25}
                fill="url(#dailyExpenseFill)"
                {...chartMotion}
              />
            </ComposedChart>
          )}
        </ChartFrame>
      ) : (
        <div className="dashboard-chart-empty h-[162px] min-h-[162px]">
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
