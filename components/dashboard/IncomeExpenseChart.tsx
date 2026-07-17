"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign } from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { chartMotion } from "@/components/motion/animation-config";
import ChartFrame from "@/components/ui/chart-frame";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

interface ChartData {
  dateKey?: string;
  date: string;
  day?: number;
  income: number;
  expenses: number;
}

type ChartTooltipPayload = Array<{
  value?: number;
  dataKey?: "income" | "expenses";
}>;

type RangeKey = "7d" | "30d";

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
    <div className="min-w-[178px] rounded-[14px] border border-border bg-card p-3 text-xs shadow-[var(--shadow-soft)]">
      <p className="mb-2 font-semibold text-text-primary">{label}</p>
      <div className="space-y-1.5">
        <p className="flex items-center justify-between gap-5 font-medium text-income">
          <span>Income</span>
          <span className="font-bold tabular-nums">{formatCurrency(income)}</span>
        </p>
        <p className="flex items-center justify-between gap-5 font-medium text-expense">
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

export default function IncomeExpenseChart({
  data,
  status,
}: {
  data: ChartData[];
  status: DashboardAvailability;
}) {
  const { formatCurrency } = useCurrency();
  const [range, setRange] = useState<RangeKey>("30d");

  const chartRows = useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        income: Number.isFinite(Number(point.income)) ? Number(point.income) : 0,
        expenses:
          Number.isFinite(Number(point.expenses)) ? Number(point.expenses) : 0,
        day: point.day ?? index + 1,
      })),
    [data],
  );

  const visibleRows = useMemo(
    () => (range === "7d" ? chartRows.slice(-7) : chartRows),
    [chartRows, range],
  );
  const hasCashFlow = visibleRows.some(
    (point) => point.income > 0 || point.expenses > 0,
  );
  const maxValue = useMemo(
    () =>
      Math.max(
        1000,
        ...visibleRows.flatMap((point) => [point.income, point.expenses]),
      ),
    [visibleRows],
  );
  const totalIncome = visibleRows.reduce((sum, point) => sum + point.income, 0);
  const totalExpenses = visibleRows.reduce(
    (sum, point) => sum + point.expenses,
    0,
  );
  const net = totalIncome - totalExpenses;
  const netTone =
    net > 0 ? "text-income" : net < 0 ? "text-expense" : "text-text-secondary";

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="dashboard-list-card-kicker-icon">
            <DollarSign />
          </span>
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Income vs Expenses
          </h3>
        </div>

        <div
          aria-label="Cash-flow range"
          className="flex shrink-0 items-center rounded-[10px] bg-surface-secondary p-1"
          role="group"
        >
          {([
            ["7d", "7D"],
            ["30d", "30D"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={range === value}
              onClick={() => setRange(value)}
              className={`finance-focus min-h-8 rounded-[8px] px-2.5 text-[10px] font-bold transition-colors ${
                range === value
                  ? "bg-surface-primary text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-[11px] sm:text-xs">
        <span className="inline-flex min-w-0 items-center gap-2 text-text-secondary">
          <span className="size-2 shrink-0 rounded-full bg-income" />
          <span className="font-medium">Income:</span>
          <span className="font-bold tabular-nums text-text-primary">
            {formatCurrency(totalIncome)}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2 text-text-secondary">
          <span className="size-2 shrink-0 rounded-full bg-expense" />
          <span className="font-medium">Expenses:</span>
          <span className="font-bold tabular-nums text-text-primary">
            {formatCurrency(totalExpenses)}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2 text-text-secondary">
          <span className="size-2 shrink-0 rounded-full bg-transfer" />
          <span className="font-medium">Net:</span>
          <span className={`font-bold tabular-nums ${netTone}`}>
            {formatCurrency(net)}
          </span>
        </span>
      </div>

      <p className="sr-only">
        {status === "available"
          ? `${visibleRows.length} displayed days. Total income ${totalIncome}; total expenses ${totalExpenses}; net ${net}.`
          : "Cash-flow data is temporarily unavailable."}
      </p>

      <div className="mt-2 min-h-0 flex-1">
        {status === "unavailable" ? (
          <div className="dashboard-chart-empty h-[205px] min-h-[205px]">
            <div>
              <span className="dashboard-chart-empty-icon">
                <DollarSign size={16} />
              </span>
              <p className="text-xs font-semibold text-text-primary">
                Cash flow unavailable
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                Refresh when your connection is stable.
              </p>
            </div>
          </div>
        ) : hasCashFlow ? (
          <ChartFrame
            className="h-[205px] min-h-[205px] min-w-0 overflow-hidden sm:h-[220px] sm:min-h-[220px]"
            tone="green"
          >
            {({ width, height }) => (
              <ComposedChart
                accessibilityLayer
                data={visibleRows}
                height={height}
                margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                width={width}
              >
                <defs>
                  <linearGradient id="dailyIncomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--dashboard-chart-income)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--dashboard-chart-income)"
                      stopOpacity={0.015}
                    />
                  </linearGradient>
                  <linearGradient id="dailyExpenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--dashboard-chart-expense)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--dashboard-chart-expense)"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 8"
                  stroke="var(--dashboard-chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--dashboard-chart-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tickFormatter={(value) => `${value}`}
                />
                <YAxis
                  domain={[0, Math.ceil(maxValue / 250) * 250]}
                  tick={{ fill: "var(--dashboard-chart-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickMargin={5}
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
                  strokeWidth={2.3}
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
                  strokeLinecap="round"
                  strokeWidth={2.25}
                  fill="url(#dailyExpenseFill)"
                  {...chartMotion}
                />
              </ComposedChart>
            )}
          </ChartFrame>
        ) : (
          <div className="dashboard-chart-empty h-[205px] min-h-[205px] sm:h-[220px] sm:min-h-[220px]">
            <div>
              <span className="dashboard-chart-empty-icon">
                <DollarSign size={16} />
              </span>
              <p className="text-xs font-semibold text-text-primary">
                No cash flow yet
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                Income and expenses will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
