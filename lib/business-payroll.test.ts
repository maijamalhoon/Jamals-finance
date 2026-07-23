import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("business payroll contracts", () => {
  it("keeps payroll connected to dashboard and protected permissions", () => {
    const dashboard = read("app/business/[businessSlug]/page.tsx");
    const page = read("app/business/[businessSlug]/payroll/page.tsx");
    const panel = read("components/business/BusinessFinancialPermissionPanel.tsx");

    expect(dashboard).toContain('key: "payroll"');
    expect(dashboard).toContain('route: "payroll"');
    expect(dashboard).toContain('"payroll.view"');
    expect(page).toContain("get_business_payroll_snapshot");
    expect(panel).toContain('value: "payroll.manage"');
    expect(panel).toContain('value: "payroll.process"');
    expect(panel).toContain('value: "payroll.pay"');
  });

  it("keeps approval, accrual, and payment actions explicit", () => {
    const workspace = read("components/business/BusinessPayrollWorkspace.tsx");

    expect(workspace).toContain("submit_business_payroll_run");
    expect(workspace).toContain("post_business_payroll_run");
    expect(workspace).toContain("pay_business_payroll_run");
    expect(workspace).toContain(
      "Employee deductions and employer contributions remain separate liabilities until remitted.",
    );
  });

  it("posts balanced payroll sources and protects salary settlement", () => {
    const accounting = read(
      "supabase/migrations/20260723090822_business_payroll_accounting_payment_engine.sql",
    );
    const snapshotFix = read(
      "supabase/migrations/20260723091546_fix_payroll_snapshot_payment_account_visibility.sql",
    );

    expect(accounting).toContain("employer_payroll_payable");
    expect(accounting).toContain("payroll_accrual");
    expect(accounting).toContain("payroll_payment");
    expect(accounting).toContain("Only an approved payroll run can be posted.");
    expect(accounting).toContain("Only a posted payroll run can be paid.");
    expect(accounting).toContain("Payment date cannot be before the payroll period end.");
    expect(snapshotFix).toContain("account.is_active");
  });
});
