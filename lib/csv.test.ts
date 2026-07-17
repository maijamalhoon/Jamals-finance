import { describe, expect, it } from "vitest";

import { escapeCsvCell, serializeCsv } from "./csv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("CSV export safety", () => {
  it("escapes quotes and neutralizes spreadsheet formula prefixes", () => {
    expect(escapeCsvCell('Taxi "ride"')).toBe('"Taxi ""ride"""');
    expect(escapeCsvCell("=HYPERLINK(\"https://example.com\")")).toBe(
      '"\'=HYPERLINK(""https://example.com"")"',
    );
    expect(escapeCsvCell("+1+1")).toBe('"\'+1+1"');
  });

  it("uses CRLF rows for spreadsheet compatibility", () => {
    expect(serializeCsv([["A", "B"], [1, 2]])).toBe('"A","B"\r\n"1","2"');
  });

  it("exports the separate transfer ledger with an explicit transfer type", () => {
    const exportSource = readFileSync(
      join(process.cwd(), "components/reports/ExportButton.tsx"),
      "utf8",
    );

    expect(exportSource).toContain('.from("account_transfers")');
    expect(exportSource).toContain('type: "transfer"');
    expect(exportSource).toContain("from_account:from_account_id(name)");
    expect(exportSource).toContain("to_account:to_account_id(name)");
  });
});
