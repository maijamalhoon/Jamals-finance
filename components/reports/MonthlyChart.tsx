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
      <h3 className="mb-3 text-sm font-semibold text-text-primary sm:mb-5">
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

      <div
        data-report-chart-viewport
        className="h-[176px] min-h-[176px] max-h-[176px] w-full min-w-0 overflow-hidden sm:h-[208px] sm:min-h-[208px] sm:max-h-[208px] xl:h-[224px] xl:min-h-[224px] xl:max-h-[224px]"
        style={{ contain: "layout size" }}
      >
        <ChartFrame className="h-full min-h-0 max-h-full min-w-0 overflow-hidden">
          {({ width, height }) => {
            const isMobile = width < 520;
            const isTablet = width < 900;
            const maxBarSize = isMobile ? 22 : isTablet ? 26 : 30;

            return (
              <BarChart
                width={width}
                height={height}
                data={data}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                barGap={isMobile ? 6 : 10}
                barCategoryGap={isMobile ? "28%" : "38%"}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="var(--chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    formatCurrency(Number(value), { compact: true })
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--hover)", opacity: 0.25 }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="var(--success)"
                  fillOpacity={0.88}
                  radius={[999, 999, 999, 999]}
                  minPointSize={7}
                  maxBarSize={maxBarSize}
                  isAnimationActive
                  {...chartMotion}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="var(--danger)"
                  fillOpacity={0.88}
                  radius={[999, 999, 999, 999]}
                  minPointSize={7}
                  maxBarSize={maxBarSize}
                  isAnimationActive
                  {...chartMotion}
                  animationBegin={140}
                />
              </BarChart>
            );
          }}
        </ChartFrame>
      </div>
    </div>
  );
}
