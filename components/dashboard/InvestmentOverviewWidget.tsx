"use client";

import Image from "next/image";
import { BriefcaseBusiness, Layers3, Package } from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import DashboardCardViewLink from "@/components/dashboard/DashboardCardViewLink";
import ChartFrame from "@/components/ui/chart-frame";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import {
  aggregateInvestmentHoldings,
  getAssetInitials,
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

const OTHER_ASSETS_COLOR = "#5b7187";

function getAssetAccent(holding: AggregatedInvestment) {
  const symbol = holding.symbol?.trim().toLowerCase() ?? "";
  const assetId = holding.asset_id?.trim().toLowerCase() ?? "";

  return ASSET_ACCENTS[symbol] ?? ASSET_ACCENTS[assetId] ?? holding.color;
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

function AllocationBar({
  value,
  color,
  label,
  delayMs = 0,
}: {
  value: number;
  color: string;
  label: string;
  delayMs?: number;
}) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <span
      className="flex h-9 w-full min-w-[76px] items-center"
      role="img"
      aria-label={`${label} allocation ${formatAllocation(value)}`}
    >
      <span className="relative h-[3px] w-full">
        <span
          className="investment-allocation-bar absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color,
            animationDelay: `${delayMs}ms`,
          }}
        />
      </span>
    </span>
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
  const otherInvestments = allocationData.slice(3);
  const allocationTotalValue = allocationData.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const otherAssetsValue = otherInvestments.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const otherAssetsAllocation =
    allocationTotalValue > 0 ? (otherAssetsValue / allocationTotalValue) * 100 : 0;
  const isProfit = totalPnLPct !== null && totalPnLPct > 0;
  const isLoss = totalPnLPct !== null && totalPnLPct < 0;
  const pnlColor =
    isProfit
      ? "var(--success)"
      : isLoss
        ? "var(--danger)"
        : "var(--text-secondary)";
  const pnlLabel =
    totalPnLPct === null
      ? "P&L unavailable"
      : `${isProfit ? "+" : ""}${totalPnLPct.toFixed(1)}%`;
  const emptyTitle =
    availability === "unavailable"
      ? "Portfolio unavailable"
      : investments.length === 0
        ? "No holdings yet"
        : "Pricing unavailable";
  const emptyDescription =
    availability === "unavailable"
      ? "Refresh when your connection is stable."
      : investments.length === 0
        ? "Add investments to see allocation."
        : "Current prices are missing, so value and performance are not shown.";

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5 lg:p-6">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
          <span className="dashboard-list-card-kicker-icon !border-transparent !bg-transparent !text-text-secondary !shadow-none">
            <BriefcaseBusiness size={15} strokeWidth={2.3} aria-hidden="true" />
          </span>
          <span className="truncate">Investments</span>
        </div>

        <DashboardCardViewLink
          href="/dashboard/investments"
          label="View all investments"
        />
      </header>

      {allocationData.length === 0 ? (
        <div className="dashboard-chart-empty mt-5 min-h-[260px] flex-1">
          <div>
            <span className="dashboard-chart-empty-icon">
              <Package size={16} />
            </span>
            <p className="text-xs font-semibold text-text-primary">
              {emptyTitle}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              {emptyDescription}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(220px,0.86fr)_minmax(280px,1.14fr)] md:items-center">
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
                      cursor={false}
                      contentStyle={{
                        maxWidth: "min(78vw, 280px)",
                        borderRadius: 14,
                        borderColor: "var(--border)",
                        background: "var(--chart-tooltip)",
                        color: "var(--text-primary)",
                        boxShadow: "var(--shadow-soft)",
                        padding: "10px 12px",
                      }}
                      itemStyle={{
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 750,
                        padding: 0,
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(value, _name, item) => {
                        const entry = item.payload as AllocationEntry | undefined;
                        const label =
                          entry?.symbol?.trim().toUpperCase() ||
                          entry?.name ||
                          "Investment";

                        return [formatCurrency(Number(value ?? 0)), label];
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
            {visibleInvestments.map((investment, index) => {
              const allocation =
                allocationTotalValue > 0
                  ? (investment.value / allocationTotalValue) * 100
                  : 0;

              return (
                <div
                  key={investment.id}
                  title={`${investment.name}${investment.symbol ? ` (${investment.symbol.toUpperCase()})` : ""}`}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(76px,0.9fr)_auto] items-center gap-2.5 px-3 py-2.5 sm:grid-cols-[auto_minmax(110px,1fr)_minmax(110px,1.2fr)_auto] sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[auto_minmax(110px,1fr)_auto] md:gap-4"
                >
                  <AssetLogo entry={investment} size={34} />

                  <div className="min-w-0 md:hidden">
                    <p className="truncate text-xs font-semibold text-text-primary sm:text-sm">
                      {investment.name}
                    </p>
                    {investment.symbol ? (
                      <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-text-secondary sm:text-[10px]">
                        {investment.symbol}
                      </p>
                    ) : null}
                  </div>

                  <AllocationBar
                    value={allocation}
                    color={investment.color}
                    label={investment.name}
                    delayMs={120 + index * 120}
                  />

                  <span
                    className="shrink-0 text-xs font-black tabular-nums sm:text-sm md:hidden"
                    style={{ color: investment.color }}
                  >
                    {formatAllocation(allocation)}
                  </span>

                  <div className="hidden shrink-0 items-baseline justify-end gap-2 text-right md:flex">
                    <span className="text-xs font-bold text-text-primary tabular-nums lg:text-sm">
                      {formatCurrency(investment.value, { compact: true })}
                    </span>
                    <span
                      className="text-xs font-black tabular-nums lg:text-sm"
                      style={{ color: investment.color }}
                    >
                      {formatAllocation(allocation)}
                    </span>
                  </div>
                </div>
              );
            })}

            {otherInvestments.length > 0 ? (
              <div
                title="Other assets"
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(76px,0.9fr)_auto] items-center gap-2.5 px-3 py-2.5 sm:grid-cols-[auto_minmax(110px,1fr)_minmax(110px,1.2fr)_auto] sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[auto_minmax(110px,1fr)_auto] md:gap-4"
              >
                <span
                  className="grid shrink-0 place-items-center rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    color: OTHER_ASSETS_COLOR,
                    backgroundColor: "rgba(91, 113, 135, 0.13)",
                  }}
                  aria-label="Other assets icon"
                >
                  <Layers3 size={17} strokeWidth={2.1} />
                </span>

                <div className="min-w-0 md:hidden">
                  <p className="truncate text-xs font-semibold text-text-primary sm:text-sm">
                    Other assets
                  </p>
                </div>

                <AllocationBar
                  value={otherAssetsAllocation}
                  color={OTHER_ASSETS_COLOR}
                  label="Other assets"
                  delayMs={480}
                />

                <span
                  className="shrink-0 text-xs font-black tabular-nums sm:text-sm md:hidden"
                  style={{ color: OTHER_ASSETS_COLOR }}
                >
                  {formatAllocation(otherAssetsAllocation)}
                </span>

                <div className="hidden shrink-0 items-baseline justify-end gap-2 text-right md:flex">
                  <span className="text-xs font-bold text-text-primary tabular-nums lg:text-sm">
                    {formatCurrency(otherAssetsValue, { compact: true })}
                  </span>
                  <span
                    className="text-xs font-black tabular-nums lg:text-sm"
                    style={{ color: OTHER_ASSETS_COLOR }}
                  >
                    {formatAllocation(otherAssetsAllocation)}
                  </span>
                </div>
              </div>
            ) : null}

            {unpricedCount > 0 ? (
              <p className="px-1 text-[10px] font-semibold leading-4 text-warning">
                {unpricedCount} unpriced{" "}
                {unpricedCount === 1 ? "holding" : "holdings"} excluded
              </p>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        .investment-allocation-bar {
          opacity: 0.35;
          transform: scaleX(0);
          transform-origin: left center;
          animation: investment-allocation-fill 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }

        @keyframes investment-allocation-fill {
          from {
            opacity: 0.35;
            transform: scaleX(0);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .investment-allocation-bar {
            opacity: 1;
            transform: scaleX(1);
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
