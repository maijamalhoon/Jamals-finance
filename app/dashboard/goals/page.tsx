import { createClient } from "@/lib/supabase/server";
import GoalCard from "@/components/goals/GoalCard";
import AddGoalButton from "@/components/goals/AddGoalButton";

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
  const totTarget = list.reduce((s, g) => s + Number(g.target_amount), 0);
  const totSaved = list.reduce((s, g) => s + Number(g.current_amount), 0);
  const overallPct = totTarget > 0 ? (totSaved / totTarget) * 100 : 0;

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold">Goals</h2>
          <p className="text-gray-500 text-sm mt-1">
            {completed.length} of {list.length} completed
          </p>
        </div>
        <AddGoalButton />
      </div>

      {/* Summary — only when goals exist */}
      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1.5">Total Target</p>
            <p className="text-white text-xl font-bold">{fmt(totTarget)}</p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1.5">Total Saved</p>
            <p className="text-white text-xl font-bold">{fmt(totSaved)}</p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1.5">Overall Progress</p>
            <p className="text-yellow-400 text-xl font-bold">
              {overallPct.toFixed(1)}%
            </p>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-yellow-400 rounded-full"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Goal Cards */}
      {list.length === 0 ?
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-16 text-center">
          <p className="text-gray-600 text-sm">No goals yet</p>
          <p className="text-gray-700 text-xs mt-1">
            Click "New Goal" to set your first financial target
          </p>
        </div>
      : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g as any} />
          ))}
        </div>
      }
    </div>
  );
}
