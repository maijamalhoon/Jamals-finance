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

type Currency = "PKR" | "USD";

type CurrencyContextValue = {
  currency: Currency;
  rate: number;
  live: boolean;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number, options?: FormatOptions) => string;
};

type FormatOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  compact?: boolean;
};

const STORAGE_KEY = "jamal-currency";
const CHANGE_EVENT = "jamal-currency-change";
const FALLBACK_RATE = 281.2;
const originalCurrencyText = new WeakMap<Text, string>();

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isCurrency(value: string | null): value is Currency {
  return value === "PKR" || value === "USD";
}

function formatNumber(value: number, currency: Currency, options: FormatOptions) {
  const locale = currency === "PKR" ? "en-PK" : "en-US";
  const maximumFractionDigits =
    options.maximumFractionDigits ?? (currency === "USD" ? 2 : 0);
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;

  return value.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

function formatCompact(value: number, currency: Currency) {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absValue >= 1_000) {
    return `${currency} ${(value / 1_000).toFixed(0)}K`;
  }

  return `${currency} ${formatNumber(value, currency, {
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  })}`;
}

function convertFromPKR(value: number, currency: Currency, rate: number) {
  if (currency === "PKR") return value;

  return rate > 0 ? value / rate : value / FALLBACK_RATE;
}

function formatFromPKR(
  value: number,
  currency: Currency,
  rate: number,
  options: FormatOptions = {},
) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const converted = convertFromPKR(safeValue, currency, rate);

  if (options.compact) return formatCompact(converted, currency);

  return `${currency} ${formatNumber(converted, currency, options)}`;
}

function convertPlainText(text: string, currency: Currency, rate: number) {
  if (currency === "PKR") return text;

  return text.replace(
    /([+-]?)\s*PKR\s+(-?[\d,]+(?:\.\d+)?)([KMB])?/g,
    (match, sign: string, amount: string, suffix: string | undefined) => {
      const numeric = Number(amount.replace(/,/g, ""));

      if (!Number.isFinite(numeric)) return match;

      const multiplier =
        suffix === "B" ? 1_000_000_000
        : suffix === "M" ? 1_000_000
        : suffix === "K" ? 1_000
        : 1;

      const formatted = formatFromPKR(numeric * multiplier, currency, rate, {
        compact: Boolean(suffix),
      });

      return `${sign}${formatted}`;
    },
  );
}

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;

  if (!parent) return true;

  return Boolean(
    parent.closest(
      "script,style,noscript,textarea,input,select,[data-currency-ignore]",
    ),
  );
}

function CurrencyDomSync({
  currency,
  rate,
}: {
  currency: Currency;
  rate: number;
}) {
  useEffect(() => {
    function syncTextNode(node: Text) {
      if (shouldSkipNode(node)) return;

      const currentText = node.nodeValue ?? "";

      if (currentText.includes("PKR")) {
        originalCurrencyText.set(node, currentText);
      }

      const originalText = originalCurrencyText.get(node);

      if (!originalText) return;

      const nextText = convertPlainText(originalText, currency, rate);

      if (node.nodeValue !== nextText) {
        node.nodeValue = nextText;
      }
    }

    function syncTree(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) {
        syncTextNode(root as Text);
        return;
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();

      while (node) {
        syncTextNode(node as Text);
        node = walker.nextNode();
      }
    }

    syncTree(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(syncTree);

        if (mutation.type === "characterData") {
          syncTextNode(mutation.target as Text);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [currency, rate]);

  return null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("PKR");
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (isCurrency(saved)) {
      setCurrencyState(saved);
    } else {
      window.localStorage.setItem(STORAGE_KEY, "PKR");
    }
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
        detail?.currency ?? window.localStorage.getItem(STORAGE_KEY);

      if (isCurrency(nextCurrency)) {
        setCurrencyState(nextCurrency);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY && isCurrency(event.newValue)) {
        setCurrencyState(event.newValue);
      }
    }

    window.addEventListener(CHANGE_EVENT, handleCurrencyChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(CHANGE_EVENT, handleCurrencyChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setCurrency = useCallback((nextCurrency: Currency) => {
    window.localStorage.setItem(STORAGE_KEY, nextCurrency);
    setCurrencyState(nextCurrency);
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: { currency: nextCurrency } }),
    );
  }, []);

  const formatCurrency = useCallback(
    (value: number, options?: FormatOptions) =>
      formatFromPKR(value, currency, rate, options),
    [currency, rate],
  );

  const value = useMemo(
    () => ({
      currency,
      rate,
      live,
      setCurrency,
      formatCurrency,
    }),
    [currency, formatCurrency, live, rate, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
      <CurrencyDomSync currency={currency} rate={rate} />
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

export function dispatchCurrencyChange(currency: Currency) {
  window.localStorage.setItem(STORAGE_KEY, currency);
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: { currency } }),
  );
}
