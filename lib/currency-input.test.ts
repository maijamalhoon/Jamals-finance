import { describe, expect, it } from "vitest";

import type { CurrencyRates } from "./currency";
import {
  getEditableMoneyValue,
  parseMoneyInput,
  prepareMoneyInput,
} from "./currency-input";

const RATES: CurrencyRates = {
  USD: 1,
  PKR: 280,
  INR: 84,
  EUR: 0.8,
  GBP: 0.7,
  JPY: 150,
  CNY: 7.2,
};

describe("currency input normalization", () => {
  it("preserves the entered value and locks the PKR conversion rate", () => {
    expect(prepareMoneyInput(2_000, "EUR", RATES)).toEqual({
      amountPkr: 700_000,
      originalAmount: 2_000,
      currency: "EUR",
      exchangeRateToPkr: 350,
    });
  });

  it("treats PKR as the canonical ledger without conversion", () => {
    expect(prepareMoneyInput("2000.25", "PKR", RATES)).toEqual({
      amountPkr: 2_000.25,
      originalAmount: 2_000.25,
      currency: "PKR",
      exchangeRateToPkr: 1,
    });
  });

  it("rejects blank and malformed numeric input", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(prepareMoneyInput("not-money", "USD", RATES)).toBeNull();
  });

  it("returns the exact original amount when editing in its own currency", () => {
    expect(
      getEditableMoneyValue({
        amountPkr: 700_000,
        originalAmount: 2_000,
        originalCurrency: "EUR",
        displayCurrency: "EUR",
        rates: RATES,
      }),
    ).toBe(2_000);
  });

  it("converts from the canonical ledger for a different display currency", () => {
    expect(
      getEditableMoneyValue({
        amountPkr: 700_000,
        originalAmount: 2_000,
        originalCurrency: "EUR",
        displayCurrency: "JPY",
        rates: RATES,
      }),
    ).toBeCloseTo(375_000, 8);
  });
});
