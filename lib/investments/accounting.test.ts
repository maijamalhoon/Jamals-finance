import { describe, expect, it } from "vitest";

import {
  calculateInvestmentPrincipalRefund,
  calculateInvestmentWithdrawal,
  normalizeInvestmentUnitPrice,
} from "./accounting";

describe("investment accounting", () => {
  it("normalizes PKR and USD prices without mixing currencies", () => {
    expect(normalizeInvestmentUnitPrice(150, "PKR", 999)).toBe(150);
    expect(normalizeInvestmentUnitPrice(150, "USD", 280)).toBe(42_000);
  });

  it("calculates partial realized profit from cost basis and proceeds", () => {
    expect(
      calculateInvestmentWithdrawal({
        quantity: 0.4,
        purchasePricePkr: 100,
        withdrawalPriceOriginal: 150,
        withdrawalCurrency: "PKR",
        withdrawalExchangeRate: 1,
      }),
    ).toEqual({
      quantity: 0.4,
      withdrawalUnitPricePkr: 150,
      costBasisPkr: 40,
      proceedsPkr: 60,
      realizedPnlPkr: 20,
    });
  });

  it("calculates USD withdrawal proceeds using the confirmed FX rate", () => {
    expect(
      calculateInvestmentWithdrawal({
        quantity: 2,
        purchasePricePkr: 2_800,
        withdrawalPriceOriginal: 12,
        withdrawalCurrency: "USD",
        withdrawalExchangeRate: 280,
      }),
    ).toEqual({
      quantity: 2,
      withdrawalUnitPricePkr: 3_360,
      costBasisPkr: 5_600,
      proceedsPkr: 6_720,
      realizedPnlPkr: 1_120,
    });
  });

  it("returns only principal when an investment is deleted", () => {
    expect(calculateInvestmentPrincipalRefund(2, 2_800)).toBe(5_600);
  });

  it("rejects unsafe values", () => {
    expect(calculateInvestmentPrincipalRefund(0, 100)).toBeNull();
    expect(
      calculateInvestmentWithdrawal({
        quantity: 1,
        purchasePricePkr: 100,
        withdrawalPriceOriginal: -1,
        withdrawalCurrency: "PKR",
        withdrawalExchangeRate: 1,
      }),
    ).toBeNull();
  });
});
