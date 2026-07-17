import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("account lifecycle", () => {
  it("archives accounts without deleting financial history", () => {
    const migration = readFileSync(
      join(
        root,
        "supabase/migrations/20260716124913_archive_accounts_safely.sql",
      ),
      "utf8",
    );
    const card = readFileSync(
      join(root, "components/accounts/AccountCard.tsx"),
      "utf8",
    );

    expect(migration).toContain("add column if not exists status text not null default 'active'");
    expect(migration).toContain("create index if not exists accounts_user_active_name_idx");
    expect(migration).toContain("create or replace function public.set_account_archived");
    expect(migration).toContain("create or replace function public.require_active_ledger_account");
    expect(migration).toContain("create or replace function public.protect_account_history");
    expect(card).toContain('supabase.rpc("set_account_archived"');
    expect(card).toContain("View history");
    expect(card).not.toContain('.from("accounts")\n      .delete()');
  });

  it("keeps archived accounts out of new transaction options", () => {
    const transactionModal = readFileSync(
      join(root, "components/dashboard/TransactionModal.tsx"),
      "utf8",
    );
    const transferModal = readFileSync(
      join(root, "components/accounts/TransferModal.tsx"),
      "utf8",
    );

    expect(transactionModal).toContain('.eq("status", "active")');
    expect(transferModal).toContain('.eq("status", "active")');
  });
});
