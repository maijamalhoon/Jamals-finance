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
  FALLBACK_USD_PKR_RATE,
  formatMoney,
  getCurrencyLabel,
  getCurrencySymbol,
  getDefaultCurrencyFromRegion,
  isSupportedCurrency,
  type MoneyFormatOptions,
  type SupportedCurrency,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: SupportedCurrency;
  rate: number;
  live: boolean;
  rateLabel: string;
  setCurrency: (currency: SupportedCurrency) => void;
  formatCurrency: (value: number, options?: MoneyFormatOptions) => string;
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

function persistCurrencyPreference(currency: SupportedCurrency) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CURRENCY_STORAGE_KEY}=${encodeURIComponent(currency)}; Path=/; Max-Age=${CURRENCY_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function CurrencyProvider({
  children,
  initialCurrency = BASE_CURRENCY,
  hasStoredPreference = false,
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] =
    useState<SupportedCurrency>(initialCurrency);
  const [rate, setRate] = useState(FALLBACK_USD_PKR_RATE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (hasStoredPreference) {
      persistCurrencyPreference(initialCurrency);
      setCurrencyState(initialCurrency);
      return;
    }

    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    const nextCurrency =
      isSupportedCurrency(saved) ? saved : getDefaultCurrencyFromRegion();

    persistCurrencyPreference(nextCurrency);
    setCurrencyState(nextCurrency);
  }, [hasStoredPreference, initialCurrency]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/exchange-rate")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;

        const nextRate = Number(data.rate);

        if (Number.isFinite(nextRate) && nextRate > 0) {
          setRate(nextRate);
        }

        setLive(Boolean(data.live));
      })
      .catch(() => {
        if (!cancelled) setLive(false);
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
    }

    window.addEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
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

  const formatCurrency = useCallback(
    (value: number, options?: MoneyFormatOptions) =>
      formatMoney(value, {
        ...options,
        currency: options?.currency ?? currency,
        usdToPkrRate: options?.usdToPkrRate ?? rate,
      }),
    [currency, rate],
  );

  const rateLabel =
    live ?
      `Live rate: 1 USD = ${rate.toFixed(2)} PKR`
    : `Fallback rate: 1 USD = ${rate.toFixed(2)} PKR`;

  const value = useMemo(
    () => ({
      currency,
      rate,
      live,
      rateLabel,
      setCurrency,
      formatCurrency,
      getCurrencySymbol: (nextCurrency = currency) =>
        getCurrencySymbol(nextCurrency),
      getCurrencyLabel: (nextCurrency = currency) =>
        getCurrencyLabel(nextCurrency),
    }),
    [currency, formatCurrency, live, rate, rateLabel, setCurrency],
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
