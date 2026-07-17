import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("transfer activity ledger", () => {
  it("loads account transfers into the transaction list without treating them as cash flow", () => {
    const source = readFileSync(join(process.cwd(), "lib/transactions.ts"), "utf8");
    const page = readFileSync(
      join(process.cwd(), "app/dashboard/transactions/page.tsx"),
      "utf8",
    );

    expect(source).toContain('.from("account_transfers")');
    expect(source).toContain('type: "transfer" as const');
    expect(source).toContain("from_account:from_account_id(name)");
    expect(source).toContain("to_account:to_account_id(name)");
    expect(page).toContain('type === "transfer"');
  });
});
