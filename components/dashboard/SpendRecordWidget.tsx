"use client";

import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartFrame from "@/components/ui/chart-frame";
import { chartMotion } from "@/components/motion/animation-config";

export default function SpendRecordWidget({
  dailySpend,
  dailyExpenseTrend,
}: {
  dailySpend: string;
  dailyExpenseTrend: number[];
}) {
  const data = dailyExpenseTrend.map((value, index) => ({
    day: index + 1,
    spend: value,
  }));

  return (
    <ChartCard
      eyebrow="Spend Record"
      title="Month-to-Date"
      description="Daily expense velocity"
      action={
        <div className="finance-status-warning grid h-10 w-10 place-items-center rounded-[16px] border">
          <Activity size={17} />
        </div>
      }
      legend={
        <div className="flex items-end justify-between gap-3 rounded-[18px] border border-border bg-surface-secondary p-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
              Daily average
            </p>
            <p className="mt-1 text-xl font-bold text-warning">{dailySpend}</p>
          </div>
          <span className="rounded-full bg-warning/10 px-3 py-1 text-[11px] font-bold text-warning">
            MTD
          </span>
        </div>
      }
    >
      <div className="h-[178px]">
        <ChartFrame className="h-full min-h-[178px] min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={data} margin={{ top: 8, right: 6, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="spendRecordFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  background: "var(--card)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-soft)",
                }}
                formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, "Spend"]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Area
                type="monotone"
                dataKey="spend"
                stroke="#f59e0b"
                strokeWidth={3}
                fill="url(#spendRecordFill)"
                isAnimationActive
                {...chartMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </ChartCard>
  );
}
