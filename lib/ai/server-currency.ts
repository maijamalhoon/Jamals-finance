import {
  BASE_CURRENCY,
  isSupportedCurrency,
  type CurrencyRates,
  type SupportedCurrency,
} from "@/lib/currency";
import { getExchangeRateSnapshot } from "@/lib/exchange-rate";

export type ServerCurrencyContext = {
  currency: SupportedCurrency;
  rates: CurrencyRates;
  /** Compatibility: validated PKR units per one USD. */
  rate: number;
  live: boolean;
  usable: boolean;
  source: string;
  updatedAt: string;
};

export async function getServerCurrencyContext(
  requestedCurrency: unknown,
): Promise<ServerCurrencyContext> {
  const snapshot = await getExchangeRateSnapshot();
  const currency =
    typeof requestedCurrency === "string" &&
    isSupportedCurrency(requestedCurrency.toUpperCase())
      ? requestedCurrency.toUpperCase()
      : BASE_CURRENCY;
  const updatedAt = Date.parse(snapshot.updatedAt);
  const usable =
    Number.isFinite(updatedAt) &&
    updatedAt > 0 &&
    !snapshot.source.startsWith("Built-in emergency");

  return {
    currency,
    rates: snapshot.rates,
    rate: snapshot.rates.PKR,
    live: snapshot.live && !snapshot.stale,
    usable: currency === BASE_CURRENCY || usable,
    source: snapshot.source,
    updatedAt: snapshot.updatedAt,
  };
}
