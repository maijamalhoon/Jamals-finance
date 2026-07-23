"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Brain,
  Layers3,
  PieChart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "@/components/icons/jalvoro/compat";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  chartMotion,
  motionDurations,
  motionEase,
} from "@/components/motion/animation-config";
import ChartFrame from "@/components/ui/chart-frame";
import { getInvestmentGroupKey } from "@/lib/investments/aggregation";
import type { AggregatedInvestment } from "@/lib/investments/aggregation";
import InvestmentCard from "./InvestmentCard";
import type { ExistingInvestment } from "./InvestmentModal";

interface Insight {
  type: "positive" | "warning" | "tip";
  title: string;
  message: string;
}

type ComparisonTooltipItem = {
  dataKey?: "invested" | "current";
  value?: number;
  payload?: {
    name?: string;
    symbol?: string;
  };
};

type AllocationTooltipItem = {
  value?: number;
  payload?: {
    name?: string;
    percent?: number;
  };
};

function CompactMetric({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "profit" | "loss";
}) {
  const toneClass =
    tone === "profit"
      ? "text-success"
      : tone === "loss"
        ? "text-danger"
        : "text-text-primary";

  return (
    <div className="min-w-0 rounded-[18px] bg-surface-primary/58 px-3.5 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)] sm:px-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-base font-bold tabular-nums tracking-tight [overflow-wrap:anywhere] sm:text-lg ${toneClass}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-text-secondary">{helper}</p>
    </div>
  );
}

function ComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ComparisonTooltipItem[];
}) {
  const { formatCurrency } = useCurrency();

  if (!active || !payload?.length) return null;

  const invested = payload.find((item) => item.dataKey === "invested")?.value ?? 0;
  const current = payload.find((item) => item.dataKey === "current")?.value ?? 0;
  const holding = payload[0]?.payload;
  const pnl = current - invested;

  return (
    <div className="min-w-[178px] rounded-[15px] bg-card/95 p-3 text-xs shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <p className="font-semibold text-text-primary">
        {holding?.name ?? "Holding"}
        {holding?.symbol ? ` · ${holding.symbol}` : ""}
      </p>
      <div className="mt-2 space-y-1.5">
        <p className="flex items-center justify-between gap-5 text-text-secondary">
          <span>Invested</span>
          <span className="font-bold tabular-nums text-text-primary">
            {formatCurrency(invested)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-5 text-text-secondary">
          <span>Current</span>
          <span className="font-bold tabular-nums text-text-primary">
            {formatCurrency(current)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-5 pt-1.5">
          <span className="text-text-secondary">P/L</span>
          <span
            className={`font-bold tabular-nums ${pnl >= 0 ? "text-success" : "text-danger"}`}
          >
            {pnl >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(pnl))}
          </span>
        </p>
      </div>
    </div>
  );
}

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: AllocationTooltipItem[];
}) {
  const { formatCurrency } = useCurrency();

  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div className="rounded-[15px] bg-card/95 px-3 py-2.5 text-xs shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <p className="font-semibold text-text-primary">
        {item.payload?.name ?? "Holding"}
      </p>
      <p className="mt-1 font-bold tabular-nums text-text-primary">
        {formatCurrency(item.value ?? 0)}
      </p>
      <p className="mt-0.5 text-[11px] text-text-secondary">
        {(item.payload?.percent ?? 0).toFixed(1)}% of portfolio
      </p>
    </div>
  );
}

