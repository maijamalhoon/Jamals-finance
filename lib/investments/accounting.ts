export type InvestmentCurrency = "PKR" | "USD";

export type InvestmentWithdrawal = {
  quantity: number;
  withdrawalUnitPricePkr: number;
  costBasisPkr: number;
  proceedsPkr: number;
  realizedPnlPkr: number;
};

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeInvestmentUnitPrice(
  originalValue: unknown,
  currency: InvestmentCurrency,
  exchangeRate: unknown,
) {
  const original = toFiniteNumber(originalValue);
  const rate = currency === "USD" ? toFiniteNumber(exchangeRate) : 1;

  if (original === null || original < 0 || rate === null || rate <= 0) {
    return null;
  }

  const normalized = original * rate;
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
}

export function calculateInvestmentPrincipalRefund(
  quantityValue: unknown,
  purchasePricePkrValue: unknown,
) {
  const quantity = toFiniteNumber(quantityValue);
  const purchasePricePkr = toFiniteNumber(purchasePricePkrValue);

  if (
    quantity === null ||
    quantity <= 0 ||
    purchasePricePkr === null ||
    purchasePricePkr <= 0
  ) {
    return null;
  }

  const principal = quantity * purchasePricePkr;
  return Number.isFinite(principal) && principal >= 0 ? principal : null;
}

export function calculateInvestmentWithdrawal({
  quantity: quantityValue,
  purchasePricePkr: purchasePricePkrValue,
  withdrawalPriceOriginal,
  withdrawalCurrency,
  withdrawalExchangeRate,
}: {
  quantity: unknown;
  purchasePricePkr: unknown;
  withdrawalPriceOriginal: unknown;
  withdrawalCurrency: InvestmentCurrency;
  withdrawalExchangeRate: unknown;
}): InvestmentWithdrawal | null {
  const quantity = toFiniteNumber(quantityValue);
  const purchasePricePkr = toFiniteNumber(purchasePricePkrValue);
  const withdrawalUnitPricePkr = normalizeInvestmentUnitPrice(
    withdrawalPriceOriginal,
    withdrawalCurrency,
    withdrawalExchangeRate,
  );

  if (
    quantity === null ||
    quantity <= 0 ||
    purchasePricePkr === null ||
    purchasePricePkr <= 0 ||
    withdrawalUnitPricePkr === null
  ) {
    return null;
  }

  const costBasisPkr = quantity * purchasePricePkr;
  const proceedsPkr = quantity * withdrawalUnitPricePkr;
  const realizedPnlPkr = proceedsPkr - costBasisPkr;

  if (![costBasisPkr, proceedsPkr, realizedPnlPkr].every(Number.isFinite)) {
    return null;
  }

  return {
    quantity,
    withdrawalUnitPricePkr,
    costBasisPkr,
    proceedsPkr,
    realizedPnlPkr,
  };
}
