export type SupportedCurrency =
  | "PKR"
  | "USD"
  | "INR"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CNY";

export type CurrencyRates = Record<SupportedCurrency, number>;

export type ExchangeRateSnapshot = {
  base: "USD";
  rates: CurrencyRates;
  updatedAt: string;
  nextUpdateAt: string | null;
  source: string;
  live: boolean;
  stale: boolean;
};

export type MoneyFormatOptions = {
  currency?: SupportedCurrency;
  fromCurrency?: SupportedCurrency;
  rates?: CurrencyRates;
  /** Legacy compatibility for existing USD/PKR-only callers. */
  usdToPkrRate?: number;
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  absolute?: boolean;
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
};

export const BASE_CURRENCY: SupportedCurrency = "PKR";
export const RATE_BASE_CURRENCY: SupportedCurrency = "USD";
export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = [
  "PKR",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
] as const;
export const CURRENCY_STORAGE_KEY = "jamal-currency";
export const CURRENCY_CHANGE_EVENT = "jamal-currency-change";
export const EXCHANGE_RATE_STORAGE_KEY = "jamal-exchange-rates-v2";
export const EXCHANGE_RATE_CHANGE_EVENT = "jamal-exchange-rates-change";

/**
 * Last-resort bootstrap values only. The exchange-rate service and the browser
 * cache replace these with the latest validated snapshot. Every fallback is
 * explicitly marked as non-live/stale by the provider.
 *
 * Values mean: one USD equals this many units of the target currency.
 */
export const FALLBACK_CURRENCY_RATES: CurrencyRates = {
  USD: 1,
  PKR: 281.2,
  INR: 86.6,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.18,
};
export const FALLBACK_USD_PKR_RATE = FALLBACK_CURRENCY_RATES.PKR;

let runtimeCurrencyRates: CurrencyRates | null = null;

const CURRENCY_META: Record<
  SupportedCurrency,
  {
    label: string;
    symbol: string;
    locale: string;
    fractionDigits: number;
    display: "symbol" | "narrowSymbol" | "code";
  }
> = {
  PKR: {
    label: "Pakistani Rupee",
    symbol: "Rs",
    locale: "en-PK",
    fractionDigits: 2,
    display: "code",
  },
  USD: {
    label: "US Dollar",
    symbol: "$",
    locale: "en-US",
    fractionDigits: 2,
    display: "narrowSymbol",
  },
  INR: {
    label: "Indian Rupee",
    symbol: "₹",
    locale: "en-IN",
    fractionDigits: 2,
    display: "narrowSymbol",
  },
  EUR: {
    label: "Euro",
    symbol: "€",
    locale: "en-IE",
    fractionDigits: 2,
    display: "narrowSymbol",
  },
  GBP: {
    label: "British Pound",
    symbol: "£",
    locale: "en-GB",
    fractionDigits: 2,
    display: "narrowSymbol",
  },
  JPY: {
    label: "Japanese Yen",
    symbol: "¥",
    locale: "ja-JP",
    fractionDigits: 0,
    display: "narrowSymbol",
  },
  CNY: {
    label: "Chinese Yuan",
    symbol: "¥",
    locale: "zh-CN",
    fractionDigits: 2,
    display: "code",
  },
};

export function isSupportedCurrency(
  value: string | null | undefined,
): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);
}

export function getCurrencySymbol(currency: SupportedCurrency) {
  return CURRENCY_META[currency].symbol;
}

export function getCurrencyLabel(currency: SupportedCurrency) {
  return CURRENCY_META[currency].label;
}

export function getCurrencyLocale(currency: SupportedCurrency) {
  return CURRENCY_META[currency].locale;
}

export function getCurrencyFractionDigits(currency: SupportedCurrency) {
  return CURRENCY_META[currency].fractionDigits;
}

export function isValidExchangeRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isValidCurrencyRates(
  value: unknown,
): value is CurrencyRates {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Record<SupportedCurrency, unknown>>;
  return SUPPORTED_CURRENCIES.every((currency) =>
    isValidExchangeRate(candidate[currency]),
  );
}

export function setRuntimeCurrencyRates(rates: CurrencyRates | null) {
  runtimeCurrencyRates = isValidCurrencyRates(rates) ? { ...rates } : null;
}

export function getRuntimeCurrencyRates() {
  return runtimeCurrencyRates ? { ...runtimeCurrencyRates } : null;
}

export function normalizeUsdToPkrRate(rate: number | null | undefined) {
  return isValidExchangeRate(rate) ? rate : FALLBACK_USD_PKR_RATE;
}

