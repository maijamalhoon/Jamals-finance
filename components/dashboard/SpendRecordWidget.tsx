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
      eyebrowIcon={<Activity />}
      title="Month-to-Date"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="-mt-1">
          <p className="text-[24px] font-semibold leading-none text-[#ff9700]">
            {dailySpend.replace(/^PKR\s+/, "PKR")}
          </p>
          <p className="mt-1 text-[13px] leading-none text-[#9aa3b5]">
            daily average
          </p>
        </div>

        <ChartFrame className="mt-auto h-[120px] min-h-[120px] min-w-0 overflow-hidden" tone="orange">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={data} margin={{ top: 10, right: 1, left: 1, bottom: 0 }}>
              <defs>
                <linearGradient id="spendRecordFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9700" stopOpacity={0.18} />
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
                stroke="#ff9700"
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
