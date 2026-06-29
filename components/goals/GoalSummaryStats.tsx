"use client";

import type { CSSProperties } from "react";
import { CheckCircle2, Target, TrendingUp, WalletCards } from "lucide-react";

import {
  useAnimatedGoalValue,
  useProgressReveal,
  useReducedMotion,
} from "./use-animated-goal-value";

type GoalSummaryStatsProps = {
  totalTarget: number;
  totalSaved: number;
  completedCount: number;
  totalCount: number;
  overallPct: number;
};

function formatCurrency(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

export default function GoalSummaryStats({
  totalTarget,
  totalSaved,
  completedCount,
  totalCount,
  overallPct,
}: GoalSummaryStatsProps) {
  const reduceMotion = useReducedMotion();
  const progressReady = useProgressReveal(reduceMotion);
  const animatedTarget = useAnimatedGoalValue(totalTarget, 0, 760);
  const animatedSaved = useAnimatedGoalValue(totalSaved, 80, 820);
  const animatedPct = useAnimatedGoalValue(overallPct, 120, 760);
  const cappedPct = Math.min(Math.max(overallPct, 0), 100);

  const progressStyle = {
    "--progress-accent": "var(--active)",
    "--progress-duration": reduceMotion ? "0ms" : "820ms",
    "--progress-scale": progressReady ? cappedPct / 100 : 0,
  } as CSSProperties;

  const stats = [
    {
      label: "Total Target",
      value: formatCurrency(animatedTarget),
      icon: Target,
      accent: "var(--active)",
    },
    {
      label: "Total Saved",
      value: formatCurrency(animatedSaved),
      icon: WalletCards,
      accent: "var(--success)",
    },
    {
      label: "Completed",
      value: `${completedCount} / ${totalCount}`,
      icon: CheckCircle2,
      accent: "var(--success)",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, accent }) => (
        <article
          key={label}
          className="summary-card flex min-h-[118px] min-w-0 items-start gap-3"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border"
            style={{
              color: accent,
              borderColor: `color-mix(in srgb, ${accent}, transparent 76%)`,
              backgroundColor: `color-mix(in srgb, ${accent}, transparent 92%)`,
            }}
          >
            <Icon size={17} strokeWidth={2.15} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-5 text-text-secondary">
              {label}
            </p>
            <p className="mt-1 break-words text-xl font-semibold leading-tight text-text-primary [overflow-wrap:anywhere]">
              {value}
            </p>
          </div>
        </article>
      ))}

      <article className="summary-card flex min-h-[118px] min-w-0 flex-col justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border"
            style={{
              color: "var(--active)",
              borderColor:
                "color-mix(in srgb, var(--active), transparent 76%)",
              backgroundColor:
                "color-mix(in srgb, var(--active), transparent 92%)",
            }}
          >
            <TrendingUp size={17} strokeWidth={2.15} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-5 text-text-secondary">
              Overall Progress
            </p>
            <p className="mt-1 text-xl font-semibold leading-tight text-active">
              {animatedPct.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-3 dashboard-progress-track" style={progressStyle}>
          <div className="dashboard-progress-fill" />
        </div>
      </article>
    </div>
  );
}