function resolveRates(
  ratesOrUsdToPkr: CurrencyRates | number | null | undefined,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
): CurrencyRates | null {
  if (isValidCurrencyRates(ratesOrUsdToPkr)) return ratesOrUsdToPkr;

  if (isValidExchangeRate(ratesOrUsdToPkr)) {
    if (runtimeCurrencyRates) {
      return {
        ...runtimeCurrencyRates,
        PKR: ratesOrUsdToPkr,
      };
    }

    const isLegacyUsdPkrPair =
      (fromCurrency === "USD" || fromCurrency === "PKR") &&
      (toCurrency === "USD" || toCurrency === "PKR");
    if (!isLegacyUsdPkrPair) return null;

    return {
      ...FALLBACK_CURRENCY_RATES,
      PKR: ratesOrUsdToPkr,
    };
  }

  return null;
}

/**
 * Convert once through the USD pivot. Rates are always expressed as units per
 * one USD, which prevents chained conversion and repeated rounding.
 */
export function convertMoney(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  ratesOrUsdToPkr: CurrencyRates | number = FALLBACK_CURRENCY_RATES,
) {
  if (!Number.isFinite(amount)) return Number.NaN;
  if (fromCurrency === toCurrency) return amount;

  const rates = resolveRates(ratesOrUsdToPkr, fromCurrency, toCurrency);
  if (!rates) return Number.NaN;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!isValidExchangeRate(fromRate) || !isValidExchangeRate(toRate)) {
    return Number.NaN;
  }

  const amountInUsd = amount / fromRate;
  const converted = amountInUsd * toRate;
  return Number.isFinite(converted) ? converted : Number.NaN;
}

export function getExchangeRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  rates: CurrencyRates,
) {
  return convertMoney(1, fromCurrency, toCurrency, rates);
}

/**
 * Normalize a user-entered value into the PKR ledger without rounding the
 * intermediate result. PostgreSQL numeric columns remain the canonical source
 * of truth; formatting rounds only at the final display boundary.
 */
export function normalizeMoneyForStorage(
  amount: number,
  originalCurrency: SupportedCurrency,
  rates: CurrencyRates,
) {
  return convertMoney(amount, originalCurrency, BASE_CURRENCY, rates);
}

export function formatMoney(
  amount: number,
  {
    currency = BASE_CURRENCY,
    fromCurrency = BASE_CURRENCY,
    rates,
    usdToPkrRate,
    compact = false,
    minimumFractionDigits,
    maximumFractionDigits,
    absolute = false,
    currencyDisplay,
  }: MoneyFormatOptions = {},
) {
  if (!Number.isFinite(amount)) return "—";

  const rateInput =
    rates ?? usdToPkrRate ?? runtimeCurrencyRates ?? FALLBACK_CURRENCY_RATES;
  const converted = convertMoney(
    absolute ? Math.abs(amount) : amount,
    fromCurrency,
    currency,
    rateInput,
  );
  if (!Number.isFinite(converted)) return "—";

  const meta = CURRENCY_META[currency];
  const resolvedMaximum =
    maximumFractionDigits ?? meta.fractionDigits;
  const resolvedMinimum =
    minimumFractionDigits ?? (compact ? 0 : meta.fractionDigits);

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency,
    currencyDisplay: currencyDisplay ?? meta.display,
    notation: compact ? "compact" : "standard",
    compactDisplay: "short",
    minimumFractionDigits: resolvedMinimum,
    maximumFractionDigits: resolvedMaximum,
  }).format(converted);
}

export function getDefaultCurrencyFromRegion(): SupportedCurrency {
  if (typeof window === "undefined") return BASE_CURRENCY;

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const localeHints = languages
    .filter(Boolean)
    .map((language) => language.toLowerCase());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (
    localeHints.some((language) => language.endsWith("-pk")) ||
    timeZone === "Asia/Karachi"
  ) {
    return "PKR";
  }
  if (
    localeHints.some((language) => language.endsWith("-in")) ||
    timeZone === "Asia/Kolkata"
  ) {
    return "INR";
  }
  if (localeHints.some((language) => language.endsWith("-gb"))) return "GBP";
  if (localeHints.some((language) => language.startsWith("ja"))) return "JPY";
  if (localeHints.some((language) => language.startsWith("zh"))) return "CNY";
  if (
    localeHints.some((language) =>
      ["de", "fr", "es", "it", "pt", "nl", "fi", "el"].some((code) =>
        language.startsWith(code),
      ),
    )
  ) {
    return "EUR";
  }

  return "USD";
}
