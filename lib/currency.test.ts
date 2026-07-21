import { describe, expect, it } from "vitest";

import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertMoney,
  formatMoney,
  getCurrencyFractionDigits,
  isValidCurrencyRates,
  type CurrencyRates,
} from "./currency";

const RATES: CurrencyRates = {
  USD: 1,
  PKR: 280,
  INR: 84,
  EUR: 0.8,
  GBP: 0.7,
  JPY: 150,
  CNY: 7.2,
};

describe("shared currency system", () => {
  it("supports the complete configured currency set", () => {
    expect(SUPPORTED_CURRENCIES).toEqual([
      "PKR",
      "USD",
      "INR",
      "EUR",
      "GBP",
      "JPY",
      "CNY",
    ]);
    expect(isValidCurrencyRates(RATES)).toBe(true);
  });

  it("converts once through the USD pivot without switch drift", () => {
    const originalPkr = 1_234_567.891234;
    const usd = convertMoney(originalPkr, "PKR", "USD", RATES);
    const eur = convertMoney(usd, "USD", "EUR", RATES);
    const jpy = convertMoney(eur, "EUR", "JPY", RATES);
    const backToPkr = convertMoney(jpy, "JPY", BASE_CURRENCY, RATES);

    expect(backToPkr).toBeCloseTo(originalPkr, 9);
  });

  it("does not replace malformed financial values with believable zeroes", () => {
    const invalidRates = { ...RATES, EUR: 0 } as CurrencyRates;

    expect(convertMoney(100, "USD", "EUR", invalidRates)).toBeNaN();
    expect(
      formatMoney(Number.NaN, {
        currency: "EUR",
        fromCurrency: "PKR",
        rates: RATES,
      }),
    ).toBe("—");
  });

  it("uses currency-specific final display precision", () => {
    expect(getCurrencyFractionDigits("JPY")).toBe(0);
    expect(getCurrencyFractionDigits("USD")).toBe(2);
    expect(getCurrencyFractionDigits("PKR")).toBe(2);

    const yen = formatMoney(1234.56, {
      currency: "JPY",
      fromCurrency: "JPY",
      rates: RATES,
    });
    expect(yen).not.toMatch(/[.,]56/);
  });

  it("keeps negative and compact values numeric until formatting", () => {
    const converted = convertMoney(-2_000_000, "PKR", "EUR", RATES);
    expect(converted).toBeLessThan(0);

    const formatted = formatMoney(-2_000_000, {
      currency: "EUR",
      fromCurrency: "PKR",
      rates: RATES,
      compact: true,
    });
    expect(formatted).toMatch(/-/);
  });
});
