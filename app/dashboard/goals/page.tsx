import { createClient } from "@/lib/supabase/server";
import GoalCard from "@/components/goals/GoalCard";
import AddGoalButton from "@/components/goals/AddGoalButton";
import GoalSummaryStats from "@/components/goals/GoalSummaryStats";
import EmptyState from "@/components/ui/empty-state";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const supabase = await createClient();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  const list = goals ?? [];
  const completed = list.filter(
    (g) => Number(g.current_amount) >= Number(g.target_amount),
  );
  const totalTarget = list.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = list.reduce((s, g) => s + Number(g.current_amount), 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="page-heading finance-surface-glass motion-card-entry overflow-hidden">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="dashboard-list-card-kicker">
              <span className="dashboard-list-card-kicker-icon">
                <Target />
              </span>
              <span className="truncate">Savings Targets</span>
            </div>
            <h2 className="page-title">Goals Progress</h2>
            <p className="page-subtitle break-words">
              {completed.length} of {list.length} completed
            </p>
          </div>
          <AddGoalButton />
        </div>
      </section>

      {list.length > 0 && (
        <GoalSummaryStats
          totalTarget={totalTarget}
          totalSaved={totalSaved}
          completedCount={completed.length}
          totalCount={list.length}
          overallPct={overallPct}
        />
      )}

      {list.length === 0 ? (
        <div className="finance-panel min-h-[280px] px-5">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first target to track savings progress and deadlines."
          />
        </div>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g as any} />
          ))}
        </div>
      )}
    </div>
  );
}
