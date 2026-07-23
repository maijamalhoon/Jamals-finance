import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("transaction filtering", () => {
  it("exposes search, type, period, and sort controls", () => {
    const filters = readFileSync(
      join(process.cwd(), "components/transactions/TransactionFilters.tsx"),
      "utf8",
    );

    expect(filters).toContain("TYPE_OPTIONS");
    expect(filters).toContain("PERIOD_OPTIONS");
    expect(filters).toContain("SORT_OPTIONS");
    expect(filters).toContain('searchParams.get("search")');
    expect(filters).toContain('searchParams.get("type")');
    expect(filters).toContain('searchParams.get("period")');
    expect(filters).toContain('searchParams.get("sort")');
    expect(filters).toContain('value: "investment"');
    expect(filters).toContain('value: "transfer"');
  });
});
