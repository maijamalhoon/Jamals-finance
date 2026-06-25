"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { CheckCircle2, Target } from "lucide-react";

import { GOAL_ICONS } from "@/components/goals/goal-icons";
import { getGoalCategoryStyle } from "@/components/goals/goal-styles";
import { useDashboardAnimationReady } from "@/components/motion/useDashboardAnimationReady";
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

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setReduced(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useAnimatedNumber(value: number, delay = 0, duration = 900) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    setDisplayValue(0);

    let frameId = 0;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      frameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
    };
  }, [value, delay, duration, reducedMotion]);

  return displayValue;
}

function AnimatedCurrency({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const animatedValue = useAnimatedNumber(value, delay, 820);
  const { formatCurrency } = useCurrency();

  return <>{formatCurrency(animatedValue)}</>;
}

function AnimatedPercent({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const animatedValue = useAnimatedNumber(value, delay, 780);

  return <>{Math.round(animatedValue)}%</>;
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
  animationReady,
  reduceMotion,
}: {
  goal: Goal;
  index: number;
  animationReady: boolean;
  reduceMotion: boolean;
}) {
  const { current, target, percentage, done } = getGoalProgress(goal);

  const entry =
    GOAL_ICONS.find((item) => item.value === goal.icon) ??
    GOAL_ICONS[GOAL_ICONS.length - 1];

  const GoalIcon = done ? CheckCircle2 : entry.icon;
  const accent = done ? "var(--success)" : getGoalCategoryStyle(goal).accent;

  const delay = 0;
  const progressScale =
    animationReady && percentage > 0 ?
      Math.max(2, Math.min(percentage, 100)) / 100
    : 0;

  const rowStyle = {
    "--motion-reveal-delay": `${index * 65}ms`,
    "--goal-accent": accent,
    "--progress-accent": accent,
  } as CSSProperties;
  const progressStyle = {
    transform: `scaleX(${progressScale})`,
    transitionDuration: reduceMotion ? "0ms" : "820ms",
  } as CSSProperties;

  return (
    <article
      className="dashboard-list-row motion-card-entry"
      style={rowStyle}
    >
      <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
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

        <span className="shrink-0 text-right text-[13px] font-bold leading-5 text-[var(--goal-accent)]">
          <AnimatedPercent value={percentage} delay={delay} />
        </span>
      </div>

      <div className="mt-2 dashboard-progress-track">
        <div
          className="dashboard-progress-fill"
          style={progressStyle}
        />
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
  const { ready: animationReady, reduceMotion } = useDashboardAnimationReady();
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
            animationReady={animationReady}
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
