import { describe, expect, it } from "vitest";

import {
  getAvailableTransferBalance,
  getMaximumTransferInput,
  getTransferAmountIssue,
} from "./transfer-amount";

describe("transfer amount limits", () => {
  it("normalizes unavailable and negative balances to zero", () => {
    expect(getAvailableTransferBalance(null)).toBe(0);
    expect(getAvailableTransferBalance("not-a-number")).toBe(0);
    expect(getAvailableTransferBalance(-10)).toBe(0);
    expect(getAvailableTransferBalance("35042.75")).toBe(35042.75);
  });

  it("allows the exact balance and rejects any larger transfer", () => {
    expect(getTransferAmountIssue("35042.75", 35042.75)).toBeNull();
    expect(getTransferAmountIssue("35042.76", 35042.75)).toBe(
      "exceeds-balance",
    );
  });

  it("allows Max when its 8-decimal input is microscopically rounded up", () => {
    const availableBalance = 19397902.691168567;

    expect(
      getTransferAmountIssue("19397902.69116857", availableBalance),
    ).toBeNull();
    expect(
      getTransferAmountIssue("19397902.69116858", availableBalance),
    ).toBe("exceeds-balance");
  });

  it("preserves decimal balances when applying Max", () => {
    expect(getMaximumTransferInput(35042.75)).toBe("35042.75");
    expect(getMaximumTransferInput(0)).toBe("");
  });
});
