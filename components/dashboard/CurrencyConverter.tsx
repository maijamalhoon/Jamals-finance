"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, RefreshCw } from "@/components/icons/jalvoro/compat";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { SupportedCurrency } from "@/lib/currency";

export default function CurrencyConverter() {
  const {
    currency,
    ratesReady,
    live,
    stale,
    rateLabel,
    formatCurrency,
    convertCurrency,
  } = useCurrency();
  const [amount, setAmount] = useState("1");
  const [reversed, setReversed] = useState(false);

  const comparisonCurrency: SupportedCurrency =
    currency === "USD" ? "PKR" : "USD";
  const fromCurrency = reversed ? comparisonCurrency : currency;
  const toCurrency = reversed ? currency : comparisonCurrency;
  const numericAmount = Number(amount);
  const converted = useMemo(() => {
    if (!Number.isFinite(numericAmount)) return null;
    return convertCurrency(numericAmount, fromCurrency, toCurrency);
  }, [convertCurrency, fromCurrency, numericAmount, toCurrency]);

  const formatted =
    converted === null
      ? "—"
      : formatCurrency(converted, {
          currency: toCurrency,
          fromCurrency: toCurrency,
          maximumFractionDigits: toCurrency === "JPY" ? 0 : 4,
        });

  return (
    <div className="finance-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Currency Converter
        </h3>
        <span
          className="finance-control flex h-7 w-7 items-center justify-center"
          aria-label={ratesReady ? rateLabel : "Exchange rates are loading"}
        >
          <RefreshCw
            size={12}
            className={`text-text-secondary ${ratesReady ? "" : "animate-spin"}`}
          />
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="finance-panel-soft flex-1 p-3">
          <p className="mb-1 text-[10px] text-text-secondary">From</p>
          <p className="mb-1.5 text-xs text-text-secondary">{fromCurrency}</p>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full bg-input text-sm font-semibold text-text-primary outline-none"
            step="any"
          />
        </div>

        <button
          type="button"
          onClick={() => setReversed((current) => !current)}
          className="finance-control flex h-8 w-8 flex-shrink-0 items-center justify-center"
          aria-label="Swap currencies"
        >
          <ArrowLeftRight size={13} className="text-text-secondary" />
        </button>

        <div className="finance-panel-soft flex-1 p-3">
          <p className="mb-1 text-[10px] text-text-secondary">To</p>
          <p className="mb-1.5 text-xs text-text-secondary">{toCurrency}</p>
          <p className="text-sm font-semibold text-text-primary">{formatted}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <p className="truncate text-xs text-text-secondary">
          {ratesReady ? rateLabel : "Fetching rates…"}
        </p>
        <span className="flex flex-shrink-0 items-center gap-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live && !stale ? "bg-success" : "bg-warning"}`}
          />
          <span
            className={`text-[10px] ${live && !stale ? "text-success" : "text-warning"}`}
          >
            {live && !stale ? "Latest" : "Saved"}
          </span>
        </span>
      </div>
    </div>
  );
}
