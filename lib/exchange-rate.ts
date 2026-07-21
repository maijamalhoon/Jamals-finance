import {
  FALLBACK_CURRENCY_RATES,
  FALLBACK_USD_PKR_RATE,
  SUPPORTED_CURRENCIES,
  isValidCurrencyRates,
  isValidExchangeRate,
  setRuntimeCurrencyRates,
  type CurrencyRates,
  type ExchangeRateSnapshot,
  type SupportedCurrency,
} from "@/lib/currency";

export { FALLBACK_USD_PKR_RATE };

const EXTERNAL_TIMEOUT_MS = 8_000;
const MAX_FRESH_AGE_MS = 4 * 24 * 60 * 60 * 1_000;
const TARGET_QUOTES = SUPPORTED_CURRENCIES.filter(
  (currency) => currency !== "USD",
);

let lastGoodSnapshot: ExchangeRateSnapshot | null = null;

type ExchangeRateApiResponse = {
  result?: string;
  base_code?: string;
  time_last_update_unix?: number;
  time_next_update_unix?: number;
  conversion_rates?: Record<string, unknown>;
};

type FrankfurterRateRow = {
  date?: string;
  base?: string;
  quote?: string;
  rate?: number;
};

function parseTimestamp(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const date = new Date(numeric * 1_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseRates(
  rawRates: Record<string, unknown>,
): CurrencyRates | null {
  const rates = {} as CurrencyRates;

  for (const currency of SUPPORTED_CURRENCIES) {
    const raw = currency === "USD" ? 1 : Number(rawRates[currency]);
    if (!isValidExchangeRate(raw)) return null;
    rates[currency] = raw;
  }

  return isValidCurrencyRates(rates) ? rates : null;
}

function isSnapshotFresh(updatedAt: string) {
  const updated = new Date(updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated <= MAX_FRESH_AGE_MS;
}

function registerUsableSnapshot(snapshot: ExchangeRateSnapshot) {
  lastGoodSnapshot = snapshot;
  setRuntimeCurrencyRates(snapshot.rates);
  return snapshot;
}

async function fetchExchangeRateApiSnapshot(): Promise<ExchangeRateSnapshot | null> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/USD`,
    {
      next: { revalidate: 3_600 },
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as ExchangeRateApiResponse;
  if (
    data.result !== "success" ||
    data.base_code !== "USD" ||
    !data.conversion_rates
  ) {
    return null;
  }

  const rates = parseRates(data.conversion_rates);
  if (!rates) return null;

  const updatedAt =
    parseTimestamp(data.time_last_update_unix) ?? new Date().toISOString();
  const nextUpdateAt = parseTimestamp(data.time_next_update_unix);

  return {
    base: "USD",
    rates,
    updatedAt,
    nextUpdateAt,
    source: "ExchangeRate-API",
    live: true,
    stale: !isSnapshotFresh(updatedAt),
  };
}

async function fetchFrankfurterSnapshot(): Promise<ExchangeRateSnapshot | null> {
  const quotes = TARGET_QUOTES.join(",");
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates?base=USD&quotes=${encodeURIComponent(quotes)}`,
    {
      next: { revalidate: 3_600 },
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) return null;

  const rows = (await response.json()) as FrankfurterRateRow[];
  if (!Array.isArray(rows)) return null;

  const rawRates: Record<string, unknown> = { USD: 1 };
  let latestDate = "";

  for (const row of rows) {
    const quote = String(row.quote ?? "").toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(quote as SupportedCurrency)) continue;

    const rate = Number(row.rate);
    if (!isValidExchangeRate(rate)) continue;
    rawRates[quote] = rate;

    if (typeof row.date === "string" && row.date > latestDate) {
      latestDate = row.date;
    }
  }

  const rates = parseRates(rawRates);
  if (!rates) return null;

  const updatedAt = latestDate
    ? new Date(`${latestDate}T16:00:00.000Z`).toISOString()
    : new Date().toISOString();

  return {
    base: "USD",
    rates,
    updatedAt,
    nextUpdateAt: null,
    source: "Frankfurter · central-bank rates",
    live: true,
    stale: !isSnapshotFresh(updatedAt),
  };
}

function getFallbackSnapshot(): ExchangeRateSnapshot {
  if (lastGoodSnapshot) {
    const snapshot = {
      ...lastGoodSnapshot,
      live: false,
      stale: true,
      source: `${lastGoodSnapshot.source} · last successful snapshot`,
    };
    setRuntimeCurrencyRates(snapshot.rates);
    return snapshot;
  }

  setRuntimeCurrencyRates(null);
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

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
  const providers = [fetchExchangeRateApiSnapshot, fetchFrankfurterSnapshot];

  for (const provider of providers) {
    try {
      const snapshot = await provider();
      if (snapshot && isValidCurrencyRates(snapshot.rates)) {
        return registerUsableSnapshot(snapshot);
      }
    } catch {
      // Try the next provider. A validated last-good snapshot remains available.
    }
  }

  return getFallbackSnapshot();
}

/** Compatibility for existing crypto/investment paths while they migrate. */
export async function getUsdToPkrRate() {
  const snapshot = await getExchangeRateSnapshot();

  return {
    rate: snapshot.rates.PKR,
    live: snapshot.live,
    stale: snapshot.stale,
    updatedAt: snapshot.updatedAt,
    source: snapshot.source,
  };
}
