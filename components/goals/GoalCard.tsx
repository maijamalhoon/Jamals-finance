"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoalModal, { ExistingGoal } from "./GoalModal";
import { GOAL_ICONS } from "./goal-icons";

export default function GoalCard({ goal }: { goal: ExistingGoal }) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now] = useState(() => Date.now());

  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const done = target > 0 && current >= target;

  const iconEntry =
    GOAL_ICONS.find((i) => i.value === goal.icon) ||
    GOAL_ICONS[GOAL_ICONS.length - 1];
  const GoalIcon = iconEntry.icon;

  let daysLeft: number | null = null;
  if (goal.deadline) {
    daysLeft = Math.ceil(
      (new Date(goal.deadline).getTime() - now) / 86400000,
    );
  }

  async function handleDelete() {
    if (!confirm(`Delete "${goal.name}"?`)) return;
    setDeleting(true);
    await supabase.from("goals").delete().eq("id", goal.id);
    router.refresh();
  }

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <>
      <div
        className={`finance-panel card-hover group relative p-5 hover:border-white/[0.14] ${
          done ? "border-green-500/30 bg-green-500/5" : ""
        }`}
      >
        <div className="absolute right-4 top-4 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={() => setEditOpen(true)}
            className="icon-button"
            aria-label="Edit goal"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="icon-button hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Delete goal"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 pr-16">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              done ? "bg-green-500/15" : "bg-indigo-500/15"
            }`}
          >
            {done ?
              <CheckCircle2 size={18} className="text-green-400" />
            : <GoalIcon size={18} className="text-indigo-300" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {goal.name}
            </p>
            <p
              className={`text-xs font-medium ${
                done ? "text-green-400" : "text-indigo-300"
              }`}
            >
              {done ? "Completed" : iconEntry.label}
            </p>
          </div>
        </div>

        {done ?
          <p className="mb-3 text-xs font-medium text-green-400">
            Goal reached
          </p>
        : daysLeft !== null ?
          <p
            className={`mb-3 text-xs ${daysLeft < 30 ? "text-red-400" : "text-slate-500"}`}
          >
            {daysLeft > 0 ?
              `${daysLeft} days left`
            : daysLeft === 0 ?
              "Due today"
            : "Overdue"}
          </p>
        : <p className="mb-3 text-xs text-slate-600">No deadline</p>}

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-300" : "bg-amber-300"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-white/[0.08] pt-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-bold text-white">
              {fmt(current)}
            </p>
            <p className="mt-0.5 break-words text-xs text-slate-500">
              of {fmt(target)}
            </p>
          </div>
          <div className="min-w-[76px] text-right">
            <p
              className={`text-sm font-bold ${done ? "text-green-400" : "text-amber-300"}`}
            >
              {pct.toFixed(0)}%
            </p>
            {!done && (
              <p className="break-words text-xs text-slate-600">
                {fmt(Math.max(target - current, 0))} to go
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
