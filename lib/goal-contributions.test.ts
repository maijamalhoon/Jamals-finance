import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("goal contribution ledger", () => {
  it("changes progress atomically without creating an expense or changing account cash", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260716123747_goal_contributions.sql",
      ),
      "utf8",
    );
    const modal = readFileSync(
      join(process.cwd(), "components/goals/GoalContributionModal.tsx"),
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.goal_contributions");
    expect(migration).toContain("for update;");
    expect(migration).toContain("set current_amount = current_amount + p_amount");
    expect(migration).toContain("set current_amount = greatest(current_amount - contribution_row.amount, 0)");
    expect(migration).not.toContain("insert into public.transactions");
    expect(migration).not.toContain("update public.accounts");
    expect(modal).toContain('supabase.rpc(\n      "record_goal_contribution"');
    expect(modal).toContain("It does not count as an expense or change the linked account balance.");

  });
});
