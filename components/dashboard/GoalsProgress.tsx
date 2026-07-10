"use client";

import {
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { CheckCircle2, Target } from "lucide-react";

import { GOAL_ICONS } from "@/components/goals/goal-icons";
import { getGoalCategoryStyle } from "@/components/goals/goal-styles";
import {
  useAnimatedGoalValue,
  useProgressReveal,
  useReducedMotion,
} from "@/components/goals/use-animated-goal-value";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import EmptyState from "@/components/ui/empty-state";

interface Goal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  icon: string | null;
}

const DEFAULT_VISIBLE_GOALS = 4;

function AnimatedCurrency({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const animatedValue = useAnimatedGoalValue(value, delay, 820);
  const { formatCurrency } = useCurrency();

  return <>{formatCurrency(animatedValue)}</>;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getGoalProgress(goal: Goal) {
  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);

  const safeCurrent = Number.isFinite(current) ? Math.max(current, 0) : 0;
  const safeTarget = Number.isFinite(target) ? Math.max(target, 0) : 0;

  const percentage =
    safeTarget > 0 ? Math.min((safeCurrent / safeTarget) * 100, 100) : 0;

  return {
    current: safeCurrent,
    target: safeTarget,
    percentage,
    done: percentage >= 100,
  };
}

function GoalRow({
  goal,
  index,
  reduceMotion,
}: {
  goal: Goal;
  index: number;
  reduceMotion: boolean;
}) {
  const { current, target, percentage, done } = getGoalProgress(goal);
  const progressReady = useProgressReveal(
    reduceMotion,
    `${goal.id}:${percentage}`,
  );

  const entry =
    GOAL_ICONS.find((item) => item.value === goal.icon) ??
    GOAL_ICONS[GOAL_ICONS.length - 1];

  const GoalIcon = done ? CheckCircle2 : entry.icon;
  const accent = done ? "var(--success)" : getGoalCategoryStyle(goal).accent;
  const statusLabel =
    done ? "Complete"
    : percentage === 0 ? "Not started"
    : formatPercent(percentage);

  const delay = 0;
  const progressScale =
    progressReady && percentage > 0 ?
      Math.max(2, Math.min(percentage, 100)) / 100
    : 0;

  const rowStyle = {
    "--motion-reveal-delay": `${index * 65}ms`,
    "--goal-accent": accent,
    "--progress-accent": accent,
  } as CSSProperties;
  const progressStyle = {
    "--progress-duration": reduceMotion ? "0ms" : "820ms",
    "--progress-scale": progressScale,
  } as CSSProperties;

  return (
    <article
      className="dashboard-list-row motion-card-entry"
      style={rowStyle}
    >
      <div className="grid min-w-0 grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border shadow-[inset_0_1px_0_rgb(255_255_255_/_0.4)]"
          style={{
            color: accent,
            borderColor: `color-mix(in srgb, ${accent}, transparent 76%)`,
            backgroundColor: `color-mix(in srgb, ${accent}, transparent 92%)`,
          }}
        >
          <GoalIcon size={15} strokeWidth={2.15} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-5 text-text-primary sm:text-sm">
            {goal.name}
          </p>

          <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-text-secondary">
            <AnimatedCurrency value={current} delay={delay} /> /{" "}
            <AnimatedCurrency value={target} delay={delay} />
          </p>
        </div>

        <span className="shrink-0 rounded-full border px-2 py-1 text-right text-[11px] font-bold leading-none text-[var(--goal-accent)]">
          {statusLabel}
        </span>
      </div>

      <div className="mt-2.5 dashboard-progress-track" style={progressStyle}>
        <div className="dashboard-progress-fill" />
      </div>
    </article>
  );
}

export default function GoalsProgress({
  goals,
  maxVisible = DEFAULT_VISIBLE_GOALS,
}: {
  goals: Goal[];
  maxVisible?: number;
}) {
  const reduceMotion = useReducedMotion();
  const visibleGoals = useMemo(() => {
    return goals.slice(0, maxVisible);
  }, [goals, maxVisible]);

  const hasHiddenGoals = goals.length > visibleGoals.length;

  let content: ReactNode;

  if (visibleGoals.length === 0) {
    content = (
      <div className="dashboard-chart-empty min-h-[150px] flex-1">
        <EmptyState
          compact
          icon={CheckCircle2}
          title="No goals yet"
          description="Create goals to monitor savings progress from the dashboard."
        />
      </div>
    );
  } else {
    content = (
      <div className="dashboard-list-rows">
        {visibleGoals.map((goal, index) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            index={index}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="finance-reference-card dashboard-list-card motion-card-entry">
      <div className="dashboard-list-card-header">
        <div className="min-w-0">
          <div className="dashboard-list-card-kicker">
            <span className="dashboard-list-card-kicker-icon">
              <Target />
            </span>
            <span className="truncate">Savings Targets</span>
          </div>

          <h3 className="dashboard-list-card-title">
            Goals Progress
          </h3>

          <p className="dashboard-list-card-subtitle">
            Savings targets and milestones
          </p>
        </div>

        {goals.length > 0 ?
          <Link
            href="/dashboard/goals"
            className="dashboard-list-card-action"
          >
            {hasHiddenGoals ? "View All" : "Details"}
          </Link>
        : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{content}</div>
    </section>
  );
}
