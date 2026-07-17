import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("liability payment ledger", () => {
  it("records the expense and payment through one authenticated RPC", () => {
    const modal = readFileSync(
      join(root, "components/payables/PaymentModal.tsx"),
      "utf8",
    );
    const migration = readFileSync(
      join(
        root,
        "supabase/migrations/20260716120300_record_liability_payment_atomically.sql",
      ),
      "utf8",
    );

    expect(modal).toContain('supabase.rpc(\n        "record_liability_payment"');
    expect(modal).not.toContain('.from("transactions")\n        .insert');
    expect(migration).toContain("for update;");
    expect(migration).toContain("insert into public.transactions");
    expect(migration).toContain("insert into public.liability_payments");
    expect(migration).toContain("to authenticated;");
    expect(migration).toContain("from public, anon;");
  });
});
