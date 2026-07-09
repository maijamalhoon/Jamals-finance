export type SupportedCurrency = "PKR" | "USD";

export type MoneyFormatOptions = {
  currency?: SupportedCurrency;
  fromCurrency?: SupportedCurrency;
  usdToPkrRate?: number;
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  absolute?: boolean;
};

export const BASE_CURRENCY: SupportedCurrency = "PKR";
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["PKR", "USD"];
export const CURRENCY_STORAGE_KEY = "jamal-currency";
export const CURRENCY_CHANGE_EVENT = "jamal-currency-change";
export const FALLBACK_USD_PKR_RATE = 281.2;

const CURRENCY_META: Record<
  SupportedCurrency,
  { label: string; symbol: string; locale: string }
> = {
  PKR: { label: "Pakistani Rupee", symbol: "PKR", locale: "en-PK" },
  USD: { label: "US Dollar", symbol: "$", locale: "en-US" },
};

export function isSupportedCurrency(
  value: string | null | undefined,
): value is SupportedCurrency {
  return value === "PKR" || value === "USD";
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

export function normalizeUsdToPkrRate(rate: number | null | undefined) {
  return Number.isFinite(rate) && Number(rate) > 0 ?
      Number(rate)
    : FALLBACK_USD_PKR_RATE;
}

export function convertMoney(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  usdToPkrRate = FALLBACK_USD_PKR_RATE,
) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rate = normalizeUsdToPkrRate(usdToPkrRate);

  if (fromCurrency === toCurrency) return safeAmount;
  if (fromCurrency === "USD" && toCurrency === "PKR") return safeAmount * rate;
  if (fromCurrency === "PKR" && toCurrency === "USD") return safeAmount / rate;

  return safeAmount;
}

export function formatMoney(
  amount: number,
  {
    currency = BASE_CURRENCY,
    fromCurrency = BASE_CURRENCY,
    usdToPkrRate = FALLBACK_USD_PKR_RATE,
    compact = false,
    minimumFractionDigits,
    maximumFractionDigits,
    absolute = false,
  }: MoneyFormatOptions = {},
) {
  const sourceAmount = Number.isFinite(amount) ? amount : 0;
  const converted = convertMoney(
    absolute ? Math.abs(sourceAmount) : sourceAmount,
    fromCurrency,
    currency,
    usdToPkrRate,
  );
  const locale = getCurrencyLocale(currency);
  const resolvedMaximum =
    maximumFractionDigits ?? (currency === "USD" ? 2 : 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: currency === "PKR" ? "code" : "symbol",
    notation: compact ? "compact" : "standard",
    compactDisplay: "short",
    minimumFractionDigits: minimumFractionDigits ?? 0,
    maximumFractionDigits: resolvedMaximum,
  }).format(converted);
}

export function getDefaultCurrencyFromRegion() {
  if (typeof window === "undefined") return BASE_CURRENCY;

  const languages = navigator.languages?.length ?
    navigator.languages
  : [navigator.language];
  const localeHints = languages
    .filter(Boolean)
    .map((language) => language.toLowerCase());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const regionLooksPakistan =
    localeHints.some((language) => language.endsWith("-pk")) ||
    timeZone === "Asia/Karachi";

  return regionLooksPakistan ? "PKR" : "USD";
}
