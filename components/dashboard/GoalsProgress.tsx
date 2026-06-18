import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { GOAL_ICONS } from "@/components/goals/goal-icons";
import EmptyState from "@/components/ui/empty-state";

interface Goal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  icon: string;
}

export default function GoalsProgress({ goals }: { goals: Goal[] }) {
  return (
    <div className="finance-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Goals Progress</h3>
        <Link
          href="/dashboard/goals"
          className="text-indigo-300 text-xs hover:text-indigo-200 transition-colors"
        >
          View All
        </Link>
      </div>

      {goals.length === 0 ?
        <EmptyState
          compact
          icon={CheckCircle2}
          title="No goals yet"
          description="Create goals to monitor savings progress from the dashboard."
        />
      : <div className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(
              (Number(g.current_amount) / Number(g.target_amount)) * 100,
              100,
            );
            const done = pct >= 100;
            const entry =
              GOAL_ICONS.find((i) => i.value === g.icon) ||
              GOAL_ICONS[GOAL_ICONS.length - 1];
            const GoalIcon = entry.icon;

            return (
              <div key={g.id}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-white/[0.06] ${
                      done ? "bg-green-500/15" : "bg-white/[0.055]"
                    }`}
                  >
                    {done ?
                      <CheckCircle2 size={14} className="text-green-400" />
                    : <GoalIcon size={14} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-medium truncate">
                        {g.name}
                      </span>
                      <span
                        className={`text-xs font-semibold ml-2 ${done ? "text-green-300" : "text-amber-300"}`}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      PKR{" "}
                      {Number(g.current_amount).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      /{" "}
                      {Number(g.target_amount).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${done ? "bg-green-300" : "bg-amber-300"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
