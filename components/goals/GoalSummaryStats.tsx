"use client";

import { CheckCircle2, Target, WalletCards } from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
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

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function GoalSummaryStats({
  totalTarget,
  totalSaved,
  completedCount,
  totalCount,
  overallPct,
}: GoalSummaryStatsProps) {
  const { formatCurrency } = useCurrency();
  const reduceMotion = useReducedMotion();
  const animatedTarget = useAnimatedGoalValue(totalTarget, 0, 760);
  const animatedSaved = useAnimatedGoalValue(totalSaved, 80, 820);
  const displayPct = Number.isFinite(overallPct) ? Math.max(overallPct, 0) : 0;
  const cappedPct = Math.min(displayPct, 100);
  const progressReady = useProgressReveal(reduceMotion, cappedPct);
  const revealedPct = progressReady ? cappedPct : 0;
  const remaining = Math.max(totalTarget - totalSaved, 0);

  const metrics = [
    {
      label: "Total target",
      value: formatCurrency(animatedTarget),
      helper: `${totalCount} ${totalCount === 1 ? "goal" : "goals"}`,
      icon: Target,
      tone: "var(--goals, var(--active))",
    },
    {
      label: "Saved",
      value: formatCurrency(animatedSaved),
      helper:
        remaining > 0 ? `${formatCurrency(remaining)} remaining` : "Target covered",
      icon: WalletCards,
      tone: "var(--success)",
    },
    {
      label: "Completed",
      value: `${completedCount} / ${totalCount}`,
      helper:
        completedCount === totalCount && totalCount > 0
          ? "All goals reached"
          : `${Math.max(totalCount - completedCount, 0)} active`,
      icon: CheckCircle2,
      tone: "var(--success)",
    },
  ];

  return (
    <section
      data-goals-summary
      aria-label="Goals progress overview"
      className="grid min-w-0 gap-5 overflow-hidden rounded-[30px] bg-card p-4 sm:p-5 lg:grid-cols-[minmax(15rem,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:p-6"
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <div
          className="relative size-28 shrink-0 sm:size-32"
          role="progressbar"
          aria-label="Overall goals progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(cappedPct)}
        >
          <svg
            className="size-full -rotate-90"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--surface-secondary)"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--goals, var(--active))"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={
                CIRCUMFERENCE - (revealedPct / 100) * CIRCUMFERENCE
              }
              style={{
                transition: reduceMotion
                  ? "none"
                  : "stroke-dashoffset 820ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xl font-black tabular-nums tracking-tight text-text-primary sm:text-2xl">
                {displayPct.toFixed(1)}%
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
                Progress
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-goals">
            Goals pulse
          </p>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-text-primary sm:text-xl">
            Savings progress
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-text-secondary">
            One clear view of what is saved, what remains, and how many goals are
            complete.
          </p>
        </div>
      </div>

      <dl className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
        {metrics.map(({ label, value, helper, icon: Icon, tone }) => (
          <div
            key={label}
            className="min-w-0 rounded-[20px] bg-surface-primary/45 px-3.5 py-4 sm:px-4"
          >
            <div className="flex items-center gap-2">
              <Icon
                aria-hidden="true"
                size={16}
                strokeWidth={2.35}
                style={{ color: tone }}
              />
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                {label}
              </dt>
            </div>
            <dd className="mt-2 break-words text-base font-bold tabular-nums text-text-primary [overflow-wrap:anywhere] sm:text-lg">
              {value}
            </dd>
            <p className="mt-1 truncate text-[11px] text-text-secondary">
              {helper}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
