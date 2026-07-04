"use client";

import Link from "next/link";
import { ArrowRight, Package, Zap } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import ChartCard from "@/components/dashboard/ChartCard";
import CountedAmount from "@/components/motion/CountedAmount";
import {
  aggregateInvestmentHoldings,
  getAssetInitials,
} from "@/lib/investments/aggregation";
import type { AggregatedInvestment } from "@/lib/investments/aggregation";

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

const profitColor = "var(--success)";
const lossColor = "var(--danger)";

function shortName(name: string) {
  return name.length > 11 ? `${name.slice(0, 9)}...` : name;
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;

  return `PKR ${safeValue.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

function buildAllocationData(investments: Investment[]) {
  const rows = aggregateInvestmentHoldings(investments)
    .map((holding) => ({
      id: holding.groupKey,
      name: holding.name,
      symbol: holding.symbol,
      imageUrl: holding.image_url,
      value: Number.isFinite(holding.currentValue) ? holding.currentValue : 0,
      color: holding.color,
      holding,
    }))
    .filter((holding) => holding.value > 0);

  if (rows.length > 0) return rows;

  return [
    {
      id: "unpriced",
      name: "Unpriced",
      symbol: null,
      imageUrl: null,
      value: 1,
      color: "#64748b",
      holding: null,
    },
  ];
}

function LegendIcon({
  entry,
}: {
  entry: {
    name: string;
    symbol: string | null;
    imageUrl: string | null;
    color: string;
    holding: AggregatedInvestment | null;
  };
}) {
  if (entry.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.imageUrl}
        alt=""
        className="h-5 w-5 flex-shrink-0 rounded-full"
      />
    );
  }

  if (!entry.holding) {
    return (
      <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-surface-secondary text-text-secondary">
        <Package size={11} />
      </span>
    );
  }

  return (
    <span
      className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-[8.5px] font-bold text-white"
      style={{ backgroundColor: entry.color }}
    >
      {getAssetInitials(entry.name, entry.symbol)}
    </span>
  );
}

export default function InvestmentOverviewWidget({
  investments,
  totalPnLPct,
}: {
  investments: Investment[];
  totalPnLPct: number;
}) {
  const isProfit = totalPnLPct >= 0;
  const pnlColor = isProfit ? profitColor : lossColor;
  const allocationData = buildAllocationData(investments);
  const visibleInvestments = allocationData.slice(0, 3);
  const chartKey = allocationData
    .map((investment) => `${investment.id}-${investment.value}`)
    .join("-");

  return (
    <div className="h-full rounded-[21px]">
      <ChartCard
        eyebrow="Investments"
        eyebrowIcon={<Zap />}
        title="Portfolio Overview"
        action={
          <Link
            href="/dashboard/investments"
            className="finance-focus inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[10px] font-semibold text-text-secondary transition-all hover:border-active/35 hover:text-active"
            aria-label="Open Investment Overview details"
          >
            Details
            <ArrowRight size={11} />
          </Link>
        }
        legend={
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {visibleInvestments.map((investment) => (
              <div
                key={investment.id}
                className="flex min-w-0 items-center gap-1.5 rounded-full bg-surface-secondary/60 px-1.5 py-1"
              >
                <LegendIcon entry={investment} />
                <span className="truncate text-[9.5px] font-medium text-[#8d96a8] dark:text-text-secondary">
                  {shortName(investment.name)}
                </span>
              </div>
            ))}
          </div>
        }
      >
        <div className="flex h-full min-h-[142px] items-center justify-center">
          <div className="relative h-[128px] w-[128px]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 128, height: 128 }}>
              <PieChart key={chartKey}>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={58}
                  paddingAngle={2}
                  isAnimationActive
                  animationBegin={160}
                  animationDuration={1150}
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
                    "Value",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-[25px] grid place-items-center rounded-full bg-card text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.55)] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)]">
              <div>
                <p
                  className="text-[19px] font-bold leading-none"
                  style={{ color: pnlColor }}
                >
                  <CountedAmount
                    amount={`${isProfit ? "+" : "-"}${Math.abs(totalPnLPct).toFixed(1)}%`}
                  />
                </p>
                <p className="mt-1 text-[9.5px] font-semibold leading-none tracking-[0.12em] text-[#9aa3b5]">
                  {isProfit ? "total gain" : "total loss"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
