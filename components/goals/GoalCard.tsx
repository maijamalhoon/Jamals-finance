"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import GoalModal, { ExistingGoal } from "./GoalModal";
import { GOAL_ICONS } from "./goal-icons";
import { getGoalCategoryStyle } from "./goal-styles";
import { useProgressReveal, useReducedMotion } from "./use-animated-goal-value";
import { useCurrency } from "@/components/currency/CurrencyProvider";

export default function GoalCard({ goal }: { goal: ExistingGoal }) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();

  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const safeCurrent = Number.isFinite(current) ? Math.max(current, 0) : 0;
  const safeTarget = Number.isFinite(target) ? Math.max(target, 0) : 0;
  const pct =
    safeTarget > 0 ? Math.min((safeCurrent / safeTarget) * 100, 100) : 0;
  const done = safeTarget > 0 && safeCurrent >= safeTarget;
  const progressReady = useProgressReveal(
    reduceMotion,
    `${goal.id}:${safeCurrent}:${safeTarget}`,
  );
  const categoryStyle = getGoalCategoryStyle(goal);
  const accent = done ? "var(--success)" : categoryStyle.accent;

  const iconEntry =
    GOAL_ICONS.find((i) => i.value === goal.icon) ||
    GOAL_ICONS[GOAL_ICONS.length - 1];
  const GoalIcon = done ? CheckCircle2 : iconEntry.icon;

  let daysLeft: number | null = null;
  if (goal.deadline) {
    daysLeft = Math.ceil(
      (new Date(goal.deadline).getTime() - now) / 86400000,
    );
  }

  async function handleDelete() {
    if (deleting) return;
    if (!confirm(`Delete "${goal.name}"?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);

    if (error) {
      setDeleting(false);
      toast.error("Could not delete the goal. Please try again.");
      return;
    }

    toast.success("Goal deleted");
    router.refresh();
  }

  const cardStyle = {
    "--goal-accent": accent,
    "--progress-accent": accent,
    "--progress-duration": reduceMotion ? "0ms" : "820ms",
    "--progress-scale": progressReady && pct > 0 ? pct / 100 : 0,
  } as CSSProperties;

  const statusText =
    done
      ? "Completed"
      : categoryStyle.category === "other"
        ? iconEntry.label
        : categoryStyle.label;

  return (
    <>
      <div
        className="finance-reference-card card-hover group relative flex h-full min-h-[270px] flex-col overflow-hidden p-4 sm:p-5"
        style={cardStyle}
      >
        <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="icon-button"
            aria-label="Edit goal"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-busy={deleting || undefined}
            className="icon-button hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
            aria-label="Delete goal"
            title="Delete goal"
          >
            {deleting ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" size={12} aria-hidden="true" />
            ) : (
              <Trash2 size={12} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="mb-4 flex min-w-0 items-start gap-3 pr-24">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border"
            style={{
              color: accent,
              borderColor: `color-mix(in srgb, ${accent}, transparent 76%)`,
              backgroundColor: `color-mix(in srgb, ${accent}, transparent 92%)`,
            }}
          >
            <GoalIcon size={18} strokeWidth={2.15} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-6 text-text-primary">
              {goal.name}
            </p>
            <p className="text-xs font-semibold leading-5 text-[var(--goal-accent)]">
              {statusText}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p
            className={`min-w-0 truncate text-xs font-medium ${
              done || daysLeft === null || daysLeft >= 30
                ? "text-text-secondary"
                : "text-danger"
            }`}
          >
            {done
              ? "Goal reached"
              : daysLeft !== null
                ? daysLeft > 0
                  ? `${daysLeft} days left`
                  : daysLeft === 0
                    ? "Due today"
                    : "Overdue"
                : "No deadline"}
          </p>
          <span className="shrink-0 text-sm font-bold leading-5 text-[var(--goal-accent)]">
            {Math.round(pct)}%
          </span>
        </div>

        <div className="dashboard-progress-track">
          <div className="dashboard-progress-fill" />
        </div>

        <div className="mt-auto flex min-w-0 items-end justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="finance-amount break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(safeCurrent)}
            </p>
            <p className="mt-0.5 break-words text-xs text-text-secondary [overflow-wrap:anywhere]">
              of {formatCurrency(safeTarget)}
            </p>
          </div>
          <div className="min-w-0 max-w-[48%] text-right">
            <p className="finance-amount break-words text-sm font-bold text-[var(--goal-accent)] [overflow-wrap:anywhere]">
              {formatCurrency(Math.max(safeTarget - safeCurrent, 0))}
            </p>
            {!done && (
              <p className="break-words text-xs text-text-secondary">
                to go
              </p>
            )}
          </div>
        </div>
      </div>

      <GoalModal
        open={editOpen}
        goal={goal}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
