"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import ChartCard from "@/components/dashboard/ChartCard";
import CountedAmount from "@/components/motion/CountedAmount";

interface Investment {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
}

const colors = ["#3b82f6", "#f59e0b", "#34d399", "#a855f7", "#64748b"];
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
  const rows = investments
    .map((investment, index) => {
      const value = Number(investment.quantity) * Number(investment.current_price);

      return {
        id: investment.id,
        name: investment.name,
        value: Number.isFinite(value) && value > 0 ? value : 0,
        color: colors[index % colors.length],
      };
    })
    .filter((investment) => investment.value > 0);

  if (rows.length > 0) return rows;

  return [
    { id: "cash", name: "Cash", value: 42, color: colors[0] },
    { id: "stocks", name: "Stocks", value: 34, color: colors[1] },
    { id: "funds", name: "Funds", value: 24, color: colors[2] },
  ];
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
    <Link
      href="/dashboard/investments"
      className="finance-focus group/investment-widget block h-full rounded-[21px]"
      aria-label="Open Investment Overview"
    >
      <ChartCard
        eyebrow="Investments"
        eyebrowIcon={<Zap />}
        title="Portfolio Overview"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[10px] font-semibold text-text-secondary transition-all group-hover/investment-widget:border-active/35 group-hover/investment-widget:text-active">
            View all
            <ArrowRight size={11} />
          </span>
        }
        legend={
          <div className="grid grid-cols-3 gap-2">
            {visibleInvestments.map((investment) => (
              <div
                key={investment.id}
                className="flex min-w-0 items-center gap-1.5"
              >
                <span
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: investment.color }}
                />
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
            <ResponsiveContainer width="100%" height="100%">
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
    </Link>
  );
}
