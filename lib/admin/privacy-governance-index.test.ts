import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("privacy governance index contracts", () => {
  it("indexes every privacy-governance foreign key used by operations", () => {
    const foundation = read(
      "supabase/migrations/20260724023000_privacy_governance_control_center.sql",
    );
    const indexes = read(
      "supabase/migrations/20260724023100_index_privacy_governance_foreign_keys.sql",
    );

    expect(foundation).toContain("privacy_requests_subject_idx");
    expect(foundation).toContain("privacy_requests_assignee_idx");
    expect(indexes).toContain("privacy_retention_runs_actor_admin_idx");
  });
});
