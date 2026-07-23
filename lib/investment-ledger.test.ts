import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  "supabase/migrations/20260716132048_classify_investment_contributions_neutral.sql",
  "utf8",
);
const transactionRowSource = readFileSync(
  "components/transactions/TransactionRow.tsx",
  "utf8",
);
const receiptSource = readFileSync(
  "app/dashboard/transactions/[id]/page.tsx",
  "utf8",
);

describe("investment ledger classification", () => {
  it("stores investment purchases as neutral contributions while preserving cash outflow", () => {
    expect(migrationSource).toContain("'investment'::text");
    expect(migrationSource).toContain("when tx_type in ('expense', 'investment')");
    expect(migrationSource).toContain("set type = 'investment'");
    expect(migrationSource).toContain("'Investment contribution: '");
  });

  it("keeps linked contributions out of generic edit and delete actions", () => {
    expect(transactionRowSource).toContain('type === "investment"');
    expect(transactionRowSource).toContain(
      'const canDelete = !isDeleted && type !== "investment"',
    );
    expect(transactionRowSource).toContain(
      '(type === "income" || type === "expense")',
    );
    expect(transactionRowSource).toContain(
      'return tx.item_name || tx.categories?.name || "Investment"',
    );
  });

  it("renders investment receipts with their own neutral identity", () => {
    expect(receiptSource).toContain('type ReceiptType =');
    expect(receiptSource).toContain('| "investment"');
    expect(receiptSource).toContain('| "goal"');
    expect(receiptSource).toContain('label: "Investment contribution"');
    expect(receiptSource).toContain('accent: "var(--investment)"');
  });
});
