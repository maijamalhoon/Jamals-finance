"use client";

import CountUp from "react-countup";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap } from "lucide-react";
import type { CSSProperties } from "react";
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

function buildSegments(investments: Investment[]) {
  const values = investments.map((investment) =>
    Number(investment.quantity) * Number(investment.current_price),
  );
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return [
      { color: colors[0], size: 28, offset: 0 },
      { color: colors[1], size: 34, offset: 32 },
      { color: colors[2], size: 25, offset: 70 },
    ];
  }

  let cursor = 0;
  return values.map((value, index) => {
    const size = Math.max(10, (value / total) * 100);
    const segment = {
      color: colors[index % colors.length],
      size: Math.max(4, size - 3),
      offset: cursor,
    };
    cursor += size;
    return segment;
  });
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
  const segments = buildSegments(investments);

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
          eyebrow="Investments"
          eyebrowIcon={<Zap />}
          title="Portfolio Overview"
          legend={
            <div className="grid grid-cols-3 gap-2">
              {visibleInvestments.map((investment, index) => (
                <div
                  key={investment.id}
                  className="flex min-w-0 items-center gap-1.5"
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="truncate text-[10px] font-medium text-[#8d96a8] dark:text-text-secondary">
                    {shortName(investment.name)}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <div className="flex h-full min-h-[134px] items-center justify-center">
            <div className="relative h-[122px] w-[122px]">
              <svg
                className="-rotate-90"
                viewBox="0 0 120 120"
                role="img"
                aria-label="Investment allocation"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="42"
                  fill="none"
                  stroke="#edf1f7"
                  strokeWidth="18"
                />
                {segments.map((segment, index) => (
                  <circle
                    key={`${segment.color}-${index}`}
                    className="finance-donut-segment"
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    pathLength="100"
                    stroke={segment.color}
                    strokeDasharray={`${segment.size} ${100 - segment.size}`}
                    strokeDashoffset={-segment.offset}
                    strokeLinecap="butt"
                    strokeWidth="18"
                    style={
                      {
                        "--donut-segment-offset": -segment.offset,
                        animationDelay: `${index * 110}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </svg>
              <div className="absolute inset-[25px] grid place-items-center rounded-full bg-white text-center dark:bg-card">
                <div>
                  <p className="text-[20px] font-bold leading-none" style={{ color: pnlColor }}>
                    {isProfit ? "+" : "-"}
                    <CountUp end={Math.abs(totalPnLPct)} duration={1.1} decimals={1} />%
                  </p>
                  <p className="mt-1 text-[10px] font-semibold leading-none tracking-[0.14em] text-[#9aa3b5]">
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
