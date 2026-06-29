"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Pencil,
  Sparkles,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import InvestmentModal, { ExistingInvestment } from "./InvestmentModal";

const TYPE_META: Record<string, { label: string; color: string }> = {
  crypto: { label: "Crypto", color: "#f59e0b" },
  stocks: { label: "Stocks", color: "#3b82f6" },
  savings: { label: "Savings", color: "#22c55e" },
  real_estate: { label: "Real Estate", color: "#a855f7" },
  other: { label: "Other", color: "#64748b" },
};

const ringTrack = "color-mix(in srgb, var(--border), transparent 12%)";
const profitColor = "#16a34a";
const lossColor = "#dc2626";

interface Insight {
  type: "positive" | "warning" | "tip";
  title: string;
  message: string;
}

function formatCurrency(value: number) {
  return `PKR ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function shortCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `PKR ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `PKR ${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

function AnimatedCurrency({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const absValue = Math.abs(value);
  const { formatCurrency } = useCurrency();

  if (compact && absValue >= 1_000_000) {
    return <>{formatCurrency(value, { compact: true })}</>;
  }

  if (compact && absValue >= 1_000) {
    return <>{formatCurrency(value, { compact: true })}</>;
  }

  return (
    <>
      {formatCurrency(value)}
    </>
  );
}

function ProgressRing({
  size = 160,
  stroke = 10,
  progress,
  color,
  accent,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color: string;
  accent: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = Math.max(0.08, Math.min(0.94, progress));

  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 -rotate-90 overflow-visible"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringTrack}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={Math.max(3, stroke - 5)}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: reduceMotion
              ? circumference * 0.72
              : circumference * 0.72,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.75, delay: 0.12 }}
          opacity={0.35}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference * (1 - normalizedProgress),
          }}
          transition={{
            duration: reduceMotion ? 0 : 1.05,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </svg>
      <div className="grid h-[calc(100%-28px)] w-[calc(100%-28px)] place-items-center rounded-full border border-border bg-card/95 p-4 text-center shadow-[var(--surface-highlight)]">
        {children}
      </div>
    </div>
  );
}

function InvestmentDonut({
  investment,
  index,
}: {
  investment: ExistingInvestment;
  index: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const quantity = Number(investment.quantity);
  const invested = quantity * Number(investment.purchase_price);
  const currentValue = quantity * Number(investment.current_price);
  const pnl = currentValue - invested;
  const pct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isProfit = pnl >= 0;
  const color = isProfit ? profitColor : lossColor;
  const accent = TYPE_META[investment.type]?.color ?? TYPE_META.other.color;
  const ringProgress = Math.max(0.14, Math.min(0.92, Math.abs(pct) / 100));

  async function handleDelete() {
    if (!confirm(`Delete "${investment.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await supabase.from("investments").delete().eq("id", investment.id);
    router.refresh();
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -5 }}
        className="finance-reference-card finance-hover-lift group relative flex min-h-[286px] min-w-0 flex-col p-5"
      >
        <div className="absolute right-4 top-4 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="icon-button h-8 w-8"
            aria-label="Edit investment"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="icon-button h-8 w-8 hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
            aria-label="Delete investment"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <ProgressRing
            progress={ringProgress}
            color={color}
            accent={accent}
            size={150}
            stroke={10}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {investment.name}
              </p>
              <p className="mt-1 break-words text-[11px] font-medium text-text-secondary [overflow-wrap:anywhere]">
                {shortCurrency(currentValue)}
              </p>
              <div
                className="mt-2 flex items-center justify-center gap-1 text-sm font-bold"
                style={{ color }}
              >
                {isProfit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>
                  {isProfit ? "+" : "-"}
                  <CountUp end={Math.abs(pct)} duration={1.1} decimals={1} />%
                </span>
              </div>
            </div>
          </ProgressRing>
        </div>

        <div className="mt-4 w-full space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex max-w-[58%] min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: `${accent}33`,
                backgroundColor: `${accent}14`,
                color: accent,
              }}
            >
              <span className="truncate">
                {TYPE_META[investment.type]?.label ?? "Other"}
              </span>
            </span>
            <span className="min-w-0 truncate text-xs font-semibold" style={{ color }}>
              {isProfit ? "+" : "-"}
              {shortCurrency(Math.abs(pnl)).replace("PKR ", "")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="finance-panel-soft min-w-0 p-3">
              <p className="text-[11px] text-text-secondary">Invested</p>
              <p className="mt-1 break-words text-xs font-bold text-text-primary [overflow-wrap:anywhere]">
                {shortCurrency(invested)}
              </p>
            </div>
            <div className="finance-panel-soft min-w-0 p-3">
              <p className="text-[11px] text-text-secondary">Current</p>
              <p className="mt-1 break-words text-xs font-bold text-text-primary [overflow-wrap:anywhere]">
                {shortCurrency(currentValue)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <InvestmentModal
        open={editOpen}
        investment={investment}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function PortfolioSummary({
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
  const isProfit = totalPnL >= 0;
  const color = isProfit ? profitColor : lossColor;
  const ringProgress = Math.max(0.1, Math.min(0.92, Math.abs(totalPnLPct) / 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="finance-reference-card overflow-hidden p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-active">
            <Sparkles size={13} />
            Investment Overview
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text-primary sm:text-3xl">
            Portfolio Overview
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {count} holding{count === 1 ? "" : "s"} tracked with live value and profit signals.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
          <div className="rounded-[22px] border border-border bg-surface-secondary p-4">
            <p className="text-[11px] font-medium text-text-secondary">Total invested</p>
            <p className="mt-2 break-words text-lg font-bold text-text-primary [overflow-wrap:anywhere]">
              <AnimatedCurrency value={totalInvested} />
            </p>
          </div>
          <div className="rounded-[22px] border border-border bg-surface-secondary p-4">
            <p className="text-[11px] font-medium text-text-secondary">Current value</p>
            <p className="mt-2 break-words text-lg font-bold text-text-primary [overflow-wrap:anywhere]">
              <AnimatedCurrency value={totalValue} />
            </p>
          </div>
          <div className="rounded-[22px] border border-border bg-surface-secondary p-4">
            <p className="text-[11px] font-medium text-text-secondary">Total profit/loss</p>
            <p className="mt-2 flex min-w-0 items-center gap-1 break-words text-lg font-bold [overflow-wrap:anywhere]" style={{ color }}>
              {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              {isProfit ? "+" : "-"}
              <AnimatedCurrency value={Math.abs(totalPnL)} />
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 border-t border-border pt-5 lg:flex-row lg:items-center">
        <div className="mx-auto flex-shrink-0 lg:mx-0">
          <ProgressRing
            progress={ringProgress}
            color={color}
            accent="var(--active)"
            size={144}
            stroke={11}
          >
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color }}>
                {isProfit ? "+" : "-"}
                <CountUp end={Math.abs(totalPnLPct)} duration={1.25} decimals={1} />%
              </p>
              <p className="text-[11px] text-text-secondary">overall</p>
            </div>
          </ProgressRing>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="finance-panel-soft p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[18px] bg-surface-secondary text-active">
              <WalletCards size={18} />
            </div>
            <p className="text-sm font-semibold text-text-primary">Portfolio value</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Current value is {formatCurrency(totalValue)} against {formatCurrency(totalInvested)} invested.
            </p>
          </div>
          <div className="finance-panel-soft p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[18px] bg-surface-secondary text-active">
              <TrendingUp size={18} />
            </div>
            <p className="text-sm font-semibold text-text-primary">Momentum</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {isProfit
                ? "Portfolio is currently in profit. Keep checking concentrated positions."
                : "Portfolio is below cost basis. Review entries before adding more exposure."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmbeddedInsightCard({ investments }: { investments: ExistingInvestment[] }) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const cryptoValue = useMemo(
    () =>
      investments
        .filter((investment) => investment.type === "crypto")
        .reduce(
          (sum, investment) =>
            sum + Number(investment.quantity) * Number(investment.current_price),
          0,
        ),
    [investments],
  );
  const totalValue = useMemo(
    () =>
      investments.reduce(
        (sum, investment) =>
          sum + Number(investment.quantity) * Number(investment.current_price),
        0,
      ),
    [investments],
  );
  const cryptoPct = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;
  const fallbackSuggestion =
    cryptoPct > 45
      ? "Your crypto allocation is high risk. Consider balancing with steadier holdings."
      : "Your allocation looks balanced. Keep monitoring profit concentration by asset type.";

  useEffect(() => {
    fetch("/api/ai-insights")
      .then((response) => response.json())
      .then((json) => {
        if (!json.error && json.insights?.[0]) setInsight(json.insights[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="finance-reference-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-[18px] bg-surface-secondary text-active">
              <Brain size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">AI Insights</p>
              <p className="text-[11px] text-text-secondary">Portfolio suggestion</p>
            </div>
          </div>
          <ArrowRight size={15} className="text-text-secondary" />
        </div>
        <p className="text-sm leading-6 text-text-primary">
          {loading
            ? "Reading your latest portfolio and cash-flow signals..."
            : insight?.message ?? fallbackSuggestion}
        </p>
        {insight?.title && (
          <p className="mt-2 text-xs font-semibold text-active">
            {insight.title}
          </p>
        )}
        <Link
          href="/dashboard/ai-insights"
          className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-[16px] border border-border bg-surface-secondary px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-hover"
        >
          View more
          <ArrowRight size={12} />
        </Link>
      </div>
    </motion.div>
  );
}

export default function InvestmentOverview({
  investments,
  totalInvested,
  totalValue,
  totalPnL,
  totalPnLPct,
}: {
  investments: ExistingInvestment[];
  totalInvested: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPct: number;
}) {
  return (
    <div className="space-y-5">
      <PortfolioSummary
        totalInvested={totalInvested}
        totalValue={totalValue}
        totalPnL={totalPnL}
        totalPnLPct={totalPnLPct}
        count={investments.length}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {investments.map((investment, index) => (
            <InvestmentDonut
              key={investment.id}
              investment={investment}
              index={index}
            />
          ))}
        </div>
        <EmbeddedInsightCard investments={investments} />
      </div>
    </div>
  );
}
