"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Activity, TrendingUp } from "@/components/icons/jalvoro/compat";
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

const AMBIENT_SWEEP_DURATION = "9s";
const SPEND_CHART_LIGHT =
  "color-mix(in srgb, var(--danger) 74%, white 26%)";

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
  const [isAmbientMotionReady, setIsAmbientMotionReady] = useState(false);
  const gradientPrefix = useId().replace(/:/g, "");
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
    monthlySpend === null
      ? "Unavailable"
      : typeof monthlySpend === "number"
        ? formatCurrency(monthlySpend)
        : monthlySpend;
  const displayDailyAverage =
    dailySpend === null
      ? "Unavailable"
      : typeof dailySpend === "number"
        ? formatCurrency(dailySpend)
        : dailySpend;

  useEffect(() => {
    setIsAmbientMotionReady(false);

    if (
      status !== "available" ||
      !hasSpendData ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let delayTimer = 0;

    const scheduleAmbientMotion = () => {
      const fontsReady = document.fonts?.ready ?? Promise.resolve();

      void fontsReady.then(() => {
        if (cancelled) return;

        firstFrame = window.requestAnimationFrame(() => {
          secondFrame = window.requestAnimationFrame(() => {
            delayTimer = window.setTimeout(() => {
              if (!cancelled) setIsAmbientMotionReady(true);
            }, chartMotion.animationDuration + 240);
          });
        });
      });
    };

    if (document.readyState === "complete") {
      scheduleAmbientMotion();
    } else {
      window.addEventListener("load", scheduleAmbientMotion, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleAmbientMotion);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(delayTimer);
    };
  }, [data, hasSpendData, status]);

  return (
    <ChartCard eyebrow="Spend Record" eyebrowIcon={<Activity />} className="relative">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="pt-1">
          <p className="text-[clamp(1.65rem,5vw,2.15rem)] font-black leading-none tracking-[-0.035em] text-text-primary tabular-nums [overflow-wrap:anywhere]">
            {monthlySpend === null ? (
              displaySpend
            ) : (
              <CountedAmount amount={displaySpend} duration={0.85} />
            )}
          </p>
          <div className="mt-2 inline-flex max-w-full items-center gap-2 border border-transparent bg-transparent px-2.5 py-1 text-[10px] font-semibold text-text-secondary sm:text-[11px]">
            <TrendingUp
              size={13}
              className="shrink-0 text-danger"
              aria-hidden="true"
            />
            <span className="truncate">
              {status === "available"
                ? `${displayDailyAverage} daily average`
                : "Spend data is temporarily unavailable"}
            </span>
          </div>
        </div>

        {status === "unavailable" ? (
          <div className="dashboard-chart-empty mt-4 h-[132px] min-h-[132px]">
            <div>
              <span className="dashboard-chart-empty-icon">
                <Activity size={16} />
              </span>
              <p className="text-xs font-semibold text-text-primary">
                Spend record unavailable
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                Refresh to try loading it again.
              </p>
            </div>
          </div>
        ) : hasSpendData ? (
          <div className="mt-4 border border-transparent bg-transparent p-2.5 shadow-none sm:p-3">
            <ChartFrame
              className="h-[124px] min-h-[124px] min-w-0 overflow-hidden sm:h-[138px] sm:min-h-[138px]"
              tone="danger"
            >
              {({ width, height }) => {
                const sheenId = `${gradientPrefix}-spend-sheen`;
                const sheenWidth = Math.round(
                  Math.min(Math.max(width * 0.07, 22), 36),
                );
                const sheenStart = -sheenWidth;
                const sheenEnd = width;

                return (
                  <AreaChart
                    accessibilityLayer
                    data={data}
                    height={height}
                    margin={{ top: 14, right: 4, left: 4, bottom: 8 }}
                    width={width}
                  >
                    {isAmbientMotionReady ? (
                      <defs>
                        <linearGradient
                          id={sheenId}
                          gradientUnits="userSpaceOnUse"
                          x1={sheenStart}
                          y1="0"
                          x2={sheenStart + sheenWidth}
                          y2="0"
                        >
                          <stop offset="0%" stopColor="white" stopOpacity="0" />
                          <stop offset="34%" stopColor="white" stopOpacity="0" />
                          <stop offset="52%" stopColor="white" stopOpacity="0.9" />
                          <stop
                            offset="68%"
                            stopColor={SPEND_CHART_LIGHT}
                            stopOpacity="0.32"
                          />
                          <stop offset="100%" stopColor="white" stopOpacity="0" />
                          <animate
                            attributeName="x1"
                            values={`${sheenStart};${sheenEnd};${sheenEnd}`}
                            keyTimes="0;0.76;1"
                            dur={AMBIENT_SWEEP_DURATION}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="x2"
                            values={`${sheenStart + sheenWidth};${sheenEnd + sheenWidth};${sheenEnd + sheenWidth}`}
                            keyTimes="0;0.76;1"
                            dur={AMBIENT_SWEEP_DURATION}
                            repeatCount="indefinite"
                          />
                        </linearGradient>
                      </defs>
                    ) : null}
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
                        fill="var(--danger)"
                        stroke="var(--card)"
                        strokeWidth={2.5}
                        ifOverflow="extendDomain"
                      />
                    ) : null}
                    <Area
                      type="monotone"
                      dataKey="spend"
                      activeDot={{
                        r: 4,
                        fill: "var(--card)",
                        stroke: "var(--danger)",
                        strokeWidth: 2.5,
                      }}
                      dot={false}
                      stroke="var(--danger)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.6}
                      fill="transparent"
                      baseValue={0}
                      isAnimationActive
                      {...chartMotion}
                    />
                    {isAmbientMotionReady ? (
                      <Area
                        type="monotone"
                        dataKey="spend"
                        activeDot={false}
                        dot={false}
                        stroke={`url(#${sheenId})`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={4}
                        fill="none"
                        isAnimationActive={false}
                      />
                    ) : null}
                  </AreaChart>
                );
              }}
            </ChartFrame>
          </div>
        ) : (
          <div className="dashboard-chart-empty mt-4 h-[132px] min-h-[132px]">
            <div>
              <span className="dashboard-chart-empty-icon">
                <Activity size={16} />
              </span>
              <p className="text-xs font-semibold text-text-primary">
                No spend yet
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                This month is clear.
              </p>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
