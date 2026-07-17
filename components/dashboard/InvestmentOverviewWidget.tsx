"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, Zap } from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import ChartFrame from "@/components/ui/chart-frame";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import {
  aggregateInvestmentHoldings,
  getAssetInitials,
  getInvestmentGroupKey,
  type AggregatedInvestment,
} from "@/lib/investments/aggregation";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

interface Investment {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
  purchased_at?: string | null;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
}

type AllocationEntry = {
  id: string;
  name: string;
  symbol: string | null;
  imageUrl: string | null;
  value: number;
  color: string;
  trend: number[];
  holding: AggregatedInvestment;
};

const ASSET_ACCENTS: Record<string, string> = {
  bitcoin: "#f7931a",
  btc: "#f7931a",
  ethereum: "#627eea",
  eth: "#627eea",
  solana: "#7c3aed",
  sol: "#7c3aed",
  tether: "#26a17b",
  usdt: "#26a17b",
  binancecoin: "#f3ba2f",
  bnb: "#f3ba2f",
  ripple: "#23292f",
  xrp: "#23292f",
  cardano: "#3468d4",
  ada: "#3468d4",
  dogecoin: "#c2a633",
  doge: "#c2a633",
  litecoin: "#345d9d",
  ltc: "#345d9d",
  polkadot: "#e6007a",
  dot: "#e6007a",
  avalanche: "#e84142",
  avax: "#e84142",
  chainlink: "#2a5ada",
  link: "#2a5ada",
  polygon: "#8247e5",
  matic: "#8247e5",
};

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getAssetAccent(holding: AggregatedInvestment) {
  const symbol = holding.symbol?.trim().toLowerCase() ?? "";
  const assetId = holding.asset_id?.trim().toLowerCase() ?? "";

  return ASSET_ACCENTS[symbol] ?? ASSET_ACCENTS[assetId] ?? holding.color;
}

function buildRealTrend(
  investments: Investment[],
  holding: AggregatedInvestment,
) {
  const purchasePrices = investments
    .filter((investment) => getInvestmentGroupKey(investment) === holding.groupKey)
    .sort((a, b) => getTimestamp(a.purchased_at) - getTimestamp(b.purchased_at))
    .map((investment) => toFiniteNumber(investment.purchase_price))
    .filter((price) => price > 0);

  const realPoints = [...purchasePrices];
  const change24h = holding.price_change_24h;

  if (
    holding.current_price > 0 &&
    typeof change24h === "number" &&
    Number.isFinite(change24h) &&
    change24h > -100
  ) {
    const previousPrice = holding.current_price / (1 + change24h / 100);
    if (Number.isFinite(previousPrice) && previousPrice > 0) {
      realPoints.push(previousPrice);
    }
  }

  if (holding.current_price > 0) {
    realPoints.push(holding.current_price);
  }

  const compactPoints = realPoints.filter(
    (point, index) => index === 0 || point !== realPoints[index - 1],
  );

  if (compactPoints.length === 0) return [0, 0];
  if (compactPoints.length === 1) return [compactPoints[0], compactPoints[0]];

  return compactPoints.slice(-12);
}

function buildAllocationData(investments: Investment[]): AllocationEntry[] {
  return aggregateInvestmentHoldings(investments)
    .map((holding) => ({
      id: holding.groupKey,
      name: holding.name,
      symbol: holding.symbol,
      imageUrl: holding.image_url,
      value: Number.isFinite(holding.currentValue) ? holding.currentValue : 0,
      color: getAssetAccent(holding),
      trend: buildRealTrend(investments, holding),
      holding,
    }))
    .filter((holding) => holding.value > 0 && holding.holding.current_price > 0);
}

function formatAllocation(value: number) {
  return `${value.toFixed(1)}%`;
}

function isCoinGeckoImage(imageUrl: string) {
  try {
    return new URL(imageUrl).hostname === "coin-images.coingecko.com";
  } catch {
    return false;
  }
}

