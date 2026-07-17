import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("transaction filtering", () => {
  it("exposes type, category, account, date, amount, and sort controls", () => {
    const filters = readFileSync(
      join(process.cwd(), "components/transactions/TransactionFilters.tsx"),
      "utf8",
    );

    for (const field of [
      "Type",
      "Category",
      "Account",
      "From date",
      "To date",
      "Min amount",
      "Max amount",
      "Sort",
    ]) {
      expect(filters).toContain(`label=\"${field}\"`);
    }
    expect(filters).toContain('value="investment"');
    expect(filters).toContain('value="transfer"');
  });
});
