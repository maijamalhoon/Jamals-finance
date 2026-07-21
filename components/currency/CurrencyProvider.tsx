"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BASE_CURRENCY,
  CURRENCY_CHANGE_EVENT,
  CURRENCY_STORAGE_KEY,
  EXCHANGE_RATE_CHANGE_EVENT,
  EXCHANGE_RATE_STORAGE_KEY,
  FALLBACK_CURRENCY_RATES,
  convertMoney,
  formatMoney,
  getCurrencyLabel,
  getCurrencySymbol,
  getDefaultCurrencyFromRegion,
  getExchangeRate,
  isSupportedCurrency,
  isValidCurrencyRates,
  type CurrencyRates,
  type ExchangeRateSnapshot,
  type MoneyFormatOptions,
  type SupportedCurrency,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: SupportedCurrency;
  rates: CurrencyRates;
  /** Compatibility alias: one USD in PKR. */
  rate: number;
  live: boolean;
  stale: boolean;
  ratesReady: boolean;
  rateLabel: string;
  source: string;
  updatedAt: string;
  setCurrency: (currency: SupportedCurrency) => void;
  formatCurrency: (value: number, options?: MoneyFormatOptions) => string;
  convertCurrency: (
    value: number,
    fromCurrency: SupportedCurrency,
    toCurrency?: SupportedCurrency,
  ) => number | null;
  toBaseCurrency: (
    value: number,
    fromCurrency?: SupportedCurrency,
  ) => number | null;
  fromBaseCurrency: (
    value: number,
    toCurrency?: SupportedCurrency,
  ) => number | null;
  getRate: (
    fromCurrency: SupportedCurrency,
    toCurrency?: SupportedCurrency,
  ) => number | null;
  getCurrencySymbol: (currency?: SupportedCurrency) => string;
  getCurrencyLabel: (currency?: SupportedCurrency) => string;
};

