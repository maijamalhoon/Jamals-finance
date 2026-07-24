"use client";

import { useId, useMemo } from "react";
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
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Layers3,
  PieChart,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  chartMotion,
  motionDurations,
  motionEase,
} from "@/components/motion/animation-config";
import ChartFrame from "@/components/ui/chart-frame";
import {
  getInvestmentGroupKey,
  type AggregatedInvestment,
} from "@/lib/investments/aggregation";

import InvestmentCard from "./InvestmentCard";
import type { ExistingInvestment } from "./InvestmentModal";

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

const COST_CHART_COLOR =
  "color-mix(in srgb, var(--expense) 88%, var(--primary) 12%)";
const COST_CHART_LIGHT =
  "color-mix(in srgb, var(--expense) 74%, white 26%)";
const COST_CHART_DEEP =
  "color-mix(in srgb, var(--expense) 91%, black 9%)";
const CURRENT_CHART_COLOR =
  "color-mix(in srgb, var(--income) 88%, var(--primary) 12%)";
const CURRENT_CHART_LIGHT =
  "color-mix(in srgb, var(--income) 74%, white 26%)";
const CURRENT_CHART_DEEP =
  "color-mix(in srgb, var(--income) 90%, black 10%)";

function MetricTile({
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
    <div className="min-w-0 rounded-[18px] bg-surface-secondary/55 px-3.5 py-3.5 sm:px-4">
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
    <div className="min-w-[184px] rounded-[14px] bg-card p-3 text-xs shadow-[var(--shadow-soft)]">
      <p className="font-semibold text-text-primary">
        {holding?.name ?? "Holding"}
        {holding?.symbol ? ` · ${holding.symbol}` : ""}
      </p>
      <div className="mt-2 space-y-1.5">
        <p
          className="flex items-center justify-between gap-5 font-medium"
          style={{ color: COST_CHART_COLOR }}
        >
          <span>Cost</span>
          <span className="font-bold tabular-nums">{formatCurrency(invested)}</span>
        </p>
        <p
          className="flex items-center justify-between gap-5 font-medium"
          style={{ color: CURRENT_CHART_COLOR }}
        >
          <span>Current</span>
          <span className="font-bold tabular-nums">{formatCurrency(current)}</span>
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
    <div className="rounded-[14px] bg-card px-3 py-2.5 text-xs shadow-[var(--shadow-soft)]">
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
      groupedHoldings.slice(0, 6).map((holding) => ({
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
      groupedHoldings.slice(0, 6).map((holding) => ({
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
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(300px,0.82fr)]">
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDurations.page, ease: motionEase }}
        className="min-w-0 overflow-hidden rounded-[28px] bg-card p-4 sm:p-5 lg:p-6"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_316px] lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-active sm:text-[11px]">
              <BarChart3 size={14} />
              Portfolio overview
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
              <p className="min-w-0 break-words text-3xl font-bold tabular-nums tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-4xl">
                {formatCurrency(totalValue)}
              </p>
              <span
                className={`mb-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  isProfit
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
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
            </div>

            <p className="mt-2 text-xs text-text-secondary">
              {liveCount} live priced · {groupedHoldings.length - liveCount} manual
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2">
            <MetricTile
              label="Invested"
              value={formatCurrency(totalInvested)}
              helper="Total cost basis"
            />
            <MetricTile
              label="Holdings"
              value={String(groupedHoldings.length)}
              helper={
                groupedHoldings.length === 1 ? "Grouped asset" : "Grouped assets"
              }
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] bg-surface-secondary/34 p-3 sm:p-4">
          <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">
                Current value vs cost
              </h3>
              <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">
                Cost is shown in expense red and current value in income green.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-full bg-surface-primary/45 px-3 py-2 text-[10px] font-semibold text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <i
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COST_CHART_COLOR }}
                />
                Cost
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CURRENT_CHART_COLOR }}
                />
                Current
              </span>
            </div>
          </div>

          <ChartFrame
            className="h-[242px] min-h-[242px] sm:h-[272px] sm:min-h-[272px]"
            tone="default"
          >
            {({ width, height }) => {
              const compact = width < 500;
              const costGradientId = `${gradientPrefix}-clean-cost`;
              const currentGradientId = `${gradientPrefix}-clean-current`;

              return (
                <BarChart
                  accessibilityLayer
                  data={comparisonRows}
                  width={width}
                  height={height}
                  layout="vertical"
                  margin={{
                    top: 4,
                    right: compact ? 2 : 12,
                    bottom: 0,
                    left: compact ? 0 : 4,
                  }}
                  barGap={4}
                  barCategoryGap={compact ? "28%" : "32%"}
                >
                  <defs>
                    <linearGradient
                      id={costGradientId}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={COST_CHART_DEEP} />
                      <stop offset="52%" stopColor={COST_CHART_LIGHT} />
                      <stop offset="100%" stopColor={COST_CHART_COLOR} />
                    </linearGradient>
                    <linearGradient
                      id={currentGradientId}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={CURRENT_CHART_DEEP} />
                      <stop offset="52%" stopColor={CURRENT_CHART_LIGHT} />
                      <stop offset="100%" stopColor={CURRENT_CHART_COLOR} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 7"
                    strokeOpacity={0.42}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
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
                    interval={0}
                    width={compact ? 46 : 72}
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    tickFormatter={(value: string) =>
                      value.slice(0, compact ? 5 : 8)
                    }
                  />
                  <Tooltip cursor={{ fill: "transparent" }} content={<ComparisonTooltip />} />
                  <Bar
                    dataKey="invested"
                    fill={`url(#${costGradientId})`}
                    radius={[8, 8, 8, 8]}
                    maxBarSize={compact ? 11 : 14}
                    {...chartMotion}
                  />
                  <Bar
                    dataKey="current"
                    fill={`url(#${currentGradientId})`}
                    radius={[8, 8, 8, 8]}
                    maxBarSize={compact ? 11 : 14}
                    {...chartMotion}
                  />
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
        className="min-w-0 overflow-hidden rounded-[26px] bg-card p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-active sm:text-[11px]">
              <PieChart size={14} />
              Allocation
            </div>
            <h3 className="mt-2 text-base font-semibold text-text-primary">
              Portfolio mix
            </h3>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              One segment per asset, even when it has several purchases.
            </p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-investment-soft/70 text-active">
            <Layers3 size={17} />
          </span>
        </div>

        <div className="relative mt-3 rounded-[22px] bg-surface-secondary/35 py-2 [container-type:inline-size]">
          <ChartFrame className="h-[228px] min-h-[228px]" tone="purple">
            {({ width, height }) => {
              const outerRadius = Math.min(width, height) * 0.37;
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
                    paddingAngle={allocationRows.length > 1 ? 3 : 0}
                    cornerRadius={8}
                    stroke="transparent"
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
            <div className="w-[52%] max-w-[118px] min-w-0 text-center">
              <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-text-secondary sm:text-[9px]">
                Current value
              </p>
              <p
                className="mt-1 max-w-full truncate whitespace-nowrap text-[clamp(0.7rem,5.1cqw,0.84rem)] font-bold tabular-nums text-text-primary"
                title={formatCurrency(totalValue)}
              >
                {formatCurrency(totalValue, { compact: true })}
              </p>
              {largestHolding ? (
                <p className="mt-1 truncate text-[9px] text-text-secondary">
                  Top: {largestHolding.name}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {allocationRows.slice(0, 5).map((item) => (
            <div key={item.key} className="min-w-0">
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
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out"
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

export default function InvestmentOverviewClean({
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

  const groupedCards: ExistingInvestment[] = groupedHoldings.map((holding) => ({
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
              Every asset appears once. Open its history to manage each separate buy.
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

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
          {groupedCards.map((investment) => (
            <InvestmentCard
              key={investment.id}
              inv={investment}
              lots={lotsByGroup.get(getInvestmentGroupKey(investment)) ?? []}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
