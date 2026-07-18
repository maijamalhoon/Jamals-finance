import { createClient } from "@/lib/supabase/server";
import GoalCard from "@/components/goals/GoalCard";
import AddGoalButton from "@/components/goals/AddGoalButton";
import GoalSummaryStats from "@/components/goals/GoalSummaryStats";
import {
  getDistinctGoalPresentationAssignments,
} from "@/components/goals/goal-icons";
import EmptyState from "@/components/ui/empty-state";
import { AlertTriangle, Target } from "lucide-react";
import type { ExistingGoal, GoalAccount } from "@/components/goals/GoalModal";

interface GoalContributionRow {
  id: string;
  amount: number;
  contributed_at: string;
  note: string | null;
  contribution_account: GoalAccount | null;
}

interface GoalRow extends ExistingGoal {
  linked_account: GoalAccount | null;
  goal_contributions: GoalContributionRow[];
}

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const supabase = await createClient();

  const [goalsResult, accountsResult] = await Promise.all([
    supabase
      .from("goals")
      .select(`
        id,
        name,
        target_amount,
        current_amount,
        deadline,
        icon,
        account_id,
        linked_account:account_id(id, name, type),
        goal_contributions(
          id,
          amount,
          contributed_at,
          note,
          contribution_account:account_id(id, name, type)
        )
      `)
      .order("created_at", { ascending: false })
      .order("contributed_at", {
        referencedTable: "goal_contributions",
        ascending: false,
      }),
    supabase
      .from("accounts")
      .select("id, name, type")
      .eq("status", "active")
      .order("name"),
  ]);

  const { data: goals, error: goalsError } = goalsResult;
  const { data: accounts, error: accountsError } = accountsResult;

  if (goalsError) {
    console.error("Failed to load goals", { code: goalsError.code });
  }
  if (accountsError) {
    console.error("Failed to load goal accounts", { code: accountsError.code });
  }

  const list = (goals ?? []).map((goal) => {
    const raw = goal as unknown as Omit<GoalRow, "linked_account" | "goal_contributions"> & {
      linked_account: GoalAccount[];
      goal_contributions: Array<
        Omit<GoalContributionRow, "contribution_account"> & {
          contribution_account: GoalAccount[];
        }
      >;
    };

    return {
      ...raw,
      linked_account: raw.linked_account?.[0] ?? null,
      goal_contributions: (raw.goal_contributions ?? []).map((contribution) => ({
        ...contribution,
        contribution_account: contribution.contribution_account?.[0] ?? null,
      })),
    } satisfies GoalRow;
  });
  const accountList = (accounts ?? []) as GoalAccount[];
  const presentations = getDistinctGoalPresentationAssignments(list);
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
          <AddGoalButton accounts={accountList} />
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

      {accountsError && !goalsError ? (
        <div role="status" className="finance-panel-soft flex items-start gap-3 p-4 text-sm text-text-secondary">
          <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} aria-hidden="true" />
          <p>Goals are available, but linked accounts could not be loaded. Refresh before editing account links.</p>
        </div>
      ) : null}

      {goalsError ? (
        <div className="finance-panel min-h-[280px] px-5">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load goals"
            description="Refresh the page or try again after checking your connection."
          />
        </div>
      ) : list.length === 0 ? (
        <div className="finance-panel min-h-[280px] px-5">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first target to track savings progress and deadlines."
          />
        </div>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              accounts={accountList}
              presentation={presentations[index]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
