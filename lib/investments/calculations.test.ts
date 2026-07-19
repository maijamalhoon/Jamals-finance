import { describe, expect, it } from "vitest";

import { calculateInvestmentPosition } from "./calculations";

describe("canonical investment mathematics", () => {
  it("keeps quantity, unit buy price, live price, and P/L synchronized", () => {
    expect(calculateInvestmentPosition(1, 50_000, 65_000)).toEqual({
      quantity: 1,
      purchasePrice: 50_000,
      currentPrice: 65_000,
      totalInvested: 50_000,
      currentValue: 65_000,
      totalPnL: 15_000,
      totalPnLPct: 30,
    });
  });

  it("recalculates every dependent value after an edit", () => {
    expect(calculateInvestmentPosition("2", "40", "55")).toEqual({
      quantity: 2,
      purchasePrice: 40,
      currentPrice: 55,
      totalInvested: 80,
      currentValue: 110,
      totalPnL: 30,
      totalPnLPct: 37.5,
    });
  });

  it("supports fractional worldwide market quantities without precision truncation", () => {
    const position = calculateInvestmentPosition(0.15494235, 64_540.14, 64_495.87);

    expect(position?.totalInvested).toBeCloseTo(10_000, 1);
    expect(position?.currentValue).toBeCloseTo(9_993.14, 1);
    expect(position?.totalPnL).toBeCloseTo(-6.86, 1);
    expect(position?.totalPnLPct).toBeCloseTo(-0.0686, 3);
  });

  it("rejects negative, malformed, and overflowing values", () => {
    expect(calculateInvestmentPosition(-1, 10, 20)).toBeNull();
    expect(calculateInvestmentPosition("bad", 10, 20)).toBeNull();
    expect(
      calculateInvestmentPosition(Number.MAX_VALUE, Number.MAX_VALUE, 1),
    ).toBeNull();
  });
});
