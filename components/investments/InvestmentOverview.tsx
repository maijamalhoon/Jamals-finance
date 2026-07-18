"use client";

import { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Brain,
  Building2,
  Coins,
  LucideIcon,
  Package,
  PieChart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { getInvestmentGroupKey } from "@/lib/investments/aggregation";
import type { AggregatedInvestment } from "@/lib/investments/aggregation";
import InvestmentCard from "./InvestmentCard";
import { ExistingInvestment } from "./InvestmentModal";

const TYPE_META: Record<string, { label: string; color: string }> = {
  crypto: { label: "Crypto", color: "var(--warning)" },
  stocks: { label: "Stocks", color: "var(--info)" },
  savings: { label: "Savings", color: "var(--success)" },
  real_estate: { label: "Real Estate", color: "var(--investment)" },
  other: { label: "Other", color: "var(--text-secondary)" },
};

const HOLDING_ICON_MAP: Record<string, LucideIcon> = {
  crypto: Coins,
  stocks: TrendingUp,
  savings: Banknote,
  real_estate: Building2,
  other: Package,
};

interface Insight {
  type: "positive" | "warning" | "tip";
  title: string;
  message: string;
}

function getTypeLabel(type: string) {
  return TYPE_META[type]?.label ?? TYPE_META.other.label;
}

function HoldingAvatar({ holding }: { holding: AggregatedInvestment }) {
  const Icon = HOLDING_ICON_MAP[holding.type] ?? Package;

  return (
    <span
      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-surface-secondary"
      style={{ color: holding.color }}
      title={holding.name}
    >
      <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "default" | "profit" | "loss";
}) {
  const toneClass =
    tone === "profit"
      ? "text-success"
      : tone === "loss"
        ? "text-danger"
        : "text-text-primary";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="summary-card flex min-h-[118px] min-w-0 flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[14px] bg-surface-secondary text-active">
          <Icon size={16} />
        </span>
      </div>
      <div className="min-w-0">
        <p
          className={`break-words text-xl font-bold tracking-normal [overflow-wrap:anywhere] ${toneClass}`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{helper}</p>
      </div>
    </motion.article>
  );
}

function PortfolioSummaryGrid({
  totalInvested,
  totalValue,
  totalPnL,
  totalPnLPct,
  count,
}: {
  totalInvested: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPct: number;
  count: number;
}) {
  const { formatCurrency } = useCurrency();
  const isProfit = totalPnL >= 0;

  return (
    <section
      aria-label="Portfolio summary"
      data-mobile-summary-grid
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
    >
      <SummaryMetric
        label="Total Invested"
        value={formatCurrency(totalInvested)}
        helper="Cost basis"
        icon={WalletCards}
      />
      <SummaryMetric
        label="Current Value"
        value={formatCurrency(totalValue)}
        helper="Latest portfolio value"
        icon={TrendingUp}
      />
      <SummaryMetric
        label="Total Profit/Loss"
        value={`${isProfit ? "+" : "-"}${formatCurrency(Math.abs(totalPnL))}`}
        helper={`${isProfit ? "+" : "-"}${Math.abs(totalPnLPct).toFixed(1)}% overall`}
        icon={isProfit ? ArrowUpRight : ArrowDownRight}
        tone={isProfit ? "profit" : "loss"}
      />
      <SummaryMetric
        label="Total Holdings"
        value={String(count)}
        helper={count === 1 ? "Tracked asset" : "Tracked assets"}
        icon={Coins}
      />
    </section>
  );
}

function PerformanceSection({
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
  const isProfit = totalPnL >= 0;
  const liveCount = groupedHoldings.filter((holding) => holding.is_live_priced)
    .length;
  const manualCount = groupedHoldings.length - liveCount;
  const allocation = useMemo(() => {
    return groupedHoldings
      .map((holding) => ({
        ...holding,
        percent: totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0,
      }))
      .slice(0, 4);
  }, [groupedHoldings, totalValue]);
  const largestHolding = groupedHoldings[0];
  const performanceMessage = isProfit
    ? "Portfolio is ahead of cost basis. Keep an eye on concentration before adding more exposure."
    : "Portfolio is below cost basis. Review position sizing and fresh entries before increasing risk.";

  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Portfolio performance">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="finance-reference-card min-h-[230px] p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-active">
              <Sparkles size={13} />
              Portfolio Performance
            </div>
            <p
              className={`mt-4 flex items-center gap-2 text-4xl font-bold tracking-normal ${
                isProfit ? "text-success" : "text-danger"
              }`}
            >
              {isProfit ? <ArrowUpRight size={26} /> : <ArrowDownRight size={26} />}
              {isProfit ? "+" : "-"}
              <CountUp end={Math.abs(totalPnLPct)} duration={1} decimals={1} />%
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              isProfit
                ? "border-success/25 bg-success/10 text-success"
                : "border-danger/25 bg-danger/10 text-danger"
            }`}
          >
            {isProfit ? "In profit" : "Below cost"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="finance-panel-soft min-w-0 p-4">
            <p className="text-xs text-text-secondary">Total P/L</p>
            <p
              className={`mt-1 break-words text-lg font-bold [overflow-wrap:anywhere] ${
                isProfit ? "text-success" : "text-danger"
              }`}
            >
              {isProfit ? "+" : "-"}
              {formatCurrency(Math.abs(totalPnL))}
            </p>
          </div>
          <div className="finance-panel-soft min-w-0 p-4">
            <p className="text-xs text-text-secondary">Current vs invested</p>
            <p className="mt-1 break-words text-lg font-bold text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(totalValue)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              against {formatCurrency(totalInvested)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-text-secondary">
          {performanceMessage}
        </p>
      </motion.article>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        className="finance-reference-card min-h-[230px] p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-active">
              <PieChart size={13} />
              Allocation
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {liveCount} live priced, {manualCount} manual
            </p>
          </div>
          {largestHolding ? (
            <div className="min-w-0 text-right">
              <p className="text-[11px] text-text-secondary">Largest holding</p>
              <p className="truncate text-sm font-semibold text-text-primary">
                {largestHolding.name}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {allocation.map((item) => {
            return (
              <div key={item.groupKey} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <HoldingAvatar holding={item} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-text-primary">
                        {item.name}
                      </p>
                      <p className="text-[10px] uppercase text-text-secondary">
                        {item.symbol ?? getTypeLabel(item.type)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, Math.min(100, item.percent))}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  {formatCurrency(item.currentValue)}
                </p>
              </div>
            );
          })}
        </div>
      </motion.article>
    </section>
  );
}

function EmbeddedInsightCard({ investments }: { investments: ExistingInvestment[] }) {
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
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStatus("unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="finance-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[16px] bg-surface-secondary text-active">
          <Brain size={17} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">AI Insights</p>
            {!loading && status === "unavailable" ? (
              <span className="rounded-full bg-surface-secondary px-2 py-1 text-[10px] font-semibold text-text-secondary">
                Unavailable
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {loading
              ? "Reading your latest portfolio and cash-flow signals..."
              : message}
          </p>
          {!loading && insight?.title ? (
            <p className="mt-1 text-xs font-semibold text-active">
              {insight.title}
            </p>
          ) : null}
        </div>
      </div>
      <Link
        href="/dashboard/ai-insights"
        className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] border border-border bg-surface-secondary px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-hover"
      >
        View more
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
    <div className="space-y-5">
      <PortfolioSummaryGrid
        totalInvested={totalInvested}
        totalValue={totalValue}
        totalPnL={totalPnL}
        totalPnLPct={totalPnLPct}
        count={groupedHoldings.length}
      />

      <PerformanceSection
        groupedHoldings={groupedHoldings}
        totalInvested={totalInvested}
        totalValue={totalValue}
        totalPnL={totalPnL}
        totalPnLPct={totalPnLPct}
      />

      <EmbeddedInsightCard investments={investments} />

      <section className="space-y-3" aria-label="Investment holdings">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Investment Holdings
            </h3>
            <p className="text-sm text-text-secondary">
              Crypto, international stocks, and manual assets in one aligned view.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
            {groupedHoldings.length} grouped
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
