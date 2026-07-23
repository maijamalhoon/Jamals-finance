import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("business fixed asset contracts", () => {
  it("keeps fixed asset accounting in the canonical immutable ledger", () => {
    const foundation = read(
      "supabase/migrations/20260723111742_business_fixed_assets_depreciation_engine.sql",
    );

    expect(foundation).toContain("account_subtype='contra_asset' and normal_balance='credit'");
    expect(foundation).toContain("Direct fixed asset writes are not allowed.");
    expect(foundation).toContain("asset_capitalization");
    expect(foundation).toContain("asset_depreciation");
    expect(foundation).toContain("asset_disposal");
    expect(foundation).toContain("business_asset_journal_source_idx");
    expect(foundation).toContain("No open fiscal period contains the fixed asset journal date.");
  });

  it("enforces sequential monthly straight-line depreciation", () => {
    const foundation = read(
      "supabase/migrations/20260723111742_business_fixed_assets_depreciation_engine.sql",
    );

    expect(foundation).toContain("depreciation_method='straight_line'");
    expect(foundation).toContain("full_month");
    expect(foundation).toContain("next_month");
    expect(foundation).toContain("expected_period<>run_record.period_start");
    expect(foundation).toContain("book_value>asset.residual_value");
    expect(foundation).toContain("least(monthly_amount,remaining_amount)");
  });

  it("locks branch scope and capitalized category accounts", () => {
    const hardening = read(
      "supabase/migrations/20260723111949_harden_fixed_asset_branch_scope_and_category_accounts.sql",
    );

    expect(hardening).toContain("private.has_business_asset_scope");
    expect(hardening).toContain("All-branch access is required for a company-wide fixed asset record.");
    expect(hardening).toContain("Financial accounts cannot be changed after a category has capitalized assets.");
    expect(hardening).toContain("private.has_business_asset_scope(asset.business_id,asset.branch_id");
  });

  it("reuses canonical chart accounts without repurposing rent or utilities", () => {
    const foundation = read(
      "supabase/migrations/20260723111742_business_fixed_assets_depreciation_engine.sql",
    );
    const canonicalFix = read(
      "supabase/migrations/20260723112920_reuse_canonical_fixed_asset_accounts.sql",
    );

    for (const source of [foundation, canonicalFix]) {
      expect(source).toContain("system_key='fixed_assets'");
      expect(source).toContain("system_key='depreciation_expense'");
      expect(source).toContain("1590-FA");
      expect(source).toContain("4910-FA");
      expect(source).toContain("6910-FA");
      expect(source).not.toContain("'6200','Depreciation expense'");
      expect(source).not.toContain("'6300','Loss on disposal of assets'");
    }
  });

  it("connects the protected responsive workspace", () => {
    const dashboard = read("app/business/[businessSlug]/page.tsx");
    const page = read("app/business/[businessSlug]/fixed-assets/page.tsx");
    const workspace = read("components/business/BusinessFixedAssetsWorkspace.tsx");
    const panel = read("components/business/BusinessFinancialPermissionPanel.tsx");

    expect(dashboard).toContain('key: "fixed-assets"');
    expect(dashboard).toContain('"assets.view"');
    expect(page).toContain("get_business_assets_snapshot");
    expect(workspace).toContain("activate_business_fixed_asset");
    expect(workspace).toContain("post_business_asset_depreciation_run");
    expect(workspace).toContain("dispose_business_fixed_asset");
    expect(workspace).toContain("does not invent statutory tax rates");
    expect(panel).toContain('value: "assets.view"');
    expect(panel).toContain('value: "assets.manage"');
    expect(panel).toContain('value: "assets.depreciate"');
    expect(panel).toContain('value: "assets.dispose"');
  });
});
