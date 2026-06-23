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
    <div className="finance-reference-card relative p-5 before:absolute before:inset-x-5 before:-bottom-3 before:-z-10 before:h-12 before:rounded-[24px] before:border before:border-border before:bg-card/60 before:shadow-[0_16px_34px_rgb(16_24_40_/_0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Goals Progress
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Savings targets and milestones
          </p>
        </div>
        <Link
          href="/dashboard/goals"
          className="finance-focus rounded-[12px] border border-border bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-active transition-all hover:-translate-y-px hover:bg-hover"
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
              <div
                key={g.id}
                className="rounded-[20px] border border-border bg-surface-secondary p-3 transition-all hover:-translate-y-0.5 hover:bg-hover"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[12px] border ${
                      done ? "finance-status-success" : "finance-status-warning"
                    }`}
                  >
                    {done ?
                      <CheckCircle2 size={14} />
                    : <GoalIcon size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-medium text-text-primary">
                        {g.name}
                      </span>
                      <span
                        className={`ml-2 text-xs font-semibold ${done ? "text-success" : "text-warning"}`}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-text-secondary">
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
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className={`motion-progress-fill h-full rounded-full ${done ? "bg-success" : "bg-warning"}`}
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
