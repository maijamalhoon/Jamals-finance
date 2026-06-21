import { createClient } from "@/lib/supabase/server";
import GoalCard from "@/components/goals/GoalCard";
import AddGoalButton from "@/components/goals/AddGoalButton";
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

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Goals</h2>
          <p className="page-subtitle">
            {completed.length} of {list.length} completed
          </p>
        </div>
        <AddGoalButton />
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="summary-card">
            <p className="mb-1.5 text-xs text-slate-500">Total Target</p>
            <p className="text-xl font-bold text-text-primary">{fmt(totalTarget)}</p>
          </div>

          <div className="summary-card">
            <p className="mb-1.5 text-xs text-slate-500">Total Saved</p>
            <p className="text-xl font-bold text-text-primary">{fmt(totalSaved)}</p>
          </div>

          <div className="summary-card">
            <p className="mb-1.5 text-xs text-slate-500">Overall Progress</p>
            <p className="text-xl font-bold text-amber-300">
              {overallPct.toFixed(1)}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="motion-progress-fill h-full rounded-full bg-amber-300"
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first target to track savings progress and deadlines."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g as any} />
          ))}
        </div>
      )}
    </div>
  );
}
