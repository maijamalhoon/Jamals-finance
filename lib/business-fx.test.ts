import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const fxSql = [
  "supabase/migrations/20260723125224_business_fx_foundation_schema.sql",
  "supabase/migrations/20260723125543_business_fx_controls_and_rates.sql",
  "supabase/migrations/20260723130138_business_fx_realized_settlement_engine.sql",
  "supabase/migrations/20260723130612_business_fx_revaluation_and_reversal_engine.sql",
  "supabase/migrations/20260723130827_business_fx_workspace_snapshot.sql",
  "supabase/migrations/20260723134250_split_fx_sales_settlement_source.sql",
  "supabase/migrations/20260723134345_split_fx_supplier_settlement_source.sql",
  "supabase/migrations/20260723134448_split_fx_revaluation_calculation_source.sql",
  "supabase/migrations/20260723134532_split_fx_revaluation_post_reverse_source.sql",
  "supabase/migrations/20260723134553_split_fx_revaluation_cancel_source.sql",
  "supabase/migrations/20260723135429_index_fx_lifecycle_foreign_keys.sql",
].map(read).join("\n");

describe("business multi-currency and FX contracts", () => {
  it("keeps rates tenant scoped and used rates immutable", () => {
    expect(fxSql).toContain("create table if not exists public.business_fx_rates");
    expect(fxSql).toContain("unique(business_id,currency,rate_date)");
    expect(fxSql).toContain("A rate used by a settlement or revaluation is immutable.");
    expect(fxSql).toContain("A used FX rate cannot be deleted.");
    expect(fxSql).toContain("No exchange rate is available on or before");
  });

  it("posts realized settlement differences without changing public payment RPC names", () => {
    expect(fxSql).toContain("fx_sales_payment");
    expect(fxSql).toContain("fx_supplier_payment");
    expect(fxSql).toContain("carrying_amount_base");
    expect(fxSql).toContain("realized_fx_gain_base");
    expect(fxSql).toContain("realized_fx_loss_base");
    expect(fxSql).toContain("Reverse the active FX revaluation before collecting this invoice.");
    expect(fxSql).toContain("Reverse the active FX revaluation before paying this supplier bill.");
  });

  it("requires reversible period-end revaluation and skips unsafe bank ledgers", () => {
    expect(fxSql).toContain("fx_revaluation");
    expect(fxSql).toContain("fx_revaluation_reversal");
    expect(fxSql).toContain("Reverse the active FX revaluation before creating another run.");
    expect(fxSql).toContain("skipped_bank_count");
    expect(fxSql).toContain("mixed_currency_ledger");
    expect(fxSql).toContain("entry.entry_date<=run_record.closing_date");
  });

  it("uses protected FX permissions and dedicated gain-loss accounts", () => {
    for (const permission of ["fx.view", "fx.manage", "fx.revalue"]) expect(fxSql).toContain(`'${permission}'`);
    for (const key of ["realized_fx_gain", "realized_fx_loss", "unrealized_fx_gain", "unrealized_fx_loss"]) expect(fxSql).toContain(key);
    for (const code of ["4920-FX", "4930-FX", "6920-FX", "6930-FX"]) expect(fxSql).toContain(code);
  });

  it("indexes FX lifecycle foreign keys", () => {
    for (const index of [
      "business_fx_settings_updated_by_idx",
      "business_fx_runs_created_by_idx",
      "business_fx_runs_posted_by_idx",
      "business_fx_runs_reversed_by_idx",
      "business_fx_runs_cancelled_by_idx",
    ]) expect(fxSql).toContain(index);
  });

  it("connects the responsive company-wide FX workspace", () => {
    const dashboard = read("app/business/[businessSlug]/page.tsx");
    const page = read("app/business/[businessSlug]/fx/page.tsx");
    const workspace = read("components/business/BusinessFxWorkspace.tsx");
    const panel = read("components/business/BusinessFinancialPermissionPanel.tsx");

    expect(dashboard).toContain('key: "fx"');
    expect(dashboard).toContain('hasAny("fx.view", "fx.manage", "fx.revalue")');
    expect(page).toContain("get_business_fx_snapshot");
    expect(page).toContain("branch_access_mode");
    expect(workspace).toContain("upsert_business_fx_rate");
    expect(workspace).toContain("post_business_fx_revaluation_run");
    expect(workspace).toContain("reverse_business_fx_revaluation_run");
    expect(workspace).toContain("no market rate is invented automatically");
    expect(panel).toContain('value: "fx.view"');
    expect(panel).toContain('value: "fx.manage"');
    expect(panel).toContain('value: "fx.revalue"');
  });
});
