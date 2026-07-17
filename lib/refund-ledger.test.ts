import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildExpenseCategoryBreakdown,
  sumTransactions,
  type AnalyticsTransactionData,
} from "./analytics/calculations";

const range = { start: "2026-07-01", end: "2026-07-31" };

function row(
  id: string,
  type: "expense" | "refund",
  amount: number,
): AnalyticsTransactionData {
  return {
    id,
    type,
    amount,
    date: "2026-07-16",
    categoryId: "shopping",
    categoryName: "Shopping",
    categoryColor: "#ef4444",
    accountId: "wallet",
    accountName: "Wallet",
  };
}

describe("expense refunds", () => {
  it("reduces expenses without becoming income", () => {
    const transactions = [row("expense", "expense", 100), row("refund", "refund", 35)];

    expect(sumTransactions(transactions, range, "income")).toBe(0);
    expect(sumTransactions(transactions, range, "expense")).toBe(65);
    expect(buildExpenseCategoryBreakdown(transactions, range)).toEqual([
      expect.objectContaining({ name: "Shopping", amount: 65, percentage: 100 }),
    ]);
  });

  it("links refunds to an expense and caps their aggregate amount in Postgres", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260716130302_link_expense_refunds.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("refund_of_transaction_id");
    expect(migration).toContain("for update;");
    expect(migration).toContain("already_refunded + new.amount > original_expense.amount");
    expect(migration).toContain("when tx_type in ('income', 'refund')");
  });
});
