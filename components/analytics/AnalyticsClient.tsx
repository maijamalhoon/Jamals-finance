"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  CircleOff,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  buildCashFlowSeries,
  buildSpendingData,
  calculateKpis,
  getCurrentAndPreviousRange,
  summarizeInvestmentPortfolio,
  type AnalyticsInvestmentData,
  type AnalyticsPeriod,
  type AnalyticsTransactionData,
  type CashFlowPoint,
  type ChangeResult,
  type ChangeSentiment,
  type SpendingData,
} from "@/lib/analytics/calculations";

type AnalyticsDataStatus = "available" | "error";

interface AnalyticsClientProps {
  transactions: AnalyticsTransactionData[];
  investments: AnalyticsInvestmentData[];
  transactionsStatus: AnalyticsDataStatus;
  investmentsStatus: AnalyticsDataStatus;
  now: string;
}

const PERIODS: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "6M", value: "sixMonth" },
  { label: "Year", value: "year" },
];

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function useAnimatedNumber(
  value: number,
  animationKey: string,
  duration = 1100,
) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    setDisplayValue(0);

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = easeOutCubic(progress);

      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [value, animationKey, duration]);

  return displayValue;
}

function AnimatedValue({
  value,
  animationKey,
  prefix,
  suffix = "",
  decimals = 0,
  money = true,
}: {
  value: number;
  animationKey: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  money?: boolean;
}) {
  const animated = useAnimatedNumber(value, animationKey);
  const safeValue = Number.isFinite(animated) ? animated : 0;
  const { formatCurrency } = useCurrency();

  if (money) {
    return (
      <>
        {formatCurrency(safeValue, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
      </>
    );
  }

  return (
    <>
      {prefix}
      {safeValue.toLocaleString("en-PK", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

function getPeriodTitle(period: AnalyticsPeriod) {
  if (period === "week") return "Daily Comparison";
  if (period === "month") return "Weekly Comparison";
  if (period === "sixMonth") return "6-Month Comparison";
  return "Yearly Comparison";
}

function getCashFlowTitle(period: AnalyticsPeriod) {
  if (period === "week") return "7-Day Cumulative Flow";
  if (period === "month") return "Month-to-Date Cumulative Flow";
  if (period === "sixMonth") return "6-Month Cumulative Flow";
  return "Year-to-Date Cumulative Flow";
}

function ChangeBadge({
  change,
}: {
  change: ChangeResult;
}) {
  const colors: Record<ChangeSentiment, string> = {
    positive: "var(--success)",
    negative: "var(--danger)",
    neutral: "var(--text-secondary)",
    warning: "var(--warning)",
  };
  const color = colors[change.sentiment];

  return (
    <motion.span
      key={`${change.label}-${change.sentiment}`}
      initial={{ opacity: 0, scale: 0.65 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color}, transparent 68%)`,
        backgroundColor: `color-mix(in srgb, ${color}, transparent 90%)`,
      }}
    >
      {change.label}
    </motion.span>
  );
}

function KpiCard({
  title,
  value,
  suffix,
  change,
  icon,
  accent,
  animationKey,
}: {
  title: string;
  value: number | null;
  suffix?: string;
  change: ChangeResult;
  icon: ReactNode;
  accent: string;
  animationKey: string;
}) {
  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="summary-card finance-hover-lift relative min-h-[104px] min-w-0 overflow-hidden px-4 py-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1.35 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute right-3 top-2 h-20 w-20 rounded-full blur-2xl"
        style={{
          backgroundColor: `color-mix(in srgb, ${accent}, transparent 90%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <motion.div
          initial={{ rotate: -20, scale: 0.75 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid h-9 w-9 place-items-center rounded-2xl border"
          style={{
            color: accent,
            borderColor: `color-mix(in srgb, ${accent}, transparent 72%)`,
            backgroundColor: `color-mix(in srgb, ${accent}, transparent 90%)`,
          }}
        >
          {icon}
        </motion.div>

        <ChangeBadge change={change} />
      </div>

      <div className="relative mt-3">
        <p className="text-[11px] font-semibold text-text-secondary">{title}</p>
        <p
          className="mt-1 break-words text-xl font-extrabold tracking-tight [overflow-wrap:anywhere]"
          style={{ color: accent }}
        >
          {value === null ?
            <span aria-label="Not available">—</span>
          : suffix ?
            <AnimatedValue
              value={value}
              animationKey={animationKey}
              prefix=""
              suffix={suffix}
              decimals={0}
              money={false}
            />
          : <AnimatedValue value={value} animationKey={animationKey} />}
        </p>
      </div>
    </motion.div>
  );
}

function ChartShell({
  eyebrow,
  title,
  description,
  children,
  className = "",
  animationKey,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  animationKey: string;
}) {
  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, y: 20, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`finance-panel min-w-0 overflow-hidden p-4 sm:p-5 ${className}`}
    >
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-active">
          <BarChart3 size={12} />
          {eyebrow}
        </p>
        <h3 className="mt-1 text-sm font-bold text-text-primary">{title}</h3>
        {description ?
          <p className="mt-1 text-xs text-text-secondary">{description}</p>
        : null}
      </div>

      {children}
    </motion.div>
  );
}

function DataState({
  title,
  description,
  kind = "empty",
  href,
  linkLabel,
  className = "min-h-[200px]",
}: {
  title: string;
  description: string;
  kind?: "empty" | "error";
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  const Icon = kind === "error" ? AlertTriangle : CircleOff;

  return (
    <div
      className={`finance-panel-soft grid place-items-center px-5 py-8 text-center ${className}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <div className="max-w-md">
        <span
          className={`mx-auto grid h-10 w-10 place-items-center rounded-full border border-border bg-card ${
            kind === "error" ? "text-warning" : "text-text-secondary"
          }`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-bold text-text-primary">{title}</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          {description}
        </p>
        {href && linkLabel ?
          <Link
            href={href}
            className="finance-focus mt-4 inline-flex min-h-9 items-center rounded-full border border-border bg-card px-4 text-xs font-bold text-active hover:bg-hover"
          >
            {linkLabel}
          </Link>
        : null}
      </div>
    </div>
  );
}

function IncomeExpenseChart({
  data,
  period,
}: {
  data: CashFlowPoint[];
  period: AnalyticsPeriod;
}) {
  const { formatCurrency } = useCurrency();
  const chartKey = `income-expense-${period}-${data.map((item) => `${item.income}-${item.expenses}`).join("-")}`;
  const hasActivity = data.some(
    (item) => item.income > 0 || item.expenses > 0,
  );

  if (!hasActivity) {
    return (
      <ChartShell
        eyebrow="Income vs Expenses"
        title={getPeriodTitle(period)}
        className="min-h-[300px]"
        animationKey={`${chartKey}-empty`}
      >
        <DataState
          title="No transactions in this period"
          description="Record income or an expense, or choose another period to compare activity."
          className="min-h-[230px]"
        />
      </ChartShell>
    );
  }

  return (
    <ChartShell
      eyebrow="Income vs Expenses"
      title={getPeriodTitle(period)}
      className="min-h-[300px]"
      animationKey={chartKey}
    >
      <div className="h-[230px] min-w-0 overflow-hidden">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={1}
          minHeight={1}
          initialDimension={{ width: 280, height: 230 }}
        >
          <BarChart
            key={chartKey}
            data={data}
            barGap={10}
            barCategoryGap="30%"
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 6"
              vertical={false}
              opacity={0.75}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickFormatter={(value) =>
                formatCurrency(Number(value), { compact: true })
              }
            />
            <Tooltip
              cursor={{
                fill: "color-mix(in srgb, var(--hover), transparent 45%)",
              }}
              contentStyle={{
                borderRadius: 16,
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-soft)",
              }}
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "income" ? "Income" : "Expenses",
              ]}
            />
            <Bar
              dataKey="income"
              fill="var(--success)"
              radius={[7, 7, 2, 2]}
              maxBarSize={58}
              isAnimationActive
              animationBegin={150}
              animationDuration={1150}
            />
            <Bar
              dataKey="expenses"
              fill="var(--danger)"
              radius={[7, 7, 2, 2]}
              maxBarSize={58}
              isAnimationActive
              animationBegin={260}
              animationDuration={1150}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}

function CumulativeCashFlowChart({
  data,
  period,
}: {
  data: CashFlowPoint[];
  period: AnalyticsPeriod;
}) {
  const { formatCurrency } = useCurrency();
  const chartKey = `cumulative-cash-flow-${period}-${data.map((item) => item.cumulativeNetFlow).join("-")}`;
  const hasActivity = data.some(
    (item) => item.income > 0 || item.expenses > 0,
  );

  return (
    <ChartShell
      eyebrow="Cumulative Net Cash Flow"
      title={getCashFlowTitle(period)}
      description="Income minus expenses accumulated during the selected period."
      className="min-h-[270px]"
      animationKey={chartKey}
    >
      {!hasActivity ?
        <DataState
          title="No cash flow in this period"
          description="Record income or an expense, or choose another period to see cumulative cash flow."
          className="min-h-[200px]"
        />
      : <div
          className="h-[200px] min-w-0 overflow-hidden"
          role="img"
          aria-label="Cumulative net cash flow chart"
        >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={1}
          minHeight={1}
          initialDimension={{ width: 280, height: 200 }}
        >
          <AreaChart key={chartKey} data={data}>
            <defs>
              <linearGradient
                id={`cashFlowGradient-${period}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="var(--active)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--active)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 6"
              vertical={false}
              opacity={0.75}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickFormatter={(value) =>
                formatCurrency(Number(value), { compact: true })
              }
            />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-soft)",
              }}
              formatter={(value) => [
                formatCurrency(Number(value ?? 0)),
                "Cumulative Net Cash Flow",
              ]}
            />
            <Area
              type="monotone"
              dataKey="cumulativeNetFlow"
              stroke="var(--active)"
              strokeWidth={3}
              fill={`url(#cashFlowGradient-${period})`}
              isAnimationActive
              animationBegin={180}
              animationDuration={1250}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>}
    </ChartShell>
  );
}

function SpendingBreakdown({
  data,
  period,
}: {
  data: SpendingData[];
  period: AnalyticsPeriod;
}) {
  const { formatCurrency } = useCurrency();
  const chartData = data;

  const chartKey = `spending-${period}-${chartData.map((item) => `${item.name}-${item.amount}`).join("-")}`;

  if (chartData.length === 0) {
    return (
      <ChartShell
        eyebrow="Spending Breakdown"
        title="By Category"
        className="min-h-[270px]"
        animationKey={`${chartKey}-empty`}
      >
        <DataState
          title="No expenses in this period"
          description="Record an expense or choose another period to see category spending."
          className="min-h-[200px]"
        />
      </ChartShell>
    );
  }

  return (
    <ChartShell
      eyebrow="Spending Breakdown"
      title="By Category"
      className="min-h-[270px]"
      animationKey={chartKey}
    >
      <div className="grid min-h-[310px] min-w-0 grid-cols-1 items-center gap-3 sm:h-[200px] sm:min-h-0 sm:grid-cols-[0.95fr_1.25fr]">
        <div className="h-[170px] min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 170, height: 170 }}>
            <PieChart key={chartKey}>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                isAnimationActive
                animationBegin={180}
                animationDuration={1150}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  borderColor: "var(--border)",
                  background: "var(--card)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-soft)",
                }}
                formatter={(value) => [
                  formatCurrency(Number(value ?? 0)),
                  "Spent",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <motion.div
          key={`legend-${chartKey}`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.07,
              },
            },
          }}
          className="min-w-0 space-y-2"
        >
          {chartData.slice(0, 5).map((item) => (
            <motion.div
              key={item.id}
              variants={{
                hidden: { opacity: 0, x: 14 },
                visible: { opacity: 1, x: 0 },
              }}
              className="flex min-w-0 items-center justify-between gap-3 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate font-medium text-text-primary">
                  {item.name}
                </span>
              </div>
              <span className="shrink-0 break-words text-right font-bold text-text-primary [overflow-wrap:anywhere]">
                {formatCurrency(item.amount)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </ChartShell>
  );
}

function InvestmentPerformance({
  investments,
  period,
  status,
}: {
  investments: AnalyticsInvestmentData[];
  period: AnalyticsPeriod;
  status: AnalyticsDataStatus;
}) {
  const { formatCurrency } = useCurrency();
  const portfolio = summarizeInvestmentPortfolio(investments);
  const list = portfolio.displayedHoldings;

  if (status === "error") {
    return (
      <ChartShell
        eyebrow="Investment Performance"
        title="Portfolio Breakdown"
        className="min-h-[195px]"
        animationKey={`investment-${period}-error`}
      >
        <DataState
          kind="error"
          title="Investment data could not be loaded"
          description="Your holdings are unchanged. Please refresh the page to try again."
          className="min-h-[150px]"
        />
      </ChartShell>
    );
  }

  if (list.length === 0) {
    return (
      <ChartShell
        eyebrow="Investment Performance"
        title="Portfolio Breakdown"
        className="min-h-[195px]"
        animationKey={`investment-${period}-empty`}
      >
        <DataState
          title="No investments to analyze"
          description="Add an investment to see portfolio value and profit or loss."
          href="/dashboard/investments"
          linkLabel="View investments"
          className="min-h-[150px]"
        />
      </ChartShell>
    );
  }

  return (
    <ChartShell
      eyebrow="Investment Performance"
      title="Portfolio Breakdown"
      className="min-h-[195px]"
      animationKey={`investment-${period}`}
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span>
          Total value{" "}
          <strong className="text-text-primary">
            {formatCurrency(portfolio.totalValue)}
          </strong>
        </span>
        <span
          className={
            portfolio.totalPnl >= 0 ? "text-success" : "text-danger"
          }
        >
          {portfolio.totalPnl >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(portfolio.totalPnl))} total P/L
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((item, index) => {
          const isProfit = item.pnl >= 0;
          const accent = item.color;

          return (
            <motion.div
              key={`${period}-${item.id}`}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="finance-panel-soft relative min-w-0 overflow-hidden p-4"
              style={{
                borderColor: `color-mix(in srgb, ${accent}, transparent 72%)`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${accent}, transparent 92%), var(--surface-secondary))`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-text-primary">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-text-secondary">
                    {item.symbol ? `${item.symbol} · ${item.type}` : item.type}
                  </p>
                </div>

                <ChangeBadge
                  change={
                    item.pnlPct === null ?
                      {
                        kind: "status",
                        label: "No cost basis",
                        sentiment: "neutral",
                        value: null,
                      }
                    : item.pnlPct === 0 ?
                      {
                        kind: "status",
                        label: "No change",
                        sentiment: "neutral",
                        value: null,
                      }
                    : {
                        kind: "percentage",
                        label: `${item.pnlPct > 0 ? "+" : ""}${item.pnlPct}%`,
                        sentiment:
                          item.pnlPct > 0 ? "positive" : "negative",
                        value: item.pnlPct,
                      }
                  }
                />
              </div>

              <p
                className="mt-5 break-words text-lg font-black tracking-tight [overflow-wrap:anywhere]"
                style={{ color: accent }}
              >
                <AnimatedValue
                  value={item.value}
                  animationKey={`${period}-${item.id}-value`}
                />
              </p>

              <p
                className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${
                  isProfit ? "text-success" : "text-danger"
                }`}
              >
                {isProfit ?
                  <ArrowUpRight size={12} />
                : <ArrowDownRight size={12} />}
                {isProfit ? "+" : "-"}
                {formatCurrency(Math.abs(item.pnl), { compact: true })}
                {item.pnlPct === null ? " · No cost basis" : null}
              </p>
            </motion.div>
          );
        })}
      </div>
    </ChartShell>
  );
}

export default function AnalyticsClient({
  transactions,
  investments,
  transactionsStatus,
  investmentsStatus,
  now,
}: AnalyticsClientProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const periodRange = useMemo(
    () => getCurrentAndPreviousRange(period, now),
    [period, now],
  );
  const currentRange = periodRange.current;

  const chartData = useMemo(
    () => buildCashFlowSeries(transactions, period, now),
    [period, transactions, now],
  );

  const spendingData = useMemo(
    () => buildSpendingData(transactions, currentRange),
    [transactions, currentRange],
  );

  const kpis = useMemo(
    () => calculateKpis(transactions, period, now),
    [transactions, period, now],
  );

  return (
    <div className="min-h-full min-w-0 text-text-primary">
      <div className="space-y-4">
        <div className="page-heading finance-surface-glass overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
          >
            <h1 className="page-title">
              Analytics
            </h1>
            <p className="page-subtitle">
              Financial intelligence overview
            </p>
          </motion.div>

          <div className="grid w-full min-w-0 grid-cols-4 rounded-full border border-border bg-card p-1 shadow-theme sm:inline-flex sm:w-fit">
            {PERIODS.map((item) => {
              const active = item.value === period;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`finance-focus relative min-h-10 min-w-0 rounded-full px-2 py-2 text-[11px] font-bold transition-all sm:min-w-max sm:px-4 sm:text-xs ${
                    active ? "text-background" : (
                      "text-text-secondary hover:bg-hover hover:text-text-primary"
                    )
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="analytics-period-pill"
                      className="absolute inset-0 rounded-full bg-active shadow-theme"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {transactionsStatus === "error" ?
          <ChartShell
            eyebrow="Transaction Analytics"
            title="Data unavailable"
            className="min-h-[300px]"
            animationKey={`transactions-${period}-error`}
          >
            <DataState
              kind="error"
              title="Transaction data could not be loaded"
              description="Your records are unchanged. Please refresh the page to try again."
              className="min-h-[230px]"
            />
          </ChartShell>
        : <>
            <motion.div
              key={`kpi-grid-${period}`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                  },
                },
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              <KpiCard
                title="Total Income"
                value={kpis.totalIncome}
                change={kpis.incomeChange}
                accent="var(--success)"
                icon={<TrendingUp size={17} />}
                animationKey={`${period}-income-${kpis.totalIncome}`}
              />
              <KpiCard
                title="Total Expenses"
                value={kpis.totalExpenses}
                change={kpis.expensesChange}
                accent="var(--danger)"
                icon={<TrendingDown size={17} />}
                animationKey={`${period}-expenses-${kpis.totalExpenses}`}
              />
              <KpiCard
                title="Net Savings"
                value={kpis.netSavings}
                change={kpis.netSavingsChange}
                accent="var(--success)"
                icon={<PiggyBank size={17} />}
                animationKey={`${period}-savings-${kpis.netSavings}`}
              />
              <KpiCard
                title="Savings Rate"
                value={kpis.savingsRate}
                suffix="%"
                change={kpis.savingsRateChange}
                accent="var(--warning)"
                icon={<CircleDollarSign size={17} />}
                animationKey={`${period}-rate-${kpis.savingsRate ?? "na"}`}
              />
            </motion.div>

            <IncomeExpenseChart data={chartData} period={period} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <CumulativeCashFlowChart data={chartData} period={period} />
              <SpendingBreakdown data={spendingData} period={period} />
            </div>
          </>}

        <InvestmentPerformance
          investments={investments}
          period={period}
          status={investmentsStatus}
        />

        <p className="flex items-center gap-2 px-1 pb-2 text-[11px] text-text-tertiary">
          <Sparkles size={13} />
          Analytics uses only your existing transactions, categories, and
          investment records.
        </p>
      </div>
    </div>
  );
}
