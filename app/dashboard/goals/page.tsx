import AddGoalButton from "@/components/goals/AddGoalButton";
import GoalCard from "@/components/goals/GoalCard";
import GoalSummaryStats from "@/components/goals/GoalSummaryStats";
import {
  getDistinctGoalPresentationAssignments,
} from "@/components/goals/goal-icons";
import type { ExistingGoal, GoalAccount } from "@/components/goals/GoalModal";
import EmptyState from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Target } from "@/components/icons/jalvoro/compat";

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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function safePositive(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

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
        linked_account:accounts!goals_account_owner_fkey(id, name, type),
        goal_contributions!goal_contributions_goal_owner_fkey(
          id,
          amount,
          contributed_at,
          note,
          contribution_account:accounts!goal_contributions_account_owner_fkey(id, name, type)
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
    const raw = goal as unknown as Omit<
      GoalRow,
      "linked_account" | "goal_contributions"
    > & {
      linked_account: GoalAccount | GoalAccount[] | null;
      goal_contributions: Array<
        Omit<GoalContributionRow, "contribution_account"> & {
          contribution_account: GoalAccount | GoalAccount[] | null;
        }
      >;
    };

    return {
      ...raw,
      linked_account: firstRelation(raw.linked_account),
      goal_contributions: (raw.goal_contributions ?? []).map((contribution) => ({
        ...contribution,
        contribution_account: firstRelation(contribution.contribution_account),
      })),
    } satisfies GoalRow;
  });
  const accountList = (accounts ?? []) as GoalAccount[];
  const presentations = getDistinctGoalPresentationAssignments(list);
  const completed = list.filter((goal) => {
    const target = safePositive(goal.target_amount);
    const current = safePositive(goal.current_amount);
    return target > 0 && current >= target;
  });
  const totalTarget = list.reduce(
    (sum, goal) => sum + safePositive(goal.target_amount),
    0,
  );
  const totalSaved = list.reduce(
    (sum, goal) => sum + safePositive(goal.current_amount),
    0,
  );
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div data-goals-page className="space-y-4 pb-8 sm:space-y-5">
      <div data-page-action-row className="flex justify-end">
        <AddGoalButton accounts={accountList} icon="plus" />
      </div>

      {list.length > 0 ? (
        <GoalSummaryStats
          totalTarget={totalTarget}
          totalSaved={totalSaved}
          completedCount={completed.length}
          totalCount={list.length}
          overallPct={overallPct}
        />
      ) : null}

      {accountsError && !goalsError ? (
        <div
          role="status"
          className="finance-panel-soft flex items-start gap-3 p-4 text-sm text-text-secondary"
        >
          <AlertTriangle
            className="mt-0.5 shrink-0 text-warning"
            size={18}
            strokeWidth={2.35}
            aria-hidden="true"
          />
          <p>
            Goals are available, but linked accounts could not be loaded. Refresh
            before editing account links.
          </p>
        </div>
      ) : null}

      {goalsError ? (
        <div className="finance-panel min-h-[220px] px-4 sm:px-5">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load goals"
            description="Refresh the page or try again after checking your connection."
          />
        </div>
      ) : list.length === 0 ? (
        <div className="py-3 sm:py-6">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first goal to see savings progress and deadlines here."
            action={
              <AddGoalButton
                accounts={accountList}
                label="Create a goal"
                showIcon={false}
              />
            }
          />
        </div>
      ) : (
        <div
          data-goals-grid
          className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4"
        >
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
