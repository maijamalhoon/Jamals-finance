"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3 } from "@/components/icons/jalvoro/compat";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import ChartFrame from "@/components/ui/chart-frame";
import type {
  CashFlowPoint,
  CategoryBreakdownItem,
} from "@/lib/analytics/calculations";

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-[18px] bg-surface-secondary/36 px-5 text-center text-sm text-text-secondary">
      {message}
    </div>
  );
}

function CashFlowTable({ data }: { data: CashFlowPoint[] }) {
  const { formatCurrency } = useCurrency();
  return (
    <div className="sr-only">
      <table>
        <caption>Cash-flow chart data</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Income</th>
            <th>Expenses</th>
            <th>Cumulative net flow</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={`${point.start}-${point.end}`}>
              <th>{point.label}</th>
              <td>{formatCurrency(point.income)}</td>
              <td>{formatCurrency(point.expenses)}</td>
              <td>{formatCurrency(point.cumulativeNetFlow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--chart-tooltip)",
  border: "0",
  borderRadius: 14,
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-soft)",
  padding: "10px 12px",
};

export function CashFlowCharts({ data }: { data: CashFlowPoint[] }) {
  const { formatCurrency } = useCurrency();
  const hasActivity = data.some(
    (point) => point.income !== 0 || point.expenses !== 0,
  );

  return (
    <section className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5" aria-labelledby="cash-flow-title">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-active">
            <BarChart3 aria-hidden="true" className="size-3.5" />
            Cash flow
          </p>
          <h2 id="cash-flow-title" className="mt-1 text-base font-bold text-text-primary sm:text-lg">
            Income, spending and net movement
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[10px] font-semibold text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" /> Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-danger" /> Expenses
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-series-1)]" /> Net
          </span>
        </div>
      </div>

      {!hasActivity ? (
        <div className="mt-5">
          <EmptyChart message="No income or expense activity in this period." />
        </div>
      ) : (
        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-bold text-text-primary">Income vs expenses</p>
            <div
              role="img"
              aria-label="Bar chart comparing income and expenses by time bucket"
              className="h-44 min-w-0 overflow-hidden rounded-[18px] bg-surface-secondary/30 px-1 pt-2 sm:h-52 xl:h-56"
            >
              <ChartFrame>
                {({ width, height }) => {
                  const isMobile = width < 520;
                  const isTablet = width < 900;
                  const maxBarSize = isMobile ? 22 : isTablet ? 26 : 30;

                  return (
                    <BarChart
                      width={width}
                      height={height}
                      data={data}
                      margin={{ top: 10, right: 8, bottom: 4, left: 0 }}
                      barGap={isMobile ? 6 : 10}
                      barCategoryGap={isMobile ? "28%" : "38%"}
                    >
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        strokeDasharray="3 6"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[
                          (minimum: number) => Math.min(minimum, 0),
                          (maximum: number) => Math.max(maximum, 0),
                        ]}
                        tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={54}
                        tickFormatter={(value) =>
                          formatCurrency(Number(value), { compact: true })
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "var(--hover)", opacity: 0.35 }}
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [
                          formatCurrency(Number(value ?? 0)),
                          name === "income" ? "Income" : "Expenses",
                        ]}
                      />
                      <Bar
                        dataKey="income"
                        fill="var(--success)"
                        fillOpacity={0.88}
                        radius={[999, 999, 999, 999]}
                        minPointSize={7}
                        maxBarSize={maxBarSize}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="expenses"
                        fill="var(--danger)"
                        fillOpacity={0.88}
                        radius={[999, 999, 999, 999]}
                        minPointSize={7}
                        maxBarSize={maxBarSize}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  );
                }}
              </ChartFrame>
            </div>
          </div>

          <div className="min-w-0 xl:border-l xl:border-border/45 xl:pl-5">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-text-primary">
              <Activity aria-hidden="true" className="size-4 text-active" />
              Cumulative net
            </p>
            <div
              role="img"
              aria-label="Line chart of cumulative net cash flow by time bucket"
              className="h-44 min-w-0 overflow-hidden rounded-[18px] bg-surface-secondary/30 px-1 pt-2 sm:h-52 xl:h-56"
            >
              <ChartFrame>
                {({ width, height }) => (
                  <LineChart
                    width={width}
                    height={height}
                    data={data}
                    margin={{ top: 10, right: 12, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 6"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[
                        (minimum: number) => Math.min(minimum, 0),
                        (maximum: number) => Math.max(maximum, 0),
                      ]}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={54}
                      tickFormatter={(value) =>
                        formatCurrency(Number(value), { compact: true })
                      }
                    />
                    <ReferenceLine
                      y={0}
                      stroke="var(--text-secondary)"
                      strokeOpacity={0.55}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={tooltipStyle}
                      formatter={(value) => [
                        formatCurrency(Number(value ?? 0)),
                        "Net flow",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeNetFlow"
                      stroke="var(--chart-series-1)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                )}
              </ChartFrame>
            </div>
          </div>
        </div>
      )}

      <CashFlowTable data={data} />
    </section>
  );
}

export function SpendingDistributionChart({
  data,
}: {
  data: CategoryBreakdownItem[];
}) {
  const { formatCurrency } = useCurrency();
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0) {
    return <EmptyChart message="No expense categories in this period." />;
  }

  return (
    <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(15rem,1.1fr)]">
      <div className="relative min-w-0 [container-type:inline-size]">
        <div
          role="img"
          aria-label="Donut chart of spending distribution by category"
          className="h-60 min-w-0 overflow-hidden sm:h-64"
        >
          <ChartFrame>
            {({ width, height }) => (
              <PieChart width={width} height={height}>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="81%"
                  paddingAngle={2.5}
                  cornerRadius={8}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((item) => (
                    <Cell key={item.id} fill={item.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  contentStyle={tooltipStyle}
                  labelStyle={{ display: "none" }}
                  formatter={(value, _name, item) => {
                    const category = item.payload as
                      | CategoryBreakdownItem
                      | undefined;
                    return [
                      formatCurrency(Number(value ?? 0)),
                      category?.name ?? "Spending",
                    ];
                  }}
                />
              </PieChart>
            )}
          </ChartFrame>
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-[52%] max-w-24 min-w-0 text-center">
            <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
              Total spent
            </p>
            <p className="mt-1 max-w-full truncate whitespace-nowrap text-[clamp(0.7rem,4.8cqw,0.82rem)] font-extrabold tabular-nums text-text-primary">
              {formatCurrency(total, { compact: true })}
            </p>
          </div>
        </div>
      </div>

      <ul className="min-w-0 divide-y divide-border/45" aria-label="Spending distribution summary">
        {data.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
                {item.name}
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-text-primary">
                {formatCurrency(item.amount)}
              </span>
            </div>
            <div className="ml-5 mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.min(100, item.percentage))}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="w-10 text-right text-[10px] font-semibold tabular-nums text-text-tertiary">
                {item.percentage}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
