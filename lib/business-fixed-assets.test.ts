import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const fixedAssetSql = [
  "supabase/migrations/20260723111742_business_fixed_assets_depreciation_engine.sql",
  "supabase/migrations/20260723122228_fixed_asset_controls_and_initialization.sql",
  "supabase/migrations/20260723122341_fixed_asset_registration_and_capitalization_operations.sql",
  "supabase/migrations/20260723122501_fixed_asset_depreciation_and_disposal_operations.sql",
  "supabase/migrations/20260723122616_fixed_asset_api_snapshot_and_rls.sql",
  "supabase/migrations/20260723122723_finalize_fixed_asset_branch_scope_after_api.sql",
].map(read).join("\n");

describe("business fixed asset contracts", () => {
  it("keeps fixed asset accounting in the canonical immutable ledger", () => {
    expect(fixedAssetSql).toContain("account_subtype='contra_asset' and normal_balance='credit'");
    expect(fixedAssetSql).toContain("Direct fixed asset writes are not allowed.");
    expect(fixedAssetSql).toContain("asset_capitalization");
    expect(fixedAssetSql).toContain("asset_depreciation");
    expect(fixedAssetSql).toContain("asset_disposal");
    expect(fixedAssetSql).toContain("business_asset_journal_source_idx");
    expect(fixedAssetSql).toContain("No open fiscal period contains the fixed asset journal date.");
  });

  it("enforces sequential monthly straight-line depreciation", () => {
    expect(fixedAssetSql).toContain("depreciation_method='straight_line'");
    expect(fixedAssetSql).toContain("full_month");
    expect(fixedAssetSql).toContain("next_month");
    expect(fixedAssetSql).toContain("expected_period<>run_record.period_start");
    expect(fixedAssetSql).toContain("book_value>asset.residual_value");
    expect(fixedAssetSql).toContain("least(monthly_amount,remaining_amount)");
  });

  it("locks branch scope and capitalized category accounts", () => {
    const bootstrap = read(
      "supabase/migrations/20260723111949_harden_fixed_asset_branch_scope_and_category_accounts.sql",
    );
    const finalHardening = read(
      "supabase/migrations/20260723122723_finalize_fixed_asset_branch_scope_after_api.sql",
    );
    const hardening = `${bootstrap}\n${finalHardening}`;

    expect(hardening).toContain("private.has_business_asset_scope");
    expect(hardening).toContain("All-branch access is required for a company-wide fixed asset record.");
    expect(hardening).toContain("Financial accounts cannot be changed after a category has capitalized assets.");
    expect(hardening).toContain("private.has_business_asset_scope(asset.business_id,asset.branch_id");
  });

  it("reuses canonical chart accounts without repurposing rent or utilities", () => {
    const controls = read(
      "supabase/migrations/20260723122228_fixed_asset_controls_and_initialization.sql",
    );
    const canonicalFix = read(
      "supabase/migrations/20260723112920_reuse_canonical_fixed_asset_accounts.sql",
    );

    for (const source of [controls, canonicalFix]) {
      expect(source).toContain("system_key='fixed_assets'");
      expect(source).toContain("system_key='depreciation_expense'");
      expect(source).toContain("1590-FA");
      expect(source).toContain("4910-FA");
      expect(source).toContain("6910-FA");
      expect(source).not.toContain("'6200','Depreciation expense'");
      expect(source).not.toContain("'6300','Loss on disposal of assets'");
    }
  });

  it("indexes the depreciation account foreign keys", () => {
    const indexes = read(
      "supabase/migrations/20260723120430_index_fixed_asset_depreciation_account_foreign_keys.sql",
    );

    expect(indexes).toContain("business_asset_depreciation_lines_expense_idx");
    expect(indexes).toContain("business_asset_depreciation_lines_accumulated_idx");
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
