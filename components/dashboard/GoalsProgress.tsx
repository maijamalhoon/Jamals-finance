import type { CSSProperties } from "react";
import Link from "next/link";
import { CheckCircle2, Target } from "lucide-react";
import { GOAL_ICONS } from "@/components/goals/goal-icons";
import CountedAmount from "@/components/motion/CountedAmount";
import EmptyState from "@/components/ui/empty-state";

interface Goal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  icon: string | null;
}

const VISIBLE_GOALS = 5;

const GOAL_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#db2777",
] as const;

function stableGoalAccent(goal: Goal, index: number) {
  const seed = `${goal.icon ?? ""}${goal.name}`
    .split("")
    .reduce((total, letter) => total + letter.charCodeAt(0), index);

  return GOAL_PALETTE[seed % GOAL_PALETTE.length];
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return `PKR ${safeValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function formatPercentage(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return `${Math.round(safeValue)}%`;
}

export default function GoalsProgress({ goals }: { goals: Goal[] }) {
  const visibleGoals = goals.slice(0, VISIBLE_GOALS);
  const hasHiddenGoals = goals.length > VISIBLE_GOALS;

  return (
    <section className="finance-reference-card motion-card-entry flex h-full min-h-[380px] min-w-0 flex-col overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-secondary text-text-tertiary [&>svg]:h-3.5 [&>svg]:w-3.5">
              <Target />
            </span>
            <span className="truncate">Savings Targets</span>
          </div>
          <h3 className="text-[18px] font-semibold leading-tight tracking-normal text-text-primary">
            Goals Progress
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Savings targets and milestones
          </p>
        </div>

        {hasHiddenGoals ? (
          <Link
            href="/dashboard/goals"
            className="finance-focus finance-pressable shrink-0 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-[11px] font-semibold leading-none text-active hover:bg-hover"
          >
            View All
          </Link>
        ) : null}
      </div>

      {visibleGoals.length === 0 ? (
        <div className="dashboard-chart-empty flex-1">
          <EmptyState
            compact
            icon={CheckCircle2}
            title="No goals yet"
            description="Create goals to monitor savings progress from the dashboard."
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          {visibleGoals.map((goal, index) => {
            const current = Number(goal.current_amount);
            const target = Number(goal.target_amount);
            const safeCurrent = Number.isFinite(current) ? Math.max(current, 0) : 0;
            const safeTarget = Number.isFinite(target) ? Math.max(target, 0) : 0;
            const pct =
              safeTarget > 0 ? Math.min((safeCurrent / safeTarget) * 100, 100) : 0;
            const done = pct >= 100;
            const entry =
              GOAL_ICONS.find((item) => item.value === goal.icon) ??
              GOAL_ICONS[GOAL_ICONS.length - 1];
            const GoalIcon = done ? CheckCircle2 : entry.icon;
            const accent = done ? "var(--success)" : stableGoalAccent(goal, index);
            const rowStyle = {
              "--motion-reveal-delay": `${index * 70}ms`,
              "--goal-accent": accent,
            } as CSSProperties;

            return (
              <article
                key={goal.id}
                className="motion-card-entry min-w-0 rounded-[20px] border border-border/80 bg-surface-secondary/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-hover hover:shadow-[var(--shadow-soft)]"
                style={rowStyle}
              >
                <div className="mb-2.5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border"
                    style={{
                      borderColor: `color-mix(in srgb, ${accent}, transparent 68%)`,
                      backgroundColor: `color-mix(in srgb, ${accent}, transparent 88%)`,
                      color: accent,
                    }}
                  >
                    <GoalIcon size={15} strokeWidth={2.15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-text-primary">
                      {goal.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-text-secondary">
                      <CountedAmount amount={formatCurrency(safeCurrent)} /> /{" "}
                      <CountedAmount amount={formatCurrency(safeTarget)} />
                    </p>
                  </div>
                  <span
                    className="motion-counter-ready shrink-0 text-right text-[13px] font-bold leading-5 text-[var(--goal-accent)]"
                    style={{ animationDelay: `${index * 70 + 100}ms` }}
                  >
                    <CountedAmount amount={formatPercentage(pct)} />
                  </span>
                </div>

                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accent}, var(--card) 88%)`,
                  }}
                >
                  <div
                    className="motion-progress-fill h-full rounded-full"
                    style={{
                      width: `${pct > 0 ? Math.max(2, pct) : 0}%`,
                      backgroundColor: accent,
                      animationDelay: `${index * 75 + 140}ms`,
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
