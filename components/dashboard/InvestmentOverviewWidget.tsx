"use client";

import CountUp from "react-countup";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Investment {
  id: string;
  name: string;
  type: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
}

const colors = ["#3b82f6", "#f59e0b", "#34d399", "#a855f7", "#64748b"];
const profitColor = "#16a34a";
const lossColor = "#dc2626";

function shortName(name: string) {
  return name.length > 11 ? `${name.slice(0, 9)}...` : name;
}

function buildDonut(investments: Investment[]) {
  const values = investments.map((investment) =>
    Number(investment.quantity) * Number(investment.current_price),
  );
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return "conic-gradient(#3b82f6 0deg 120deg, #f59e0b 120deg 245deg, #34d399 245deg 360deg)";
  }

  let cursor = 0;
  return `conic-gradient(${values
    .map((value, index) => {
      const start = cursor;
      const size = Math.max(18, (value / total) * 360);
      cursor += size;
      return `${colors[index % colors.length]} ${start}deg ${Math.min(cursor, 360)}deg`;
    })
    .join(", ")})`;
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
  const visibleInvestments = investments.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Link
        href="/dashboard/investments"
        className="block h-full min-h-[260px] rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.055]"
      >
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-500">
            <Sparkles size={12} />
            Investments
          </div>
          <h3 className="mt-1 text-base font-semibold text-text-primary">
            Portfolio Overview
          </h3>
        </div>

        <div className="flex justify-center">
          <div
            className="grid h-[116px] w-[116px] place-items-center rounded-full p-[14px] transition-transform duration-300 hover:scale-105"
            style={{ background: buildDonut(investments) }}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-card text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: pnlColor }}>
                  {isProfit ? "+" : "-"}
                  <CountUp end={Math.abs(totalPnLPct)} duration={1.1} decimals={1} />%
                </p>
                <p className="mt-1 text-[10px] font-medium tracking-[0.18em] text-text-secondary">
                  total gain
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {visibleInvestments.map((investment, index) => (
            <div key={investment.id} className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate text-[10px] font-medium text-text-secondary">
                {shortName(investment.name)}
              </span>
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
