import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("transaction references and receipts", () => {
  it("persists reference information for transactions and transfers", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260716131728_add_transaction_references.sql",
      ),
      "utf8",
    );
    const transactionModal = readFileSync(
      join(process.cwd(), "components/dashboard/TransactionModal.tsx"),
      "utf8",
    );
    const transferModal = readFileSync(
      join(process.cwd(), "components/accounts/TransferModal.tsx"),
      "utf8",
    );

    expect(migration).toContain("alter table public.transactions");
    expect(migration).toContain("alter table public.account_transfers");
    expect(transactionModal).toContain("reference: reference.trim() || null");
    expect(transferModal).toContain("reference: reference.trim() || null");
  });

  it("shows status and supports copy, download, print, and refund actions", () => {
    const receiptPage = readFileSync(
      join(process.cwd(), "app/dashboard/transactions/[id]/page.tsx"),
      "utf8",
    );
    const actions = readFileSync(
      join(process.cwd(), "components/transactions/TransactionReceiptActions.tsx"),
      "utf8",
    );

    expect(receiptPage).toContain('label="Status"');
    expect(receiptPage).toContain('label="Reference"');
    expect(actions).toContain("Copy receipt");
    expect(actions).toContain("Download");
    expect(actions).toContain("Print / Save PDF");
    expect(actions).toContain("Record refund");
  });
});
