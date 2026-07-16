"use client";

import Link from "next/link";
import { ArrowRight, Package, Zap } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import ChartCard from "@/components/dashboard/ChartCard";
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

function shortName(name: string) {
  return name.length > 15 ? `${name.slice(0, 13)}…` : name;
}

function formatAllocation(value: number) {
  return `${value.toFixed(1)}%`;
}

function buildAllocationData(investments: Investment[]): AllocationEntry[] {
  return aggregateInvestmentHoldings(investments)
    .map((holding) => ({
      id: holding.groupKey,
      name: holding.name,
      symbol: holding.symbol,
      imageUrl: holding.image_url,
      value: Number.isFinite(holding.currentValue) ? holding.currentValue : 0,
      color: holding.color,
      holding,
    }))
    .filter((holding) => holding.value > 0 && holding.holding.current_price > 0);
}

function LegendIcon({ entry }: { entry: AllocationEntry }) {
  if (entry.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={entry.imageUrl} alt="" className="h-5 w-5 shrink-0 rounded-full" />
    );
  }

  return (
    <span
      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-text-inverse"
      style={{ backgroundColor: entry.color }}
    >
      {getAssetInitials(entry.name, entry.symbol)}
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
  const allocationTotalValue = allocationData.reduce(
    (sum, investment) => sum + investment.value,
    0,
  );
  const isProfit = totalPnLPct !== null && totalPnLPct > 0;
  const isLoss = totalPnLPct !== null && totalPnLPct < 0;
  const pnlColor = isProfit ? "var(--success)" : isLoss ? "var(--danger)" : "var(--text-secondary)";
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
    <ChartCard
      eyebrow="Investments"
      eyebrowIcon={<Zap />}
      title="Portfolio Overview"
      description="Allocation by priced current value"
      action={
        <Link
          href="/dashboard/investments"
          className="dashboard-card-action finance-focus"
          aria-label="Open investment details"
        >
          Details
          <ArrowRight size={11} />
        </Link>
      }
      legend={
        visibleInvestments.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {visibleInvestments.map((investment) => (
              <div
                key={investment.id}
                className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2 py-1"
              >
                <LegendIcon entry={investment} />
                <span className="truncate text-[9.5px] font-medium text-text-secondary">
                  {shortName(investment.name)}
                </span>
                <span
                  className="ml-auto shrink-0 text-[10px] font-bold tabular-nums"
                  style={{ color: investment.color }}
                >
                  {formatAllocation((investment.value / allocationTotalValue) * 100)}
                </span>
              </div>
            ))}
          </div>
        ) : null
      }
    >
      {allocationData.length === 0 ? (
        <div className="dashboard-chart-empty min-h-[142px]">
          <div>
            <span className="dashboard-chart-empty-icon">
              <Package size={16} />
            </span>
            <p className="text-xs font-semibold text-text-primary">{emptyTitle}</p>
            <p className="mt-1 text-[11px] text-text-secondary">{emptyDescription}</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[142px] flex-col items-center justify-center">
          <p className="sr-only">
            Priced portfolio value {allocationTotalValue}. Performance is {pnlLabel}.
            {unpricedCount > 0 ? ` ${unpricedCount} holdings are excluded because current pricing is unavailable.` : ""}
          </p>
          <div className="relative h-[132px] w-[132px]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 128, height: 128 }}>
              <PieChart accessibilityLayer>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={43}
                  outerRadius={60}
                  paddingAngle={3}
                  isAnimationActive
                  animationBegin={120}
                  animationDuration={760}
                  stroke="var(--card)"
                  strokeWidth={3}
                >
                  {allocationData.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "var(--border)",
                    background: "var(--card)",
                    color: "var(--text-primary)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Priced value"]}
                  labelFormatter={(label) => {
                    const item = allocationData.find((entry) => entry.name === label);
                    return item ? `${label} - ${formatAllocation((item.value / allocationTotalValue) * 100)}` : String(label);
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-[24px] grid place-items-center rounded-full border border-border bg-card text-center">
              <div>
                <p className="max-w-[4.8rem] truncate text-[13px] font-black leading-none text-text-primary tabular-nums">
                  <CountedAmount amount={formatCurrency(allocationTotalValue, { compact: true })} />
                </p>
                <p className="mt-1 text-[10px] font-bold leading-none tabular-nums" style={{ color: pnlColor }}>
                  {totalPnLPct === null ? pnlLabel : <CountedAmount amount={pnlLabel} />}
                </p>
                <p className="mt-1 text-[10px] font-semibold leading-none tracking-[0.1em] text-text-secondary">
                  priced value
                </p>
              </div>
            </div>
          </div>
          {unpricedCount > 0 ? (
            <p className="mt-1 text-center text-[10px] font-semibold leading-4 text-warning">
              {unpricedCount} unpriced {unpricedCount === 1 ? "holding" : "holdings"} excluded
            </p>
          ) : null}
        </div>
      )}
    </ChartCard>
  );
}
