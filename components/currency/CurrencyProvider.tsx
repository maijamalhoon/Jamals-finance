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

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export type Currency = SupportedCurrency;
export type FormatOptions = MoneyFormatOptions;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>("PKR");
  const [rate, setRate] = useState(FALLBACK_USD_PKR_RATE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);

    if (isSupportedCurrency(saved)) {
      setCurrencyState(saved);
      return;
    }

    const regionalDefault = getDefaultCurrencyFromRegion();
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, regionalDefault);
    setCurrencyState(regionalDefault);
  }, []);

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
        setCurrencyState(nextCurrency);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === CURRENCY_STORAGE_KEY &&
        isSupportedCurrency(event.newValue)
      ) {
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
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
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

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }

  return context;
}

export function dispatchCurrencyChange(currency: SupportedCurrency) {
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  window.dispatchEvent(
    new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: { currency } }),
  );
}
