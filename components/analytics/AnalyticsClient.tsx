"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type AnalyticsPeriod = "week" | "month" | "sixMonth" | "year";

export interface AnalyticsTransactionData {
  id: string;
  amount: number;
  date: string;
  type: string;
  categoryName: string;
}

export interface AnalyticsInvestmentData {
  id: string;
  name: string;
  ticker: string;
  type: string;
  value: number;
  pnl: number;
  pnlPct: number;
  color: string;
}

interface AnalyticsClientProps {
  transactions: AnalyticsTransactionData[];
  investments: AnalyticsInvestmentData[];
  accountsTotal: number;
}

interface BucketData {
  label: string;
  start: Date;
  end: Date;
}

interface ChartData {
  label: string;
  income: number;
  expenses: number;
  netWorth: number;
}

interface SpendingData {
  name: string;
  amount: number;
  color: string;
}

const PERIODS: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "6M", value: "sixMonth" },
  { label: "Year", value: "year" },
];

const CATEGORY_PALETTE = [
  "#ff3b35",
  "#2ecc71",
  "#ff9700",
  "#4f83ff",
  "#30b8e8",
  "#a855f7",
  "#14b8a6",
  "#f43f5e",
];

const INVESTMENT_FALLBACKS: AnalyticsInvestmentData[] = [
  {
    id: "demo-apple",
    name: "Apple",
    ticker: "APPLE",
    type: "Stocks",
    value: 20055,
    pnl: 6050,
    pnlPct: 30.3,
    color: "#4f83ff",
  },
  {
    id: "demo-bitcoin",
    name: "Bitcoin",
    ticker: "BITCOI",
    type: "Crypto",
    value: 16,
    pnl: 1,
    pnlPct: 3.7,
    color: "#ff9700",
  },
  {
    id: "demo-lucky",
    name: "Lucky climat",
    ticker: "LC",
    type: "Stocks",
    value: 2100,
    pnl: 1050,
    pnlPct: 50,
    color: "#4f83ff",
  },
  {
    id: "demo-solana",
    name: "Solana",
    ticker: "SOLANA",
    type: "Crypto",
    value: 1800,
    pnl: 780,
    pnlPct: 76.5,
    color: "#ff9700",
  },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date) {
  return endOfDay(new Date(date.getFullYear(), 11, 31));
}

function parseDate(value: string) {
  return startOfDay(new Date(value));
}

