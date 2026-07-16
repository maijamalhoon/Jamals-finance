"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartFrame from "@/components/ui/chart-frame";
import { chartMotion } from "@/components/motion/animation-config";
import CountedAmount from "@/components/motion/CountedAmount";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

export default function SpendRecordWidget({
  monthlySpend,
  dailySpend,
  dailyExpenseTrend,
  status,
}: {
  monthlySpend: number | string | null;
  dailySpend: number | string | null;
  dailyExpenseTrend: number[];
  status: DashboardAvailability;
}) {
  const { formatCurrency } = useCurrency();
  const data = useMemo(
    () =>
      dailyExpenseTrend.map((value, index) => ({
        day: index + 1,
        spend: Number.isFinite(Number(value)) ? Number(value) : 0,
      })),
    [dailyExpenseTrend],
  );
  const hasSpendData = data.some((point) => point.spend > 0);
  const peakPoint = useMemo(() => {
    const peak = data.reduce(
      (best, point) => (point.spend > best.spend ? point : best),
      data[0] ?? { day: 1, spend: 0 },
    );
    const uniqueValues = new Set(data.map((point) => point.spend));

    return peak.spend > 0 && uniqueValues.size > 1 ? peak : null;
  }, [data]);
  const displaySpend =
    monthlySpend === null ? "Unavailable"
    : typeof monthlySpend === "number" ?
      formatCurrency(monthlySpend)
    : monthlySpend;
  const displayDailyAverage =
    dailySpend === null ? "Unavailable"
    : typeof dailySpend === "number" ? formatCurrency(dailySpend)
    : dailySpend;

  return (
    <ChartCard
      eyebrow="Spend Record"
      eyebrowIcon={<Activity />}
      title="Month-to-Date"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="pt-1">
          <p className="text-[25px] font-semibold leading-none tracking-normal text-[var(--dashboard-chart-spend)]">
            {monthlySpend === null ? displaySpend : <CountedAmount amount={displaySpend} duration={0.85} />}
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-text-secondary">
            {status === "available" ? `${displayDailyAverage} daily average across elapsed days` : "Spend data is temporarily unavailable"}
          </p>
        </div>

        {status === "unavailable" ? (
          <div className="dashboard-chart-empty mt-auto h-[118px] min-h-[118px]">
            <div>
              <span className="dashboard-chart-empty-icon">
                <Activity size={16} />
              </span>
              <p className="text-xs font-semibold text-text-primary">Spend record unavailable</p>
              <p className="mt-1 text-[11px] text-text-secondary">Refresh to try loading it again.</p>
            </div>
          </div>
        ) : hasSpendData ? (
          <ChartFrame
            className="mt-auto h-[118px] min-h-[118px] min-w-0 overflow-hidden"
            tone="orange"
          >
            {({ width, height }) => (
              <AreaChart
                accessibilityLayer
                data={data}
                height={height}
                margin={{ top: 16, right: 2, left: 2, bottom: 2 }}
                width={width}
              >
                <defs>
                  <linearGradient
                    id="spendRecordFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--dashboard-chart-spend)"
                      stopOpacity={0.24}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--dashboard-chart-spend)"
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis hide domain={[0, "dataMax"]} />
                <Tooltip
                  cursor={{
                    stroke: "var(--dashboard-chart-grid)",
                    strokeDasharray: "4 5",
                  }}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    background: "var(--card)",
                    color: "var(--text-primary)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Spend",
                  ]}
                  labelFormatter={(label) => `Day ${label}`}
                />
                {peakPoint ? (
                  <ReferenceDot
                    x={peakPoint.day}
                    y={peakPoint.spend}
                    r={4.5}
                    fill="var(--dashboard-chart-spend)"
                    stroke="var(--card)"
                    strokeWidth={2.5}
                    ifOverflow="extendDomain"
                  />
                ) : null}
                <Area
                  type="monotone"
                  dataKey="spend"
                  activeDot={false}
                  dot={false}
                  stroke="var(--dashboard-chart-spend)"
                  strokeLinecap="round"
                  strokeWidth={2.7}
                  fill="url(#spendRecordFill)"
                  baseValue={0}
                  isAnimationActive
                  {...chartMotion}
                />
              </AreaChart>
            )}
          </ChartFrame>
        ) : (
          <div className="dashboard-chart-empty mt-auto h-[118px] min-h-[118px]">
            <div>
              <span className="dashboard-chart-empty-icon">
                <Activity size={16} />
              </span>
              <p className="text-xs font-semibold text-text-primary">No spend yet</p>
              <p className="mt-1 text-[11px] text-text-secondary">This month is clear.</p>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
