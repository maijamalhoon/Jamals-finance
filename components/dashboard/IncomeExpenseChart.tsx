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

const INCOME_CHART_COLOR =
  "color-mix(in srgb, var(--income) 84%, var(--primary) 16%)";
const EXPENSE_CHART_COLOR =
  "color-mix(in srgb, var(--expense) 86%, var(--primary) 14%)";

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
    <div className="min-w-[164px] rounded-[14px] border border-border bg-card p-3 text-xs shadow-[var(--shadow-soft)]">
      <p className="mb-2 font-semibold text-text-primary">{label}</p>
      <div className="space-y-1.5">
        <p
          className="flex items-center justify-between gap-5 font-medium"
          style={{ color: INCOME_CHART_COLOR }}
        >
          <span>Income</span>
          <span className="font-bold tabular-nums">{formatCurrency(income)}</span>
        </p>
        <p
          className="flex items-center justify-between gap-5 font-medium"
          style={{ color: EXPENSE_CHART_COLOR }}
        >
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
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[286px] min-w-0 flex-col overflow-hidden p-3.5 sm:min-h-[300px] sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-2.5 sm:items-start sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="dashboard-list-card-kicker-icon">
            <DollarSign />
          </span>
          <h3 className="truncate text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-text-secondary sm:text-[11px] sm:tracking-[0.12em]">
            Income vs Expenses
          </h3>
        </div>

        <div
          aria-label="Cash-flow range"
          className="flex shrink-0 items-center rounded-[9px] bg-surface-secondary p-0.5 sm:rounded-[10px] sm:p-1"
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
              className={`finance-focus min-h-7 rounded-[7px] px-2 text-[9px] font-bold transition-colors sm:min-h-8 sm:rounded-[8px] sm:px-2.5 sm:text-[10px] ${
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

      <div className="mt-3 grid min-w-0 grid-cols-3 gap-1.5 rounded-[12px] border border-border/70 bg-surface-secondary/55 p-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-xs">
        <span className="flex min-w-0 flex-col rounded-[9px] bg-surface-primary/70 px-2 py-2 sm:inline-flex sm:flex-row sm:items-center sm:gap-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-text-secondary sm:gap-2 sm:text-xs sm:font-medium sm:normal-case sm:tracking-normal">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: INCOME_CHART_COLOR }}
            />
            <span>Income</span>
          </span>
          <span className="mt-1 whitespace-nowrap text-[clamp(9px,3vw,12px)] font-bold leading-tight tabular-nums text-text-primary sm:mt-0 sm:text-xs">
            {formatCurrency(totalIncome)}
          </span>
        </span>
        <span className="flex min-w-0 flex-col rounded-[9px] bg-surface-primary/70 px-2 py-2 sm:inline-flex sm:flex-row sm:items-center sm:gap-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-text-secondary sm:gap-2 sm:text-xs sm:font-medium sm:normal-case sm:tracking-normal">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: EXPENSE_CHART_COLOR }}
            />
            <span>Expenses</span>
          </span>
          <span className="mt-1 whitespace-nowrap text-[clamp(9px,3vw,12px)] font-bold leading-tight tabular-nums text-text-primary sm:mt-0 sm:text-xs">
            {formatCurrency(totalExpenses)}
          </span>
        </span>
        <span className="flex min-w-0 flex-col rounded-[9px] bg-surface-primary/70 px-2 py-2 sm:inline-flex sm:flex-row sm:items-center sm:gap-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-text-secondary sm:gap-2 sm:text-xs sm:font-medium sm:normal-case sm:tracking-normal">
            <span className="size-2 shrink-0 rounded-full bg-transfer" />
            <span>Net</span>
          </span>
          <span
            className={`mt-1 whitespace-nowrap text-[clamp(9px,3vw,12px)] font-bold leading-tight tabular-nums sm:mt-0 sm:text-xs ${netTone}`}
          >
            {formatCurrency(net)}
          </span>
        </span>
      </div>

      <p className="sr-only">
        {status === "available"
          ? `${visibleRows.length} displayed days. Total income ${totalIncome}; total expenses ${totalExpenses}; net ${net}.`
          : "Cash-flow data is temporarily unavailable."}
      </p>

      <div className="mt-3 min-h-0 flex-1 sm:mt-2">
        {status === "unavailable" ? (
          <div className="dashboard-chart-empty h-[190px] min-h-[190px] sm:h-[220px] sm:min-h-[220px]">
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
            className="h-[190px] min-h-[190px] min-w-0 overflow-hidden sm:h-[220px] sm:min-h-[220px]"
            tone="green"
          >
            {({ width, height }) => {
              const compactChart = width < 390;
              const narrowChart = width < 320;

              return (
                <ComposedChart
                  key={`cash-flow-${range}`}
                  accessibilityLayer
                  data={visibleRows}
                  height={height}
                  margin={{
                    top: compactChart ? 6 : 10,
                    right: compactChart ? 0 : 8,
                    left: 0,
                    bottom: 0,
                  }}
                  width={width}
                >
                  <defs>
                    <linearGradient
                      id="incomeExpenseIncomeFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={INCOME_CHART_COLOR}
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor={INCOME_CHART_COLOR}
                        stopOpacity={0.015}
                      />
                    </linearGradient>
                    <linearGradient
                      id="incomeExpenseExpenseFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={EXPENSE_CHART_COLOR}
                        stopOpacity={0.14}
                      />
                      <stop
                        offset="100%"
                        stopColor={EXPENSE_CHART_COLOR}
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray={compactChart ? "2 7" : "2 8"}
                    stroke="var(--chart-grid)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fill: "var(--text-secondary)",
                      fontSize: compactChart ? 9 : 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={compactChart ? 18 : 24}
                    tickMargin={compactChart ? 5 : 6}
                    tickFormatter={(value) => `${value}`}
                  />
                  <YAxis
                    domain={[0, Math.ceil(maxValue / 250) * 250]}
                    tick={{
                      fill: "var(--text-secondary)",
                      fontSize: compactChart ? 9 : 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={compactChart ? 5 : undefined}
                    width={narrowChart ? 38 : compactChart ? 42 : 50}
                    tickMargin={compactChart ? 3 : 5}
                    tickFormatter={(value) =>
                      formatCurrency(Number(value), { compact: true })
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    dot={false}
                    activeDot={{
                      r: compactChart ? 3.5 : 4,
                      strokeWidth: 2,
                      stroke: "var(--card)",
                    }}
                    isAnimationActive
                    stroke={INCOME_CHART_COLOR}
                    strokeLinecap="round"
                    strokeWidth={compactChart ? 2.2 : 2.5}
                    fill="url(#incomeExpenseIncomeFill)"
                    fillOpacity={compactChart ? 0.48 : 1}
                    {...chartMotion}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    dot={false}
                    activeDot={{
                      r: compactChart ? 3.5 : 4,
                      strokeWidth: 2,
                      stroke: "var(--card)",
                    }}
                    isAnimationActive
                    stroke={EXPENSE_CHART_COLOR}
                    strokeDasharray={compactChart ? "3 4" : "4 4"}
                    strokeLinecap="round"
                    strokeWidth={compactChart ? 2.1 : 2.4}
                    fill="url(#incomeExpenseExpenseFill)"
                    fillOpacity={compactChart ? 0 : 1}
                    {...chartMotion}
                  />
                </ComposedChart>
              );
            }}
          </ChartFrame>
        ) : (
          <div className="dashboard-chart-empty h-[190px] min-h-[190px] sm:h-[220px] sm:min-h-[220px]">
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