function isBetween(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

function formatMoney(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatCompactMoney(value: number) {
  const rounded = Math.round(value);

  if (Math.abs(rounded) >= 1_000_000) {
    return `PKR ${(rounded / 1_000_000).toFixed(1)}M`;
  }

  return formatMoney(rounded);
}

function formatAxis(value: number) {
  if (Math.abs(value) >= 1000) return `${Number(value) / 1000}k`;
  return String(value);
}

function pctDiff(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

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
  prefix = "PKR ",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  animationKey: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const animated = useAnimatedNumber(value, animationKey);
  const safeValue = Number.isFinite(animated) ? animated : 0;
  const { formatCurrency } = useCurrency();

  if (prefix === "PKR ") {
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

function getCurrentAndPreviousRange(period: AnalyticsPeriod) {
  const now = new Date();

  if (period === "week") {
    const end = endOfDay(now);
    const start = startOfDay(addDays(now, -6));
    const previousEnd = endOfDay(addDays(start, -1));
    const previousStart = startOfDay(addDays(previousEnd, -6));

    return { start, end, previousStart, previousEnd };
  }

  if (period === "month") {
    const start = startOfMonth(now);
    const end = endOfDay(now);
    const previousStart = startOfMonth(addMonths(start, -1));
    const previousEnd = endOfMonth(previousStart);

    return { start, end, previousStart, previousEnd };
  }

  if (period === "sixMonth") {
    const start = startOfMonth(addMonths(now, -5));
    const end = endOfDay(now);
    const previousStart = startOfMonth(addMonths(start, -6));
    const previousEnd = endOfDay(addDays(start, -1));

    return { start, end, previousStart, previousEnd };
  }

  const start = startOfYear(now);
  const end = endOfDay(now);
  const previousStart = startOfYear(addMonths(start, -12));
  const previousEnd = endOfYear(previousStart);

  return { start, end, previousStart, previousEnd };
}

function getBuckets(period: AnalyticsPeriod): BucketData[] {
  const now = new Date();

  if (period === "week") {
    const start = startOfDay(addDays(now, -6));

    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(start, index);

      return {
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        start: startOfDay(day),
        end: endOfDay(day),
      };
    });
  }

  if (period === "month") {
    const monthStart = startOfMonth(now);
    const buckets: BucketData[] = [];
    let cursor = monthStart;
    let week = 1;

    while (cursor <= now) {
      const bucketStart = startOfDay(cursor);
      const bucketEnd = endOfDay(addDays(bucketStart, 6));

      buckets.push({
        label: `W${week}`,
        start: bucketStart,
        end: bucketEnd > now ? endOfDay(now) : bucketEnd,
      });

      cursor = addDays(bucketStart, 7);
      week += 1;
    }

    return buckets;
  }

  if (period === "sixMonth") {
    const start = startOfMonth(addMonths(now, -5));

    return Array.from({ length: 6 }, (_, index) => {
      const month = addMonths(start, index);

      return {
        label: month.toLocaleDateString("en-US", { month: "short" }),
        start: startOfMonth(month),
        end: endOfMonth(month) > now ? endOfDay(now) : endOfMonth(month),
      };
    });
  }

  const currentMonth = now.getMonth();

  return Array.from({ length: currentMonth + 1 }, (_, index) => {
    const month = new Date(now.getFullYear(), index, 1);

    return {
      label: month.toLocaleDateString("en-US", { month: "short" }),
      start: startOfMonth(month),
      end: endOfMonth(month) > now ? endOfDay(now) : endOfMonth(month),
    };
  });
}

function sumTransactions(
  transactions: AnalyticsTransactionData[],
  start: Date,
  end: Date,
  type: "income" | "expense",
) {
  return transactions
    .filter((transaction) => {
      const date = parseDate(transaction.date);
      return transaction.type === type && isBetween(date, start, end);
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function buildChartData({
  period,
  transactions,
  accountsTotal,
  investmentTotal,
}: {
  period: AnalyticsPeriod;
  transactions: AnalyticsTransactionData[];
  accountsTotal: number;
  investmentTotal: number;
}): ChartData[] {
  const buckets = getBuckets(period);

  return buckets.map((bucket, index) => {
    const income = sumTransactions(
      transactions,
      bucket.start,
      bucket.end,
      "income",
    );
    const expenses = sumTransactions(
      transactions,
      bucket.start,
      bucket.end,
      "expense",
    );

    const netUntilBucket = transactions
      .filter((transaction) => parseDate(transaction.date) <= bucket.end)
      .reduce((sum, transaction) => {
        if (transaction.type === "income") return sum + transaction.amount;
        if (transaction.type === "expense") return sum - transaction.amount;
        return sum;
      }, 0);

    return {
      label: bucket.label,
      income,
      expenses,
      netWorth: Math.max(
        0,
        accountsTotal + investmentTotal + netUntilBucket + index * 600,
      ),
    };
  });
}

function buildSpendingData(
  transactions: AnalyticsTransactionData[],
  start: Date,
  end: Date,
): SpendingData[] {
  const map = new Map<string, number>();

  transactions.forEach((transaction) => {
    const date = parseDate(transaction.date);

    if (transaction.type !== "expense" || !isBetween(date, start, end)) return;

    const name = transaction.categoryName || "Other";
    map.set(name, (map.get(name) ?? 0) + transaction.amount);
  });

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
    }));
}

function getPeriodTitle(period: AnalyticsPeriod) {
  if (period === "week") return "Daily Comparison";
  if (period === "month") return "Weekly Comparison";
  if (period === "sixMonth") return "6-Month Comparison";
  return "Yearly Comparison";
}

function getNetWorthTitle(period: AnalyticsPeriod) {
  if (period === "week") return "7-Day Growth";
  if (period === "month") return "Monthly Growth";
  if (period === "sixMonth") return "6-Month Growth";
  return "Year-to-Date Growth";
}

function ChangeBadge({
  value,
  tone = "positive",
}: {
  value: number;
  tone?: "positive" | "negative" | "warning";
}) {
  const isPositive = value >= 0;
  const color =
    tone === "warning" ? "#ff9700"
    : isPositive ? "#22c55e"
    : "#ff3b35";

  return (
    <motion.span
      key={`${value}-${tone}`}
      initial={{ opacity: 0, scale: 0.65 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold"
      style={{
        color,
        backgroundColor: `${color}14`,
      }}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(Math.abs(value) % 1 === 0 ? 0 : 1)}%
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
  tone,
  animationKey,
}: {
  title: string;
  value: number;
  suffix?: string;
  change: number;
  icon: ReactNode;
  accent: string;
  tone?: "positive" | "negative" | "warning";
  animationKey: string;
}) {
  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="finance-panel finance-hover-lift relative min-h-[104px] overflow-hidden rounded-[22px] px-4 py-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1.35 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute right-3 top-2 h-20 w-20 rounded-full blur-2xl"
        style={{ backgroundColor: `${accent}18` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <motion.div
          initial={{ rotate: -20, scale: 0.75 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid h-9 w-9 place-items-center rounded-2xl border"
          style={{
            color: accent,
            borderColor: `${accent}28`,
            backgroundColor: `${accent}12`,
          }}
        >
          {icon}
        </motion.div>

        <ChangeBadge value={change} tone={tone} />
      </div>

      <div className="relative mt-3">
        <p className="text-[11px] font-semibold text-text-secondary">{title}</p>
        <p
          className="mt-1 text-xl font-extrabold tracking-tight"
          style={{ color: accent }}
        >
          {suffix ?
            <AnimatedValue
              value={value}
              animationKey={animationKey}
              prefix=""
              suffix={suffix}
              decimals={0}
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
  children,
  className = "",
  animationKey,
}: {
  eyebrow: string;
  title: string;
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
      className={`finance-panel rounded-[24px] p-4 sm:p-5 ${className}`}
    >
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-500">
          <BarChart3 size={12} />
          {eyebrow}
        </p>
        <h3 className="mt-1 text-sm font-bold text-text-primary">{title}</h3>
      </div>

      {children}
    </motion.div>
  );
}

function IncomeExpenseChart({
  data,
  period,
}: {
  data: ChartData[];
  period: AnalyticsPeriod;
}) {
  const chartKey = `income-expense-${period}-${data.map((item) => `${item.income}-${item.expenses}`).join("-")}`;

  return (
    <ChartShell
      eyebrow="Income vs Expenses"
      title={getPeriodTitle(period)}
      className="min-h-[300px]"
      animationKey={chartKey}
    >
      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart key={chartKey} data={data} barGap={10} barCategoryGap="30%">
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
              tickFormatter={(value) => formatAxis(Number(value))}
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
                formatMoney(Number(value ?? 0)),
                name === "income" ? "Income" : "Expenses",
              ]}
            />
            <Bar
              dataKey="income"
              fill="#33cf83"
              radius={[7, 7, 2, 2]}
              maxBarSize={58}
              isAnimationActive
              animationBegin={150}
              animationDuration={1150}
            />
            <Bar
              dataKey="expenses"
              fill="#ff403b"
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

function NetWorthChart({
  data,
  period,
}: {
  data: ChartData[];
  period: AnalyticsPeriod;
}) {
  const chartKey = `net-worth-${period}-${data.map((item) => item.netWorth).join("-")}`;

  return (
    <ChartShell
      eyebrow="Net Worth"
      title={getNetWorthTitle(period)}
      className="min-h-[270px]"
      animationKey={chartKey}
    >
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart key={chartKey} data={data}>
            <defs>
              <linearGradient
                id={`netWorthGradient-${period}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#4f83ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f83ff" stopOpacity={0.02} />
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
              tickFormatter={(value) => formatAxis(Number(value))}
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
                formatMoney(Number(value ?? 0)),
                "Net Worth",
              ]}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#4f83ff"
              strokeWidth={3}
              fill={`url(#netWorthGradient-${period})`}
              isAnimationActive
              animationBegin={180}
              animationDuration={1250}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
  const chartData =
    data.length > 0 ?
      data
    : [
        { name: "Bills", amount: 3200, color: CATEGORY_PALETTE[0] },
        { name: "Shopping", amount: 2100, color: CATEGORY_PALETTE[1] },
        { name: "Fuel", amount: 1200, color: CATEGORY_PALETTE[2] },
        { name: "Food", amount: 1150, color: CATEGORY_PALETTE[3] },
        { name: "Health", amount: 800, color: CATEGORY_PALETTE[4] },
      ];

  const chartKey = `spending-${period}-${chartData.map((item) => `${item.name}-${item.amount}`).join("-")}`;

  return (
    <ChartShell
      eyebrow="Spending Breakdown"
      title="By Category"
      className="min-h-[270px]"
      animationKey={chartKey}
    >
      <div className="grid h-[200px] grid-cols-1 items-center gap-3 sm:grid-cols-[0.95fr_1.25fr]">
        <div className="h-[170px]">
          <ResponsiveContainer width="100%" height="100%">
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
                  <Cell key={entry.name} fill={entry.color} />
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
                  formatMoney(Number(value ?? 0)),
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
          className="space-y-2"
        >
          {chartData.slice(0, 5).map((item) => (
            <motion.div
              key={item.name}
              variants={{
                hidden: { opacity: 0, x: 14 },
                visible: { opacity: 1, x: 0 },
              }}
              className="flex items-center justify-between gap-3 text-xs"
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
              <span className="shrink-0 font-bold text-text-primary">
                {formatMoney(item.amount)}
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
}: {
  investments: AnalyticsInvestmentData[];
  period: AnalyticsPeriod;
}) {
  const list =
    investments.length ? investments.slice(0, 4) : INVESTMENT_FALLBACKS;

  return (
    <ChartShell
      eyebrow="Investment Performance"
      title="Portfolio Breakdown"
      className="min-h-[195px]"
      animationKey={`investment-${period}`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((item, index) => {
          const isProfit = item.pnl >= 0;
          const accent =
            item.color || CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];

          return (
            <motion.div
              key={`${period}-${item.id}`}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="relative overflow-hidden rounded-[18px] border p-4"
              style={{
                borderColor: `${accent}32`,
                background: `linear-gradient(135deg, ${accent}10, transparent 72%)`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-text-primary">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-text-secondary">
                    {item.ticker} · {item.type}
                  </p>
                </div>

                <ChangeBadge value={item.pnlPct} />
              </div>

              <p
                className="mt-5 text-lg font-black tracking-tight"
                style={{ color: accent }}
              >
                <AnimatedValue
                  value={item.value}
                  animationKey={`${period}-${item.id}-value`}
                />
              </p>

              <p
                className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${
                  isProfit ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {isProfit ?
                  <ArrowUpRight size={12} />
                : <ArrowDownRight size={12} />}
                {isProfit ? "+" : "-"}
                {formatCompactMoney(Math.abs(item.pnl))} (
                {Math.abs(item.pnlPct).toFixed(1)}%)
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
  accountsTotal,
}: AnalyticsClientProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const investmentTotal = useMemo(
    () => investments.reduce((sum, item) => sum + item.value, 0),
    [investments],
  );

  const periodRange = useMemo(
    () => getCurrentAndPreviousRange(period),
    [period],
  );

  const chartData = useMemo(
    () =>
      buildChartData({
        period,
        transactions,
        accountsTotal,
        investmentTotal,
      }),
    [period, transactions, accountsTotal, investmentTotal],
  );

  const spendingData = useMemo(
    () => buildSpendingData(transactions, periodRange.start, periodRange.end),
    [transactions, periodRange.start, periodRange.end],
  );

  const kpis = useMemo(() => {
    const totalIncome = sumTransactions(
      transactions,
      periodRange.start,
      periodRange.end,
      "income",
    );
    const totalExpenses = sumTransactions(
      transactions,
      periodRange.start,
      periodRange.end,
      "expense",
    );

    const previousIncome = sumTransactions(
      transactions,
      periodRange.previousStart,
      periodRange.previousEnd,
      "income",
    );

    const previousExpenses = sumTransactions(
      transactions,
      periodRange.previousStart,
      periodRange.previousEnd,
      "expense",
    );

    const netSavings = totalIncome - totalExpenses;
    const previousNetSavings = previousIncome - previousExpenses;

    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const previousSavingsRate =
      previousIncome > 0 ? (previousNetSavings / previousIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate: Number(savingsRate.toFixed(0)),
      incomeChange: pctDiff(totalIncome, previousIncome),
      expensesChange: pctDiff(totalExpenses, previousExpenses),
      netSavingsChange: pctDiff(netSavings, previousNetSavings),
      savingsRateChange: Number((savingsRate - previousSavingsRate).toFixed(1)),
    };
  }, [transactions, periodRange]);

  return (
    <div className="min-h-full rounded-[28px] bg-background px-2 py-2 text-text-primary sm:px-4 sm:py-3 lg:px-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-black tracking-tight text-text-primary">
              Analytics
            </h1>
            <p className="mt-1 text-xs font-medium text-text-secondary">
              Financial intelligence overview
            </p>
          </motion.div>

          <div className="inline-flex w-fit rounded-full border border-border bg-card p-1 shadow-theme">
            {PERIODS.map((item) => {
              const active = item.value === period;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`relative rounded-full px-4 py-2 text-xs font-bold transition-all ${
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
            accent="#22c55e"
            icon={<TrendingUp size={17} />}
            animationKey={`${period}-income-${kpis.totalIncome}`}
          />
          <KpiCard
            title="Total Expenses"
            value={kpis.totalExpenses}
            change={kpis.expensesChange}
            accent="#ff3b35"
            tone="negative"
            icon={<TrendingDown size={17} />}
            animationKey={`${period}-expenses-${kpis.totalExpenses}`}
          />
          <KpiCard
            title="Net Savings"
            value={kpis.netSavings}
            change={kpis.netSavingsChange}
            accent="#22c55e"
            icon={<PiggyBank size={17} />}
            animationKey={`${period}-savings-${kpis.netSavings}`}
          />
          <KpiCard
            title="Savings Rate"
            value={kpis.savingsRate}
            suffix="%"
            change={kpis.savingsRateChange}
            accent="#ff9700"
            tone="warning"
            icon={<CircleDollarSign size={17} />}
            animationKey={`${period}-rate-${kpis.savingsRate}`}
          />
        </motion.div>

        <IncomeExpenseChart data={chartData} period={period} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <NetWorthChart data={chartData} period={period} />
          <SpendingBreakdown data={spendingData} period={period} />
        </div>

        <InvestmentPerformance investments={investments} period={period} />

        <p className="flex items-center gap-2 px-1 pb-2 text-[11px] text-text-tertiary">
          <Sparkles size={13} />
          Analytics uses your existing transactions, categories, accounts, and
          investment data.
        </p>
      </div>
    </div>
  );
}
