import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("business approval control contracts", () => {
  it("keeps maker-checker and branch isolation below the UI", () => {
    const foundation = read(
      "supabase/migrations/20260723073914_business_approval_controls_foundation.sql",
    );
    const multiStageFix = read(
      "supabase/migrations/20260723074122_release_multi_stage_approval_assignment.sql",
    );

    expect(foundation).toContain("Requester cannot approve or reject their own request.");
    expect(foundation).toContain("private.has_business_branch_access");
    expect(foundation).toContain("business_approval_requests_open_subject_idx");
    expect(foundation).toContain("Direct approval workflow writes are not allowed.");
    expect(foundation).toContain("business_approval_decisions_actor_final_idx");
    expect(multiStageFix).toContain("assigned_to=case when approvals_total>=required_approvals");
  });

  it("keeps the workspace connected to the dashboard and protected permissions", () => {
    const dashboard = read("app/business/[businessSlug]/page.tsx");
    const page = read("app/business/[businessSlug]/approvals/page.tsx");
    const panel = read("components/business/BusinessFinancialPermissionPanel.tsx");

    expect(dashboard).toContain('key: "approvals"');
    expect(dashboard).toContain("canViewApprovals");
    expect(page).toContain('get_business_approvals_snapshot');
    expect(panel).toContain('value: "approvals.request"');
    expect(panel).toContain('value: "approvals.decide"');
    expect(panel).toContain('value: "approvals.manage"');
  });

  it("does not imply that approval alone executes an operational action", () => {
    const workspace = read("components/business/BusinessApprovalsWorkspace.tsx");

    expect(workspace).toContain("They do not post journals, move stock, pay suppliers");
    expect(workspace).toContain('create_business_approval_request');
    expect(workspace).toContain('decide_business_approval_request');
    expect(workspace).toContain('assign_business_approval_request');
    expect(workspace).toContain('cancel_business_approval_request');
  });
});
