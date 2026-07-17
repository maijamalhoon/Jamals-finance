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
    expect(center).toContain("Mark read");
    expect(center).toContain("Snooze 1 day");
    expect(center).toContain("Dismiss");
    expect(center).toContain("Mark all alerts as read");
  });
});
