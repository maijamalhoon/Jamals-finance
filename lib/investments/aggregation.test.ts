import { describe, expect, it } from "vitest";

import {
  aggregateInvestmentHoldings,
  getAggregatedPortfolioTotals,
  type InvestmentLike,
} from "./aggregation";

function bitcoinLot(
  overrides: Partial<InvestmentLike> & Pick<InvestmentLike, "id">,
): InvestmentLike {
  return {
    name: "Bitcoin",
    type: "crypto",
    quantity: 1,
    purchase_price: 50_000,
    current_price: 65_000,
    asset_id: "bitcoin",
    symbol: "BTC",
    price_source: "coingecko",
    is_live_priced: true,
    ...overrides,
  };
}

describe("investment holding synchronization", () => {
  it("uses the exact same values for the holding and portfolio totals", () => {
    const holdings = aggregateInvestmentHoldings([bitcoinLot({ id: "one" })]);
    const [holding] = holdings;

    expect(holding).toMatchObject({
      quantity: 1,
      purchase_price: 50_000,
      current_price: 65_000,
      totalInvested: 50_000,
      currentValue: 65_000,
      totalPnL: 15_000,
      totalPnLPct: 30,
    });
    expect(getAggregatedPortfolioTotals(holdings)).toEqual({
      totalInvested: 50_000,
      totalValue: 65_000,
      totalPnL: 15_000,
      totalPnLPct: 30,
    });
  });

  it("merges repeated buys with weighted cost basis and one live quote", () => {
    const [holding] = aggregateInvestmentHoldings([
      bitcoinLot({ id: "first", quantity: 1, purchase_price: 50_000 }),
      bitcoinLot({ id: "second", quantity: 0.5, purchase_price: 60_000 }),
    ]);

    expect(holding.quantity).toBe(1.5);
    expect(holding.itemCount).toBe(2);
    expect(holding.purchase_price).toBeCloseTo(53_333.3333, 4);
    expect(holding.totalInvested).toBe(80_000);
    expect(holding.currentValue).toBe(97_500);
    expect(holding.totalPnL).toBe(17_500);
    expect(holding.totalPnLPct).toBeCloseTo(21.875, 6);
  });

  it("recalculates grouped totals when one purchase is updated", () => {
    const [holding] = aggregateInvestmentHoldings([
      bitcoinLot({ id: "first", quantity: 1, purchase_price: 50_000 }),
      bitcoinLot({ id: "edited", quantity: 2, purchase_price: 45_000 }),
    ]);

    expect(holding.quantity).toBe(3);
    expect(holding.totalInvested).toBe(140_000);
    expect(holding.currentValue).toBe(195_000);
    expect(holding.totalPnL).toBe(55_000);
    expect(holding.totalPnLPct).toBeCloseTo(39.285714, 6);
  });

  it("does not let malformed rows contaminate valid portfolio math", () => {
    const holdings = aggregateInvestmentHoldings([
      bitcoinLot({ id: "valid" }),
      bitcoinLot({ id: "invalid", quantity: "not-a-number" }),
    ]);

    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      itemCount: 1,
      totalInvested: 50_000,
      currentValue: 65_000,
    });
  });
});
