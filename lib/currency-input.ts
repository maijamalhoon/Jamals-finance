import {
  BASE_CURRENCY,
  convertMoney,
  getExchangeRate,
  isSupportedCurrency,
  type CurrencyRates,
  type SupportedCurrency,
} from "@/lib/currency";

export type StoredMoneyInput = {
  amountPkr: number;
  originalAmount: number;
  currency: SupportedCurrency;
  exchangeRateToPkr: number;
};

export function parseMoneyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function prepareMoneyInput(
  value: string | number | null | undefined,
  currency: SupportedCurrency,
  rates: CurrencyRates,
): StoredMoneyInput | null {
  const originalAmount = parseMoneyInput(value);
  if (originalAmount === null || !isSupportedCurrency(currency)) return null;

  const exchangeRateToPkr = getExchangeRate(currency, BASE_CURRENCY, rates);
  const amountPkr = convertMoney(
    originalAmount,
    currency,
    BASE_CURRENCY,
    rates,
  );

  if (
    !Number.isFinite(exchangeRateToPkr) ||
    exchangeRateToPkr <= 0 ||
    !Number.isFinite(amountPkr)
  ) {
    return null;
  }

  return {
    amountPkr,
    originalAmount,
    currency,
    exchangeRateToPkr,
  };
}

export function getEditableMoneyValue({
  amountPkr,
  originalAmount,
  originalCurrency,
  displayCurrency,
  rates,
}: {
  amountPkr: unknown;
  originalAmount?: unknown;
  originalCurrency?: string | null;
  displayCurrency: SupportedCurrency;
  rates: CurrencyRates;
}) {
  const parsedOriginal = parseMoneyInput(
    originalAmount as string | number | null | undefined,
  );

  if (
    parsedOriginal !== null &&
    isSupportedCurrency(originalCurrency) &&
    originalCurrency === displayCurrency
  ) {
    return parsedOriginal;
  }

  const canonical = parseMoneyInput(
    amountPkr as string | number | null | undefined,
  );
  if (canonical === null) return null;

  const converted = convertMoney(
    canonical,
    BASE_CURRENCY,
    displayCurrency,
    rates,
  );
  return Number.isFinite(converted) ? converted : null;
}