function PortfolioAnalytics({
  groupedHoldings,
  totalInvested,
  totalValue,
  totalPnL,
  totalPnLPct,
}: {
  groupedHoldings: AggregatedInvestment[];
  totalInvested: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPct: number;
}) {
  const { formatCurrency } = useCurrency();
  const gradientPrefix = useId().replace(/:/g, "");
  const isProfit = totalPnL >= 0;
  const liveCount = groupedHoldings.filter(
    (holding) => holding.is_live_priced,
  ).length;
  const comparisonRows = useMemo(
    () =>
      groupedHoldings.slice(0, 7).map((holding) => ({
        key: holding.groupKey,
        name: holding.name,
        symbol: holding.symbol ?? holding.name.slice(0, 5),
        invested: holding.totalInvested,
        current: holding.currentValue,
        color: holding.color,
      })),
    [groupedHoldings],
  );
  const allocationRows = useMemo(
    () =>
      groupedHoldings.slice(0, 7).map((holding) => ({
        key: holding.groupKey,
        name: holding.name,
        symbol: holding.symbol,
        value: holding.currentValue,
        color: holding.color,
        percent:
          totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0,
      })),
    [groupedHoldings, totalValue],
  );
  const largestHolding = allocationRows[0] ?? null;

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,0.75fr)]">
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDurations.page, ease: motionEase }}
        className="relative min-w-0 overflow-hidden rounded-[28px] p-4 shadow-[var(--shadow-soft)] sm:p-5 lg:p-6"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--investment) 10%, var(--card)) 0%, var(--card) 48%, color-mix(in srgb, var(--info) 7%, var(--card)) 100%)",
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--investment) 72%, white), transparent)",
          }}
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-active sm:text-[11px]">
              <Activity size={14} />
              Portfolio value
            </div>
            <p className="mt-3 break-words text-3xl font-bold tabular-nums tracking-[-0.035em] text-text-primary [overflow-wrap:anywhere] sm:text-4xl lg:text-[2.7rem]">
              {formatCurrency(totalValue)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  isProfit
                    ? "bg-success/11 text-success"
                    : "bg-danger/11 text-danger"
                }`}
              >
                {isProfit ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                {isProfit ? "+" : "-"}
                {formatCurrency(Math.abs(totalPnL))} · {isProfit ? "+" : "-"}
                {Math.abs(totalPnLPct).toFixed(1)}%
              </span>
              <span className="text-xs text-text-secondary">
                {liveCount} live priced · {groupedHoldings.length - liveCount} manual
              </span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 lg:w-[330px]">
            <CompactMetric
              label="Invested"
              value={formatCurrency(totalInvested)}
              helper="Total cost basis"
            />
            <CompactMetric
              label="Assets"
              value={String(groupedHoldings.length)}
              helper={
                groupedHoldings.length === 1 ? "Grouped holding" : "Grouped holdings"
              }
            />
          </div>
        </div>

        <div className="relative mt-5 rounded-[22px] bg-surface-primary/42 p-3 sm:mt-6 sm:p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 size={14} className="text-active" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Value vs cost
                </h3>
              </div>
              <p className="mt-1 text-[11px] text-text-secondary">
                Current value compared with the original cost of each holding.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-text-secondary/45" /> Cost
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-[var(--investment)]" /> Current
              </span>
            </div>
          </div>

          <ChartFrame
            className="h-[245px] min-h-[245px] sm:h-[285px] sm:min-h-[285px]"
            tone="purple"
          >
            {({ width, height }) => {
              const compact = width < 520;
              const costGradientId = `${gradientPrefix}-cost`;

              return (
                <BarChart
                  accessibilityLayer
                  data={comparisonRows}
                  layout="vertical"
                  width={width}
                  height={height}
                  margin={{
                    top: 4,
                    right: compact ? 2 : 14,
                    bottom: compact ? 0 : 2,
                    left: compact ? 0 : 6,
                  }}
                  barGap={compact ? 2 : 4}
                  barCategoryGap={compact ? "30%" : "36%"}
                >
                  <defs>
                    <linearGradient
                      id={costGradientId}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--text-secondary)"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--text-secondary)"
                        stopOpacity={0.52}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--border)"
                    strokeDasharray="3 6"
                    strokeOpacity={0.55}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-secondary)", fontSize: 9 }}
                    tickFormatter={(value: number) =>
                      formatCurrency(value, {
                        compact: true,
                        maximumFractionDigits: 1,
                      })
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    axisLine={false}
                    tickLine={false}
                    width={compact ? 42 : 62}
                    tick={{
                      fill: "var(--text-secondary)",
                      fontSize: compact ? 9 : 10,
                      fontWeight: 700,
                    }}
                    tickFormatter={(value: string) =>
                      value.slice(0, compact ? 4 : 7)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "var(--hover)", opacity: 0.28 }}
                    content={<ComparisonTooltip />}
                  />
                  <Bar
                    dataKey="invested"
                    fill={`url(#${costGradientId})`}
                    radius={[0, 8, 8, 0]}
                    maxBarSize={compact ? 11 : 14}
                    {...chartMotion}
                  />
                  <Bar
                    dataKey="current"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={compact ? 11 : 14}
                    {...chartMotion}
                  >
                    {comparisonRows.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              );
            }}
          </ChartFrame>
        </div>
      </motion.article>

      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionDurations.page,
          delay: 0.025,
          ease: motionEase,
        }}
        className="relative min-w-0 overflow-hidden rounded-[28px] p-4 shadow-[var(--shadow-soft)] sm:p-5"
        style={{
          background:
            "linear-gradient(155deg, color-mix(in srgb, var(--info) 8%, var(--card)) 0%, var(--card) 52%, color-mix(in srgb, var(--warning) 6%, var(--card)) 100%)",
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--info) 70%, white), transparent)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-active sm:text-[11px]">
              <PieChart size={14} />
              Allocation
            </div>
            <h3 className="mt-2 text-base font-semibold text-text-primary">
              Portfolio mix
            </h3>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Every asset appears once, even when it has multiple purchases.
            </p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-surface-primary/55 text-active">
            <Layers3 size={17} />
          </span>
        </div>

        <div className="relative mt-3 rounded-[22px] bg-surface-primary/36 py-2">
          <ChartFrame className="h-[226px] min-h-[226px]" tone="purple">
            {({ width, height }) => {
              const outerRadius = Math.min(width, height) * 0.39;
              const innerRadius = outerRadius * 0.69;

              return (
                <RechartsPieChart
                  width={width}
                  height={height}
                  accessibilityLayer
                >
                  <Tooltip content={<AllocationTooltip />} />
                  <Pie
                    data={allocationRows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={allocationRows.length > 1 ? 2.4 : 0}
                    cornerRadius={6}
                    stroke="var(--card)"
                    strokeWidth={3}
                    {...chartMotion}
                  >
                    {allocationRows.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              );
            }}
          </ChartFrame>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="max-w-[136px] text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-text-secondary">
                Current value
              </p>
              <p className="mt-1 break-words text-sm font-bold tabular-nums text-text-primary [overflow-wrap:anywhere]">
                {formatCurrency(totalValue, { compact: true })}
              </p>
              {largestHolding ? (
                <p className="mt-1 truncate text-[10px] text-text-secondary">
                  Top: {largestHolding.name}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {allocationRows.slice(0, 5).map((item) => (
            <div key={item.key} className="min-w-0 rounded-[14px] bg-surface-primary/42 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">
                  {item.name}
                </p>
                <span className="shrink-0 text-xs font-bold tabular-nums text-text-primary">
                  {item.percent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(3, Math.min(100, item.percent))}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.article>
    </section>
  );
}

function EmbeddedInsightCard({
  investments,
}: {
  investments: ExistingInvestment[];
}) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"ready" | "empty" | "unavailable">(
    "ready",
  );

  useEffect(() => {
    setLoading(true);
    setStatus("ready");
    setInsight(null);

    if (investments.length === 0) {
      setLoading(false);
      setStatus("empty");
      return;
    }

    const controller = new AbortController();

    fetch("/api/ai-insights", { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();

        if (!response.ok || json.error) {
          setStatus("unavailable");
          return;
        }

        if (json.empty) {
          setStatus("empty");
          return;
        }

        if (json.insights?.[0]) {
          setInsight(json.insights[0]);
          setStatus("ready");
        } else {
          setStatus("empty");
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [investments.length]);

  const message =
    insight?.message ??
    (status === "unavailable"
      ? "AI insights are temporarily unavailable."
      : "Add more activity to unlock personalized portfolio guidance.");

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionDurations.base,
        delay: 0.04,
        ease: motionEase,
      }}
      className="flex flex-col gap-3 rounded-[22px] bg-surface-secondary/48 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-surface-primary/60 text-active">
          <Brain size={17} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">
              AI portfolio note
            </p>
            {!loading && status === "unavailable" ? (
              <span className="rounded-full bg-surface-primary px-2 py-1 text-[10px] font-semibold text-text-secondary">
                Unavailable
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {loading ? "Reading your latest portfolio signals..." : message}
          </p>
          {!loading && insight?.title ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-active">
              <Sparkles size={12} />
              {insight.title}
            </p>
          ) : null}
        </div>
      </div>
      <Link
        href="/dashboard/ai-insights"
        className="finance-focus inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-surface-primary/65 px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-hover"
      >
        View insight
        <ArrowRight size={12} />
      </Link>
    </motion.article>
  );
}

export default function InvestmentOverview({
  investments,
  groupedHoldings,
  totalInvested,
  totalValue,
  totalPnL,
  totalPnLPct,
}: {
  investments: ExistingInvestment[];
  groupedHoldings: AggregatedInvestment[];
  totalInvested: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPct: number;
}) {
  const lotsByGroup = useMemo(() => {
    return investments.reduce((groups, investment) => {
      const groupKey = getInvestmentGroupKey(investment);
      const current = groups.get(groupKey) ?? [];
      current.push(investment);
      groups.set(groupKey, current);
      return groups;
    }, new Map<string, ExistingInvestment[]>());
  }, [investments]);

  const groupedCards = groupedHoldings.map((holding) => ({
    color: holding.color,
    investment: {
      id: holding.id,
      name: holding.name,
      type: holding.type,
      quantity: holding.quantity,
      purchase_price: holding.purchase_price,
      current_price: holding.current_price,
      current_price_original: holding.current_price_original,
      current_price_currency: holding.current_price_currency,
      purchased_at: "",
      asset_id: holding.asset_id,
      symbol: holding.symbol,
      image_url: holding.image_url,
      price_source: holding.price_source,
      price_currency: "PKR",
      price_updated_at: holding.price_updated_at,
      price_change_24h: holding.price_change_24h,
      is_live_priced: holding.is_live_priced,
      item_count: holding.itemCount,
    } satisfies ExistingInvestment,
  }));

  return (
    <div className="space-y-5 sm:space-y-6">
      <PortfolioAnalytics
        groupedHoldings={groupedHoldings}
        totalInvested={totalInvested}
        totalValue={totalValue}
        totalPnL={totalPnL}
        totalPnLPct={totalPnLPct}
      />

      <EmbeddedInsightCard investments={investments} />

      <section className="space-y-3.5" aria-label="Investment holdings">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-active" />
              <h2 className="text-base font-semibold text-text-primary sm:text-lg">
                Your holdings
              </h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              One clean position per asset, with every separate purchase kept inside.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
            <WalletCards size={14} />
            {investments.length} purchase{investments.length === 1 ? "" : "s"}
            {" across "}
            {groupedHoldings.length} asset
            {groupedHoldings.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          {groupedCards.map(({ investment, color }) => (
            <InvestmentCard
              key={investment.id}
              inv={investment}
              accentColor={color}
              lots={lotsByGroup.get(getInvestmentGroupKey(investment)) ?? []}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