type CurrencyProviderProps = {
  children: ReactNode;
  initialCurrency?: SupportedCurrency;
  hasStoredPreference?: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Currency = SupportedCurrency;
export type FormatOptions = MoneyFormatOptions;

type ApiSnapshot = Partial<ExchangeRateSnapshot> & {
  rate?: number;
};

function persistCurrencyPreference(currency: SupportedCurrency) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CURRENCY_STORAGE_KEY}=${encodeURIComponent(currency)}; Path=/; Max-Age=${CURRENCY_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function isValidSnapshot(value: unknown): value is ExchangeRateSnapshot {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ExchangeRateSnapshot>;
  return (
    candidate.base === "USD" &&
    isValidCurrencyRates(candidate.rates) &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.live === "boolean" &&
    typeof candidate.stale === "boolean"
  );
}

function isUsableSnapshot(value: unknown): value is ExchangeRateSnapshot {
  if (!isValidSnapshot(value)) return false;

  const updatedAt = Date.parse(value.updatedAt);
  return (
    Number.isFinite(updatedAt) &&
    updatedAt > 0 &&
    !value.source.startsWith("Built-in emergency")
  );
}

function readCachedSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isUsableSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistRateSnapshot(snapshot: ExchangeRateSnapshot) {
  if (typeof window === "undefined" || !isUsableSnapshot(snapshot)) return;

  window.localStorage.setItem(
    EXCHANGE_RATE_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
  window.dispatchEvent(
    new CustomEvent(EXCHANGE_RATE_CHANGE_EVENT, { detail: snapshot }),
  );
}

function createEmergencySnapshot(): ExchangeRateSnapshot {
  return {
    base: "USD",
    rates: FALLBACK_CURRENCY_RATES,
    updatedAt: new Date(0).toISOString(),
    nextUpdateAt: null,
    source: "Built-in emergency rates",
    live: false,
    stale: true,
  };
}

export function CurrencyProvider({
  children,
  initialCurrency = BASE_CURRENCY,
  hasStoredPreference = false,
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] =
    useState<SupportedCurrency>(initialCurrency);
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot>(
    createEmergencySnapshot,
  );
  const [ratesReady, setRatesReady] = useState(false);
  const [ratesChecked, setRatesChecked] = useState(false);

  useEffect(() => {
    if (hasStoredPreference) {
      persistCurrencyPreference(initialCurrency);
      setCurrencyState(initialCurrency);
      return;
    }

    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    const nextCurrency = isSupportedCurrency(saved)
      ? saved
      : getDefaultCurrencyFromRegion();

    persistCurrencyPreference(nextCurrency);
    setCurrencyState(nextCurrency);
  }, [hasStoredPreference, initialCurrency]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedSnapshot();

    if (cached) {
      setSnapshot({ ...cached, live: false, stale: true });
      setRatesReady(true);
      setRatesChecked(true);
    }

    fetch("/api/exchange-rate")
      .then(async (response) => {
        if (!response.ok) throw new Error("Exchange rates unavailable");
        return (await response.json()) as ApiSnapshot;
      })
      .then((data) => {
        if (cancelled || !isValidSnapshot(data)) return;

        const usable = isUsableSnapshot(data);
        setSnapshot(data);
        setRatesReady(usable);
        setRatesChecked(true);
        if (usable) persistRateSnapshot(data);
      })
      .catch(() => {
        if (cancelled) return;
        setRatesChecked(true);
        setRatesReady(Boolean(cached));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleCurrencyChange(event: Event) {
      const detail = (event as CustomEvent<{ currency?: string }>).detail;
      const nextCurrency =
        detail?.currency ?? window.localStorage.getItem(CURRENCY_STORAGE_KEY);

      if (isSupportedCurrency(nextCurrency)) {
        persistCurrencyPreference(nextCurrency);
        setCurrencyState(nextCurrency);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === CURRENCY_STORAGE_KEY &&
        isSupportedCurrency(event.newValue)
      ) {
        persistCurrencyPreference(event.newValue);
        setCurrencyState(event.newValue);
      }

      if (event.key === EXCHANGE_RATE_STORAGE_KEY && event.newValue) {
        try {
          const next = JSON.parse(event.newValue) as unknown;
          if (isUsableSnapshot(next)) {
            setSnapshot(next);
            setRatesReady(true);
            setRatesChecked(true);
          }
        } catch {
          // Ignore malformed cross-tab values.
        }
      }
    }

    function handleRateChange(event: Event) {
      const next = (event as CustomEvent<unknown>).detail;
      if (isUsableSnapshot(next)) {
        setSnapshot(next);
        setRatesReady(true);
        setRatesChecked(true);
      }
    }

    window.addEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
    window.addEventListener(EXCHANGE_RATE_CHANGE_EVENT, handleRateChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
      window.removeEventListener(EXCHANGE_RATE_CHANGE_EVENT, handleRateChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setCurrency = useCallback((nextCurrency: SupportedCurrency) => {
    persistCurrencyPreference(nextCurrency);
    setCurrencyState(nextCurrency);
    window.dispatchEvent(
      new CustomEvent(CURRENCY_CHANGE_EVENT, {
        detail: { currency: nextCurrency },
      }),
    );
  }, []);

  const convertCurrency = useCallback(
    (
      value: number,
      fromCurrency: SupportedCurrency,
      toCurrency = currency,
    ) => {
      if (!ratesReady && fromCurrency !== toCurrency) return null;

      const converted = convertMoney(
        value,
        fromCurrency,
        toCurrency,
        snapshot.rates,
      );
      return Number.isFinite(converted) ? converted : null;
    },
    [currency, ratesReady, snapshot.rates],
  );

  const toBaseCurrency = useCallback(
    (value: number, fromCurrency = currency) =>
      convertCurrency(value, fromCurrency, BASE_CURRENCY),
    [convertCurrency, currency],
  );

  const fromBaseCurrency = useCallback(
    (value: number, toCurrency = currency) =>
      convertCurrency(value, BASE_CURRENCY, toCurrency),
    [convertCurrency, currency],
  );

  const getRate = useCallback(
    (fromCurrency: SupportedCurrency, toCurrency = currency) => {
      if (!ratesReady && fromCurrency !== toCurrency) return null;

      const rate = getExchangeRate(fromCurrency, toCurrency, snapshot.rates);
      return Number.isFinite(rate) && rate > 0 ? rate : null;
    },
    [currency, ratesReady, snapshot.rates],
  );

  const formatCurrency = useCallback(
    (value: number, options?: MoneyFormatOptions) => {
      const targetCurrency = options?.currency ?? currency;
      const sourceCurrency = options?.fromCurrency ?? BASE_CURRENCY;
      if (!ratesReady && sourceCurrency !== targetCurrency) return "—";

      return formatMoney(value, {
        ...options,
        currency: targetCurrency,
        rates: options?.rates ?? snapshot.rates,
      });
    },
    [currency, ratesReady, snapshot.rates],
  );

  const rateLabel = ratesReady
    ? `${snapshot.live && !snapshot.stale ? "Latest" : "Saved"} rate: 1 USD = ${formatMoney(1, {
        currency,
        fromCurrency: "USD",
        rates: snapshot.rates,
      })}`
    : ratesChecked
      ? "Exchange rates are unavailable; converted values and saves are paused"
      : "Exchange rates are loading";

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      rates: snapshot.rates,
      rate: snapshot.rates.PKR,
      live: snapshot.live,
      stale: snapshot.stale,
      ratesReady,
      rateLabel,
      source: snapshot.source,
      updatedAt: snapshot.updatedAt,
      setCurrency,
      formatCurrency,
      convertCurrency,
      toBaseCurrency,
      fromBaseCurrency,
      getRate,
      getCurrencySymbol: (nextCurrency = currency) =>
        getCurrencySymbol(nextCurrency),
      getCurrencyLabel: (nextCurrency = currency) =>
        getCurrencyLabel(nextCurrency),
    }),
    [
      convertCurrency,
      currency,
      formatCurrency,
      fromBaseCurrency,
      getRate,
      rateLabel,
      ratesReady,
      setCurrency,
      snapshot,
      toBaseCurrency,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useOptionalCurrency() {
  return useContext(CurrencyContext);
}

export function useCurrency() {
  const context = useOptionalCurrency();

  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }

  return context;
}

export function dispatchCurrencyChange(currency: SupportedCurrency) {
  persistCurrencyPreference(currency);
  window.dispatchEvent(
    new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: { currency } }),
  );
}
