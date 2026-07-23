import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification persistence", () => {
  it("uses owner-scoped persisted state and real preferences", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260716122942_persist_notification_state.sql",
      ),
      "utf8",
    );
    const center = readFileSync(
      join(process.cwd(), "components/layout/NotificationCenter.tsx"),
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.notification_states");
    expect(migration).toContain("create table if not exists public.notification_preferences");
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(center).toContain('.from("notification_states").upsert(');
    expect(center).toContain("user_id: user.id");
    expect(center).toContain("notification_id: alert.id");
    expect(center).toContain("read_at: new Date().toISOString()");
    expect(center).toContain('{ onConflict: "user_id,notification_id" }');
    expect(center).toContain("router.push(alert.href)");
  });
});