function AssetLogo({ entry, size = 32 }: { entry: AllocationEntry; size?: number }) {
  if (entry.imageUrl && isCoinGeckoImage(entry.imageUrl)) {
    return (
      <Image
        src={entry.imageUrl}
        alt={`${entry.name} logo`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  if (entry.imageUrl) {
    return (
      // Asset providers can vary; keep unknown hosts outside the Next image allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.imageUrl}
        alt={`${entry.name} logo`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[10px] font-black text-white shadow-sm"
      style={{ width: size, height: size, backgroundColor: entry.color }}
      aria-label={`${entry.name} asset icon`}
    >
      {getAssetInitials(entry.name, entry.symbol)}
    </span>
  );
}

function RealSparkline({
  values,
  color,
  label,
}: {
  values: number[];
  color: string;
  label: string;
}) {
  const width = 150;
  const height = 36;
  const padding = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const points = values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding + (index / (values.length - 1)) * (width - padding * 2);
      const y =
        range === 0
          ? height / 2
          : padding + ((max - value) / range) * (height - padding * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const lastPoint = points.split(" ").at(-1)?.split(",") ?? ["0", "0"];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-9 w-full min-w-[76px] overflow-visible"
      role="img"
      aria-label={`${label} real price trend`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        className="investment-sparkline-line"
      />
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="2.6"
        fill={color}
        className="investment-sparkline-point"
      />
      <style>{`
        .investment-sparkline-line {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: investment-sparkline-draw 760ms var(--motion-ease) forwards;
        }

        .investment-sparkline-point {
          opacity: 0;
          animation: investment-sparkline-point-in 180ms var(--motion-ease) 620ms forwards;
        }

        @keyframes investment-sparkline-draw {
          to { stroke-dashoffset: 0; }
        }

        @keyframes investment-sparkline-point-in {
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .investment-sparkline-line {
            stroke-dashoffset: 0;
            animation: none;
          }

          .investment-sparkline-point {
            opacity: 1;
            animation: none;
          }
        }
      `}</style>
    </svg>
  );
}

export default function InvestmentOverviewWidget({
  investments,
  totalPnLPct,
  availability,
  unpricedCount,
}: {
  investments: Investment[];
  totalPnLPct: number | null;
  availability: DashboardAvailability;
  unpricedCount: number;
}) {
  const { formatCurrency } = useCurrency();
  const allocationData = buildAllocationData(investments);
  const visibleInvestments = allocationData.slice(0, 3);
  const allocationTotalValue = allocationData.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const isProfit = totalPnLPct !== null && totalPnLPct > 0;
  const isLoss = totalPnLPct !== null && totalPnLPct < 0;
  const pnlColor =
    isProfit ? "var(--success)"
    : isLoss ? "var(--danger)"
    : "var(--text-secondary)";
  const pnlLabel =
    totalPnLPct === null ? "P&L unavailable"
    : `${isProfit ? "+" : ""}${totalPnLPct.toFixed(1)}%`;
  const emptyTitle =
    availability === "unavailable" ? "Portfolio unavailable"
    : investments.length === 0 ? "No holdings yet"
    : "Pricing unavailable";
  const emptyDescription =
    availability === "unavailable" ? "Refresh when your connection is stable."
    : investments.length === 0 ? "Add investments to see allocation."
    : "Current prices are missing, so value and performance are not shown.";

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5 lg:p-6">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
            <span className="dashboard-list-card-kicker-icon">
              <Zap />
            </span>
            <span className="truncate">Investments</span>
          </div>
          <h3 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-text-primary sm:text-2xl">
            Portfolio Overview
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-secondary sm:text-sm">
            Allocation by priced current value
          </p>
        </div>

        <Link
          href="/dashboard/investments"
          className="dashboard-card-action finance-focus mt-1 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs sm:px-4 sm:text-sm"
          aria-label="Open investment details"
        >
          Details
          <ArrowRight size={14} />
        </Link>
      </header>

      {allocationData.length === 0 ? (
        <div className="dashboard-chart-empty mt-5 min-h-[260px] flex-1">
          <div>
            <span className="dashboard-chart-empty-icon">
              <Package size={16} />
            </span>
            <p className="text-xs font-semibold text-text-primary">{emptyTitle}</p>
            <p className="mt-1 text-[11px] text-text-secondary">{emptyDescription}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid min-h-0 flex-1 gap-5 2xl:grid-cols-[minmax(220px,0.86fr)_minmax(280px,1.14fr)] 2xl:items-center">
          <div className="min-w-0">
            <p className="sr-only">
              Priced portfolio value {allocationTotalValue}. Performance is {pnlLabel}.
              {unpricedCount > 0
                ? ` ${unpricedCount} holdings are excluded because current pricing is unavailable.`
                : ""}
            </p>

            <div className="relative mx-auto aspect-square w-full max-w-[240px] min-[420px]:max-w-[248px] sm:max-w-[256px] md:max-w-[272px] lg:max-w-[288px] xl:max-w-[300px] 2xl:max-w-[260px]">
              <ChartFrame>
                {({ width, height }) => (
                  <PieChart width={width} height={height} accessibilityLayer>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="52%"
                      outerRadius="78%"
                      paddingAngle={2}
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={700}
                      animationEasing="ease-out"
                      stroke="var(--card)"
                      strokeWidth={3}
                    >
                      {allocationData.map((entry) => (
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
                        "Priced value",
                      ]}
                      labelFormatter={(label) => {
                        const item = allocationData.find(
                          (entry) => entry.name === label,
                        );
                        return item
                          ? `${label} - ${formatAllocation(
                              (item.value / allocationTotalValue) * 100,
                            )}`
                          : String(label);
                      }}
                    />
                  </PieChart>
                )}
              </ChartFrame>

              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div className="min-w-0 max-w-[46%] px-2">
                  <p className="truncate text-2xl font-black leading-none tracking-tight text-text-primary tabular-nums sm:text-3xl">
                    <CountedAmount
                      amount={formatCurrency(allocationTotalValue, {
                        compact: true,
                      })}
                    />
                  </p>
                  <p
                    className="mt-2 text-sm font-bold leading-none tabular-nums sm:text-base"
                    style={{ color: pnlColor }}
                  >
                    {totalPnLPct === null ? (
                      pnlLabel
                    ) : (
                      <CountedAmount amount={pnlLabel} />
                    )}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold leading-none tracking-[0.12em] text-text-secondary sm:text-xs">
                    priced value
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-2.5">
            {visibleInvestments.map((investment) => {
              const allocation =
                allocationTotalValue > 0
                  ? (investment.value / allocationTotalValue) * 100
                  : 0;

              return (
                <div
                  key={investment.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(76px,0.9fr)_auto] items-center gap-2.5 rounded-[18px] border border-border bg-surface-secondary px-3 py-2.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22)] sm:grid-cols-[auto_minmax(110px,1fr)_minmax(110px,1.2fr)_auto] sm:gap-3 sm:px-4 sm:py-3"
                >
                  <AssetLogo entry={investment} size={34} />

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-text-primary sm:text-sm">
                      {investment.name}
                    </p>
                    {investment.symbol ? (
                      <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-text-secondary sm:text-[10px]">
                        {investment.symbol}
                      </p>
                    ) : null}
                  </div>

                  <RealSparkline
                    values={investment.trend}
                    color={investment.color}
                    label={investment.name}
                  />

                  <span
                    className="shrink-0 text-xs font-black tabular-nums sm:text-sm"
                    style={{ color: investment.color }}
                  >
                    {formatAllocation(allocation)}
                  </span>
                </div>
              );
            })}

            {allocationData.length > 3 ? (
              <p className="px-1 text-[10px] font-medium leading-4 text-text-secondary">
                Top 3 holdings shown from {allocationData.length} priced assets.
              </p>
            ) : null}

            {unpricedCount > 0 ? (
              <p className="px-1 text-[10px] font-semibold leading-4 text-warning">
                {unpricedCount} unpriced {unpricedCount === 1 ? "holding" : "holdings"} excluded
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
