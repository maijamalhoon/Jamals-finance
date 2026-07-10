"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import CountedAmount from "@/components/motion/CountedAmount";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type MetricIconName = "wallet" | "income" | "expenses" | "investments";

interface MetricCardProps {
  title: string;
  subtitle?: string;
  amount: number | string;
  trend: {
    label: string;
    tone: "positive" | "negative" | "neutral";
  };
  iconName: MetricIconName;
  accentColor: string;
  progress: number;
}

const ICONS: Record<MetricIconName, typeof Wallet> = {
  wallet: Wallet,
  income: TrendingUp,
  expenses: TrendingDown,
  investments: Zap,
};

export default function MetricCard({
  title,
  subtitle,
  amount,
  trend,
  iconName,
  accentColor,
  progress,
}: MetricCardProps) {
  const { formatCurrency } = useCurrency();
  const Icon = ICONS[iconName];
  const lineWidth = Math.min(100, Math.max(8, progress));
  const displayAmount =
    typeof amount === "number" ? formatCurrency(amount) : amount;
  const trendColor =
    trend.tone === "positive" ? "var(--success)"
    : trend.tone === "negative" ? "var(--danger)"
    : "var(--text-secondary)";
  const TrendIcon =
    trend.tone === "positive" ? ArrowUpRight
    : trend.tone === "negative" ? ArrowDownRight
    : Minus;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="finance-panel finance-hover-lift relative flex min-h-[122px] flex-col overflow-hidden rounded-[22px] p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1.35 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute right-3 top-1 z-0 h-16 w-16 rounded-full blur-xl"
        style={{ backgroundColor: `${accentColor}0d` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <motion.div
          initial={{ rotate: -18, scale: 0.82 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid h-9 w-9 place-items-center rounded-2xl border shadow-[inset_0_1px_0_rgb(255_255_255_/_0.45)]"
          style={{
            color: accentColor,
            borderColor: `${accentColor}36`,
            background: `linear-gradient(180deg, ${accentColor}18, ${accentColor}0c)`,
          }}
        >
          <Icon size={15} strokeWidth={2.2} />
        </motion.div>

        <motion.span
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="inline-flex max-w-[8.5rem] items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold leading-none"
          style={{
            color: trendColor,
            borderColor: `color-mix(in srgb, ${trendColor}, transparent 72%)`,
            backgroundColor: `color-mix(in srgb, ${trendColor}, transparent 90%)`,
          }}
        >
          <TrendIcon size={11} />
          <span className="truncate">{trend.label}</span>
        </motion.span>
      </div>

      <div className="relative z-10 mt-4 flex flex-1 flex-col justify-end">
        <p className="text-[11px] font-semibold leading-4 text-text-secondary">{title}</p>

        <div className="mt-1.5 flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <p className="min-w-0 break-words text-[clamp(1.05rem,1.35vw,1.25rem)] font-black leading-tight tracking-tight text-text-primary [overflow-wrap:anywhere]">
            <CountedAmount amount={displayAmount} />
          </p>

          {subtitle ?
            <span className="w-fit shrink-0 rounded-full border border-border bg-surface-secondary/80 px-2.5 py-1 text-[10px] font-semibold leading-none text-text-secondary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.32)]">
              {subtitle}
            </span>
          : null}
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full bg-border/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${lineWidth}%` }}
          transition={{
            duration: 1.05,
            delay: 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="h-full rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </motion.article>
  );
}
