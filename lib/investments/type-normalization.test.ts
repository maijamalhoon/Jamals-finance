import { describe, expect, it } from "vitest";

import {
  normalizeInvestmentEditorType,
  normalizeInvestmentMarketType,
} from "./type-normalization";

describe("investment type normalization", () => {
  it("normalizes stock aliases to the singular market type", () => {
    for (const value of [
      "stock",
      "stocks",
      "Equity",
      "equities",
      "share",
      "shares",
    ]) {
      expect(normalizeInvestmentMarketType(value)).toBe("stock");
    }
  });

  it("normalizes forex and crypto aliases", () => {
    expect(normalizeInvestmentMarketType("FX")).toBe("forex");
    expect(normalizeInvestmentMarketType("currencies")).toBe("forex");
    expect(normalizeInvestmentMarketType("cryptocurrency")).toBe("crypto");
    expect(normalizeInvestmentMarketType("coins")).toBe("crypto");
  });

  it("keeps unsupported manual categories in the editor fallback", () => {
    expect(normalizeInvestmentMarketType("real_estate")).toBeNull();
    expect(normalizeInvestmentEditorType("real_estate")).toBe("other");
    expect(normalizeInvestmentEditorType(null)).toBe("other");
  });
});
