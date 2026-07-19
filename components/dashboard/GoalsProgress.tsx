"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { CheckCircle2, Target } from "lucide-react";

import DashboardCardViewLink from "@/components/dashboard/DashboardCardViewLink";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  getDistinctGoalPresentationAssignments,
  getGoalPresentation,
  type GoalPresentationAssignment,
} from "@/components/goals/goal-icons";
import {
  useAnimatedGoalValue,
  useProgressReveal,
  useReducedMotion,
} from "@/components/goals/use-animated-goal-value";
import EmptyState from "@/components/ui/empty-state";
import type { DashboardAvailability } from "@/lib/dashboard-financial-semantics";

interface Goal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  icon: string | null;
}

const DEFAULT_VISIBLE_GOALS = 4;

function getDashboardGoalAccent(
  iconValue: GoalPresentationAssignment["iconValue"],
) {
  switch (iconValue) {
    case "home":
    case "building":
    case "landmark":
    case "paintbrush":
    case "hammer":
      return "var(--goals)";
    case "car":
    case "key":
    case "gauge":
    case "route":
    case "bike":
      return "var(--warning)";
    case "plane":
    case "gem":
    case "gift":
    case "shopping":
      return "var(--investment)";
    case "smartphone":
    case "laptop":
    case "monitor":
    case "cpu":
    case "headphones":
    case "tablet":
    case "camera":
    case "tv":
    case "gamepad":
      return "var(--info)";
    case "shield":
    case "piggybank":
    case "wallet":
    case "dumbbell":
      return "var(--success)";
    case "heart":
      return "var(--danger)";
    case "baby":
      return "var(--secondary)";
    case "graduation":
    case "briefcase":
      return "var(--primary)";
    default:
      return "var(--goals)";
  }
}

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

function getGoalProgress(goal: Goal) {
  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const safeCurrent = Number.isFinite(current) ? Math.max(current, 0) : 0;
  const targetValid = Number.isFinite(target) && target > 0;
  const safeTarget = targetValid ? target : 0;
  const percentage =
    safeTarget > 0 ? Math.min((safeCurrent / safeTarget) * 100, 100) : 0;

  return {
    current: safeCurrent,
    target: safeTarget,
    percentage,
    done: percentage >= 100,
    targetValid,
  };
}

function GoalRow({
  goal,
  index,
  reduceMotion,
  presentation,
}: {
  goal: Goal;
  index: number;
  reduceMotion: boolean;
  presentation: GoalPresentationAssignment;
}) {
  const { current, target, percentage, done, targetValid } = getGoalProgress(goal);
  const progressReady = useProgressReveal(
    reduceMotion,
    `${goal.id}:${percentage}`,
  );
  const resolvedPresentation = getGoalPresentation(goal, presentation);
  const GoalIcon = done ? CheckCircle2 : resolvedPresentation.entry.icon;
  const accent = getDashboardGoalAccent(resolvedPresentation.entry.value);
  const progressScale =
    progressReady && percentage > 0 ? Math.min(percentage, 100) / 100 : 0;
  const rowStyle = {
    "--motion-reveal-delay": `${index * 55}ms`,
    "--goal-accent": accent,
    "--progress-accent": accent,
  } as CSSProperties;
  const progressStyle = {
    "--progress-duration": reduceMotion ? "0ms" : "820ms",
    "--progress-scale": progressScale,
    backgroundColor: `color-mix(in srgb, ${accent}, transparent 82%)`,
  } as CSSProperties;

  return (
    <article
      className="motion-card-entry border-b border-border/65 py-2.5 first:pt-0 last:border-b-0 last:pb-0"
      style={rowStyle}
    >
      <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center"
          style={{ color: accent }}
        >
          <GoalIcon size={21} strokeWidth={2.4} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-5 text-text-primary sm:text-[13px]">
            {goal.name}
          </p>
          <p className="truncate text-[10px] font-medium leading-4 text-text-secondary sm:text-[11px]">
            <AnimatedCurrency value={current} /> /{" "}
            {targetValid ? (
              <AnimatedCurrency value={target} />
            ) : (
              "Target unavailable"
            )}
          </p>
        </div>
      </div>

      <div
        className="dashboard-progress-track mt-2 h-1.5"
        style={progressStyle}
      >
        <div className="dashboard-progress-fill" />
      </div>
    </article>
  );
}

export default function GoalsProgress({
  goals,
  maxVisible = DEFAULT_VISIBLE_GOALS,
  status,
}: {
  goals: Goal[];
  maxVisible?: number;
  status: DashboardAvailability;
}) {
  const reduceMotion = useReducedMotion();
  const visibleGoals = useMemo(
    () => goals.slice(0, maxVisible),
    [goals, maxVisible],
  );
  const presentations = useMemo(
    () => getDistinctGoalPresentationAssignments(goals),
    [goals],
  );
  const hasHiddenGoals = goals.length > visibleGoals.length;

  let content: ReactNode;
  if (status === "unavailable" || visibleGoals.length === 0) {
    content = (
      <div className="dashboard-chart-empty min-h-[210px] flex-1">
        <EmptyState
          compact
          icon={CheckCircle2}
          title={status === "unavailable" ? "Goals unavailable" : "No goals yet"}
          description={
            status === "unavailable"
              ? "Refresh when your connection is stable."
              : "Create goals to monitor savings progress from the dashboard."
          }
        />
      </div>
    );
  } else {
    content = (
      <div className="min-h-0 flex-1">
        {visibleGoals.map((goal, index) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            index={index}
            reduceMotion={reduceMotion}
            presentation={presentations[index]}
          />
        ))}
      </div>
    );
  }

  const viewLabel = hasHiddenGoals ? "View all goals" : "View goal details";

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="dashboard-list-card-kicker-icon">
            <Target />
          </span>
          <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Goals Progress
          </h3>
        </div>

        {status === "available" && goals.length > 0 ? (
          <DashboardCardViewLink href="/dashboard/goals" label={viewLabel} />
        ) : null}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">{content}</div>
    </section>
  );
}
