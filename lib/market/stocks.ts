import { getUsdToPkrRate } from "@/lib/exchange-rate";

const ALPHA_VANTAGE_API_BASE = "https://www.alphavantage.co/query";
const MAX_SEARCH_RESULTS = 8;
const MAX_PRICE_SYMBOLS = 10;

export type StockPrice = {
  usd: number | null;
  pkr: number | null;
  change: number | null;
  changePercent: number | null;
  lastUpdatedAt: string | null;
  live: boolean;
  source: "alpha_vantage";
};

export type StockSearchResult = {
  id: string;
  kind: "stock";
  provider: "alpha_vantage";
  symbol: string;
  name: string;
  region?: string;
  currency: string;
  exchange?: string;
  type?: string;
  logoUrl?: string | null;
  price?: StockPrice | null;
};

type AlphaVantageSearchRow = Record<string, unknown>;

type AlphaVantageSearchResponse = {
  bestMatches?: AlphaVantageSearchRow[];
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

type AlphaVantageQuoteResponse = {
  "Global Quote"?: Record<string, unknown>;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getString(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return isNonEmptyString(value) ? value.trim() : "";
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.replace("%", "").trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function createMarketError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function getApiKey() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();

  if (!apiKey) {
    throw createMarketError(
      "MissingConfigError",
      "Stock search is not configured yet.",
    );
  }

  return apiKey;
}

function getProviderMessage(
  data: AlphaVantageSearchResponse | AlphaVantageQuoteResponse,
) {
  return data.Note ?? data.Information ?? data["Error Message"] ?? "";
}

function throwIfProviderError(
  data: AlphaVantageSearchResponse | AlphaVantageQuoteResponse,
) {
  const message = getProviderMessage(data);

  if (!message) return;

  if (/rate|frequency|limit|premium/i.test(message)) {
    throw createMarketError("RateLimitError", message);
  }

  throw createMarketError("MarketApiError", message);
}

async function fetchAlphaVantage<T>(
  params: Record<string, string>,
  revalidate: number,
) {
  const apiKey = getApiKey();
  const url = new URL(ALPHA_VANTAGE_API_BASE);

  Object.entries({ ...params, apikey: apiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate },
  });

  if (!response.ok) {
    throw createMarketError(
      response.status === 429 ? "RateLimitError" : "MarketApiError",
      "Alpha Vantage request failed.",
    );
  }

  const data = (await response.json()) as T;
  throwIfProviderError(data as AlphaVantageSearchResponse);

  return data;
}

export function normalizeStockSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\s+/g, "");
}

function isSafeSymbol(symbol: string) {
  return /^[A-Z0-9.:-]{1,24}$/.test(symbol);
}

export function normalizeStockSymbols(symbols: string[]) {
  return Array.from(
    new Set(
      symbols
        .map(normalizeStockSymbol)
        .filter((symbol) => isSafeSymbol(symbol)),
    ),
  ).slice(0, MAX_PRICE_SYMBOLS);
}

export function normalizeStockSearchResult(
  row: AlphaVantageSearchRow,
): StockSearchResult | null {
  const symbol = normalizeStockSymbol(getString(row, "1. symbol"));
  const name = getString(row, "2. name");
  const type = getString(row, "3. type");
  const region = getString(row, "4. region");
  const currency = getString(row, "8. currency").toUpperCase() || "USD";

  if (!symbol || !isSafeSymbol(symbol) || !name) return null;

  return {
    id: symbol,
    kind: "stock",
    provider: "alpha_vantage",
    symbol,
    name,
    region: region || undefined,
    currency,
    type: type || undefined,
    logoUrl: null,
    price: null,
  };
}

export function normalizeStockQuoteResult(
  symbol: string,
  row: Record<string, unknown> | undefined,
  usdToPkrRate: number,
): StockPrice | null {
  const quoteSymbol = normalizeStockSymbol(
    getString(row ?? {}, "01. symbol") || symbol,
  );
  const usd = toNumberOrNull(row?.["05. price"]);
  const change = toNumberOrNull(row?.["09. change"]);
  const changePercent = toNumberOrNull(row?.["10. change percent"]);
  const latestTradingDay = getString(row ?? {}, "07. latest trading day");

  if (!quoteSymbol || !isSafeSymbol(quoteSymbol) || usd === null || usd <= 0) {
    return null;
  }

  return {
    usd,
    pkr: usd * usdToPkrRate,
    change,
    changePercent,
    lastUpdatedAt: latestTradingDay
      ? new Date(`${latestTradingDay}T00:00:00.000Z`).toISOString()
      : null,
    live: false,
    source: "alpha_vantage",
  };
}

export async function searchInternationalStocks(query: string) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return [];
  }

  const data = await fetchAlphaVantage<AlphaVantageSearchResponse>(
    {
      function: "SYMBOL_SEARCH",
      keywords: cleanQuery,
    },
    300,
  );

  return (data.bestMatches ?? [])
    .map(normalizeStockSearchResult)
    .filter((result): result is StockSearchResult => Boolean(result))
    .slice(0, MAX_SEARCH_RESULTS);
}

async function getSingleStockPrice(symbol: string, usdToPkrRate: number) {
  const data = await fetchAlphaVantage<AlphaVantageQuoteResponse>(
    {
      function: "GLOBAL_QUOTE",
      symbol,
    },
    300,
  );

  return normalizeStockQuoteResult(symbol, data["Global Quote"], usdToPkrRate);
}

export async function getInternationalStockPrices(symbols: string[]) {
  const normalizedSymbols = normalizeStockSymbols(symbols);

  if (normalizedSymbols.length === 0) {
    return { prices: {} as Record<string, StockPrice> };
  }

  const exchangeRate = await getUsdToPkrRate();
  const rows = await Promise.allSettled(
    normalizedSymbols.map(async (symbol) => ({
      symbol,
      price: await getSingleStockPrice(symbol, exchangeRate.rate),
    })),
  );

  const fulfilledRows = rows
    .filter(
      (
        row,
      ): row is PromiseFulfilledResult<{
        symbol: string;
        price: StockPrice | null;
      }> => row.status === "fulfilled",
    )
    .map((row) => row.value);

  if (fulfilledRows.length === 0) {
    const rejected = rows.find(
      (row): row is PromiseRejectedResult => row.status === "rejected",
    );

    if (rejected) {
      throw rejected.reason;
    }
  }

  return fulfilledRows.reduce<{ prices: Record<string, StockPrice> }>(
    (acc, row) => {
      if (row.price) {
        acc.prices[row.symbol] = row.price;
      }

      return acc;
    },
    { prices: {} },
  );
}
