"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import CountedAmount from "@/components/motion/CountedAmount";

type MetricIconName = "wallet" | "income" | "expenses" | "investments";

interface MetricCardProps {
  title: string;
  subtitle?: string;
  amount: string;
  change: number;
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
  change,
  iconName,
  accentColor,
  progress,
}: MetricCardProps) {
  const Icon = ICONS[iconName];
  const positive = change >= 0;
  const lineWidth = Math.min(100, Math.max(8, progress));
  const displayAmount = amount.replace(/^PKR\s+/, "PKR");

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="finance-panel finance-hover-lift relative min-h-[96px] overflow-hidden rounded-[22px] p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1.35 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute right-4 top-2 z-0 h-14 w-14 rounded-full blur-lg"
        style={{ backgroundColor: `${accentColor}0d` }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <motion.div
          initial={{ rotate: -18, scale: 0.82 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid h-8 w-8 place-items-center rounded-2xl border"
          style={{
            color: accentColor,
            borderColor: `${accentColor}30`,
            backgroundColor: `${accentColor}12`,
          }}
        >
          <Icon size={15} strokeWidth={2.2} />
        </motion.div>

        <motion.span
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
          style={{
            color: positive ? "var(--success)" : "var(--danger)",
            backgroundColor:
              positive ?
                "color-mix(in srgb, var(--success), transparent 88%)"
              : "color-mix(in srgb, var(--danger), transparent 88%)",
          }}
        >
          {positive ?
            <ArrowUpRight size={11} />
          : <ArrowDownRight size={11} />}
          {positive ? "+" : "-"}
          {Math.abs(change).toFixed(1)}%
        </motion.span>
      </div>

      <div className="relative z-10 mt-3">
        <p className="text-[11px] font-semibold text-text-secondary">{title}</p>

        <div className="mt-1 flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <p className="min-w-0 break-words text-[clamp(1.05rem,1.35vw,1.25rem)] font-black leading-tight tracking-tight text-text-primary [overflow-wrap:anywhere]">
            <CountedAmount amount={displayAmount} />
          </p>

          {subtitle ?
            <span className="w-fit shrink-0 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[10px] font-semibold leading-none text-text-secondary">
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
