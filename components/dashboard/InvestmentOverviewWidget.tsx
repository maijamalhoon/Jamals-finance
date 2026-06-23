"use client";

import CountUp from "react-countup";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import ChartCard from "@/components/dashboard/ChartCard";

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
        className="block h-full"
      >
        <ChartCard
          eyebrow="Portfolio"
          title="Portfolio Donut"
          description="Current allocation mix"
          action={
            <div className="finance-status-info grid h-10 w-10 place-items-center rounded-[16px] border">
              <Sparkles size={16} />
            </div>
          }
          legend={
            <div className="grid grid-cols-3 gap-2">
              {visibleInvestments.map((investment, index) => (
                <div
                  key={investment.id}
                  className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2 py-1.5"
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="truncate text-[10px] font-semibold text-text-secondary">
                    {shortName(investment.name)}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <div className="flex h-full min-h-[160px] items-center justify-center">
            <div
              className="grid h-[138px] w-[138px] place-items-center rounded-full p-[15px] transition-transform duration-300 hover:scale-105"
              style={{ background: buildDonut(investments) }}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-card text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                <div>
                  <p
                    className="text-2xl font-bold leading-none"
                    style={{ color: pnlColor }}
                  >
                    {isProfit ? "+" : "-"}
                    <CountUp
                      end={Math.abs(totalPnLPct)}
                      duration={1.1}
                      decimals={1}
                    />
                    %
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                    total gain
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>
      </Link>
    </motion.div>
  );
}
