import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("account integrity", () => {
  const source = readFileSync(
    join(process.cwd(), "components/accounts/AccountModal.tsx"),
    "utf8",
  );

  it("uses an account type accepted by the live wallet constraint", () => {
    expect(source).toContain("getAutomaticAccountVisual");
    expect(source).toContain("type: visual.legacyType");
    expect(source).not.toContain('"other_wallet"');
  });

  it("does not overwrite a derived balance while editing account details", () => {
    expect(source).toContain("disabled={isEditing}");
    expect(source).toContain('.from("accounts")');
    expect(source).toContain(".update(accountDetails)");
    expect(source).toContain('.eq("id", account!.id)');
    expect(source).toContain("balance: openingBalance");
  });
});
