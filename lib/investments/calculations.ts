export type InvestmentPosition = {
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPct: number | null;
};

function toNonNegativeFiniteNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Canonical investment mathematics used by cards, portfolio aggregation,
 * dashboard totals, analytics, and reports.
 *
 * Stored prices are always per-unit prices in the application's base currency.
 * Original-currency values are display/edit metadata and must never replace
 * quantity, unit cost, or the live unit quote in these calculations.
 */
export function calculateInvestmentPosition(
  quantityValue: unknown,
  purchasePriceValue: unknown,
  currentPriceValue: unknown,
): InvestmentPosition | null {
  const quantity = toNonNegativeFiniteNumber(quantityValue);
  const purchasePrice = toNonNegativeFiniteNumber(purchasePriceValue);
  const currentPrice = toNonNegativeFiniteNumber(currentPriceValue);

  if (quantity === null || purchasePrice === null || currentPrice === null) {
    return null;
  }

  const totalInvested = quantity * purchasePrice;
  const currentValue = quantity * currentPrice;
  const totalPnL = currentValue - totalInvested;

  if (![totalInvested, currentValue, totalPnL].every(Number.isFinite)) {
    return null;
  }

  const totalPnLPct =
    totalInvested > 0 ? (totalPnL / totalInvested) * 100 : null;

  return {
    quantity,
    purchasePrice,
    currentPrice,
    totalInvested,
    currentValue,
    totalPnL,
    totalPnLPct:
      totalPnLPct !== null && Number.isFinite(totalPnLPct)
        ? totalPnLPct
        : null,
  };
}
