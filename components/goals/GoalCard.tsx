"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoalModal, { ExistingGoal, GOAL_ICONS } from "./GoalModal";

export default function GoalCard({ goal }: { goal: ExistingGoal }) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const pct = Math.min((current / target) * 100, 100);
  const done = current >= target;

  // Find the matching lucide icon
  const iconEntry =
    GOAL_ICONS.find((i) => i.value === goal.icon) ||
    GOAL_ICONS[GOAL_ICONS.length - 1];
  const GoalIcon = iconEntry.icon;

  let daysLeft: number | null = null;
  if (goal.deadline) {
    daysLeft = Math.ceil(
      (new Date(goal.deadline).getTime() - Date.now()) / 86400000,
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
        className={`bg-gray-900/60 border rounded-2xl p-5 hover:border-gray-700/60 transition-colors group relative ${
          done ? "border-green-500/30" : "border-gray-800/50"
        }`}
      >
        {/* Edit / Delete */}
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditOpen(true)}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-indigo-600/20 flex items-center justify-center transition-colors"
          >
            <Pencil size={12} className="text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>

        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            done ? "bg-green-500/15" : "bg-indigo-500/15"
          }`}
        >
          {done ?
            <CheckCircle2 size={18} className="text-green-400" />
          : <GoalIcon size={18} className="text-indigo-400" />}
        </div>

        {/* Name */}
        <p className="text-white font-semibold text-sm mb-1 pr-16 truncate">
          {goal.name}
        </p>

        {/* Status */}
        {done ?
          <p className="text-green-400 text-xs mb-3 font-medium">
            ✓ Completed!
          </p>
        : daysLeft !== null ?
          <p
            className={`text-xs mb-3 ${daysLeft < 30 ? "text-red-400" : "text-gray-500"}`}
          >
            {daysLeft > 0 ?
              `${daysLeft} days left`
            : daysLeft === 0 ?
              "Due today"
            : "Overdue"}
          </p>
        : <p className="text-gray-600 text-xs mb-3">No deadline</p>}

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-400" : "bg-yellow-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Amounts */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white text-sm font-bold">{fmt(current)}</p>
            <p className="text-gray-500 text-xs">of {fmt(target)}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-bold ${done ? "text-green-400" : "text-yellow-400"}`}
            >
              {pct.toFixed(0)}%
            </p>
            {!done && (
              <p className="text-gray-600 text-xs">
                {fmt(target - current)} to go
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
