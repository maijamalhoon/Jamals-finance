"use client";

import { useEffect, useId, useMemo, useState } from "react";
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

const AMBIENT_SWEEP_DURATION = "9s";
const INCOME_CHART_COLOR =
  "color-mix(in srgb, var(--income) 88%, var(--primary) 12%)";
const INCOME_CHART_LIGHT =
  "color-mix(in srgb, var(--income) 74%, white 26%)";
const INCOME_CHART_DEEP =
  "color-mix(in srgb, var(--income) 90%, black 10%)";
const EXPENSE_CHART_COLOR =
  "color-mix(in srgb, var(--expense) 88%, var(--primary) 12%)";
const EXPENSE_CHART_LIGHT =
  "color-mix(in srgb, var(--expense) 76%, white 24%)";
const EXPENSE_CHART_DEEP =
  "color-mix(in srgb, var(--expense) 91%, black 9%)";

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
  const [isAmbientMotionReady, setIsAmbientMotionReady] = useState(false);
  const gradientPrefix = useId().replace(/:/g, "");

  const chartRows = useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        income: Number.isFinite(Number(point.income)) ? Number(point.income) : 0,
        expenses: Number.isFinite(Number(point.expenses))
          ? Number(point.expenses)
          : 0,
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

  useEffect(() => {
    setIsAmbientMotionReady(false);

    if (
      status !== "available" ||
      !hasCashFlow ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let delayTimer = 0;

    const scheduleAmbientMotion = () => {
      const fontsReady = document.fonts?.ready ?? Promise.resolve();

      void fontsReady.then(() => {
        if (cancelled) return;

        firstFrame = window.requestAnimationFrame(() => {
          secondFrame = window.requestAnimationFrame(() => {
            delayTimer = window.setTimeout(() => {
              if (!cancelled) setIsAmbientMotionReady(true);
            }, chartMotion.animationDuration + 240);
          });
        });
      });
    };

    if (document.readyState === "complete") {
      scheduleAmbientMotion();
    } else {
      window.addEventListener("load", scheduleAmbientMotion, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleAmbientMotion);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(delayTimer);
    };
  }, [hasCashFlow, range, status, visibleRows]);

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
          className="flex shrink-0 items-center gap-0.5 rounded-[11px] bg-surface-secondary/85 p-1 ring-1 ring-inset ring-border/60 sm:rounded-[12px]"
          role="group"
        >
          {([
            ["7d", "7D"],
            ["30d", "30D"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-label={`Show ${label} cash flow`}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
              className={`finance-focus min-h-8 min-w-10 rounded-[8px] px-2.5 text-[10px] font-semibold tracking-[0.02em] transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] sm:min-h-9 sm:min-w-11 sm:rounded-[9px] sm:px-3 sm:text-[11px] ${
                range === value
                  ? "bg-surface-primary text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                  : "text-text-secondary hover:bg-surface-primary/55 hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only">
        {status === "available"
          ? `${visibleRows.length} displayed days. Total income ${totalIncome}; total expenses ${totalExpenses}; net ${net}.`
          : "Cash-flow data is temporarily unavailable."}
      </p>

      <div className="mt-4 min-h-0 flex-1 sm:mt-3">
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
              const incomeFillId = `${gradientPrefix}-income-fill`;
              const expenseFillId = `${gradientPrefix}-expense-fill`;
              const incomeLineId = `${gradientPrefix}-income-line`;
              const expenseLineId = `${gradientPrefix}-expense-line`;
              const incomeSheenId = `${gradientPrefix}-income-sheen`;
              const expenseSheenId = `${gradientPrefix}-expense-sheen`;
              const sheenStart = -Math.max(width * 0.42, 120);
              const sheenEnd = width * 1.08;
              const sheenWidth = Math.max(width * 0.26, 86);

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
                      id={incomeFillId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={INCOME_CHART_COLOR}
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="100%"
                        stopColor={INCOME_CHART_COLOR}
                        stopOpacity={0.015}
                      />
                    </linearGradient>
                    <linearGradient
                      id={expenseFillId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={EXPENSE_CHART_COLOR}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="100%"
                        stopColor={EXPENSE_CHART_COLOR}
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                    <linearGradient
                      id={incomeLineId}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2={width}
                      y2="0"
                    >
                      <stop offset="0%" stopColor={INCOME_CHART_DEEP} />
                      <stop offset="48%" stopColor={INCOME_CHART_LIGHT} />
                      <stop offset="100%" stopColor={INCOME_CHART_COLOR} />
                    </linearGradient>
                    <linearGradient
                      id={expenseLineId}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2={width}
                      y2="0"
                    >
                      <stop offset="0%" stopColor={EXPENSE_CHART_DEEP} />
                      <stop offset="50%" stopColor={EXPENSE_CHART_LIGHT} />
                      <stop offset="100%" stopColor={EXPENSE_CHART_COLOR} />
                    </linearGradient>
                    {isAmbientMotionReady ? (
                      <>
                        <linearGradient
                          id={incomeSheenId}
                          gradientUnits="userSpaceOnUse"
                          x1={sheenStart}
                          y1="0"
                          x2={sheenStart + sheenWidth}
                          y2="0"
                        >
                          <stop offset="0%" stopColor="white" stopOpacity="0" />
                          <stop offset="34%" stopColor="white" stopOpacity="0" />
                          <stop offset="52%" stopColor="white" stopOpacity="0.92" />
                          <stop
                            offset="68%"
                            stopColor={INCOME_CHART_LIGHT}
                            stopOpacity="0.34"
                          />
                          <stop offset="100%" stopColor="white" stopOpacity="0" />
                          <animate
                            attributeName="x1"
                            values={`${sheenStart};${sheenEnd};${sheenEnd}`}
                            keyTimes="0;0.68;1"
                            dur={AMBIENT_SWEEP_DURATION}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="x2"
                            values={`${sheenStart + sheenWidth};${sheenEnd + sheenWidth};${sheenEnd + sheenWidth}`}
                            keyTimes="0;0.68;1"
                            dur={AMBIENT_SWEEP_DURATION}
                            repeatCount="indefinite"
                          />
                        </linearGradient>
                        <linearGradient
                          id={expenseSheenId}
                          gradientUnits="userSpaceOnUse"
                          x1={sheenStart}
                          y1="0"
                          x2={sheenStart + sheenWidth}
                          y2="0"
                        >
                          <stop offset="0%" stopColor="white" stopOpacity="0" />
                          <stop offset="34%" stopColor="white" stopOpacity="0" />
                          <stop offset="52%" stopColor="white" stopOpacity="0.84" />
                          <stop
                            offset="68%"
                            stopColor={EXPENSE_CHART_LIGHT}
                            stopOpacity="0.3"
                          />
                          <stop offset="100%" stopColor="white" stopOpacity="0" />
                          <animate
                            attributeName="x1"
                            values={`${sheenStart};${sheenEnd};${sheenEnd}`}
                            keyTimes="0;0.68;1"
                            begin="0.3s"
                            dur={AMBIENT_SWEEP_DURATION}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="x2"
                            values={`${sheenStart + sheenWidth};${sheenEnd + sheenWidth};${sheenEnd + sheenWidth}`}
                            keyTimes="0;0.68;1"
                            begin="0.3s"
                            dur={AMBIENT_SWEEP_DURATION}
                            repeatCount="indefinite"
                          />
                        </linearGradient>
                      </>
                    ) : null}
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
                    stroke={`url(#${incomeLineId})`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={compactChart ? 2.3 : 2.65}
                    fill={`url(#${incomeFillId})`}
                    fillOpacity={compactChart ? 0.5 : 1}
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
                    stroke={`url(#${expenseLineId})`}
                    strokeDasharray={compactChart ? "3.5 4.5" : "4.5 4.5"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={compactChart ? 2.2 : 2.55}
                    fill={`url(#${expenseFillId})`}
                    fillOpacity={compactChart ? 0 : 1}
                    {...chartMotion}
                  />
                  {isAmbientMotionReady ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="income"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                        stroke={`url(#${incomeSheenId})`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={compactChart ? 3.4 : 4}
                        fill="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                        stroke={`url(#${expenseSheenId})`}
                        strokeDasharray={compactChart ? "3.5 4.5" : "4.5 4.5"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={compactChart ? 3.2 : 3.8}
                        fill="none"
                      />
                    </>
                  ) : null}
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
