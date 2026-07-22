import {
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import type { InvestmentPriceMode } from "@/lib/market/investment-asset-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MAX_SYMBOLS = 12;
const UPSTREAM_TIMEOUT_MS = 6_000;
const VALID_SYMBOL = /^[A-Z0-9.^=/-]{1,24}$/;
const TWELVE_QUOTE_URL = "https://api.twelvedata.com/quote";
const FINNHUB_API_URL = "https://finnhub.io/api/v1";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=60, stale-while-revalidate=300",
};

type MarketStatus = "open" | "closed" | "unknown";

type PriceRow = {
  price: number;
  currency: SupportedCurrency;
  change24h: number | null;
  updatedAt: number;
  source: string;
  delayed: boolean;
  priceMode: InvestmentPriceMode;
  marketStatus: MarketStatus;
  stale: boolean;
  exchange: string;
};

type TwelveQuoteRow = {
  symbol?: unknown;
  currency?: unknown;
  exchange?: unknown;
  close?: unknown;
  price?: unknown;
  previous_close?: unknown;
  percent_change?: unknown;
  timestamp?: unknown;
  datetime?: unknown;
  is_market_open?: unknown;
  status?: unknown;
  message?: unknown;
};

type FinnhubQuotePayload = {
  c?: unknown;
  pc?: unknown;
  dp?: unknown;
  t?: unknown;
};

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: unknown;
        regularMarketPrice?: unknown;
        regularMarketTime?: unknown;
        chartPreviousClose?: unknown;
        previousClose?: unknown;
        exchangeName?: unknown;
        marketState?: unknown;
      };
    }>;
  };
};

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value: unknown, maxLength = 80) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeCurrency(value: unknown): SupportedCurrency | null {
  const currency = cleanText(value, 3).toUpperCase();
  return isSupportedCurrency(currency) ? currency : null;
}

function normalizeSymbols(request: Request) {
  const url = new URL(request.url);
  return Array.from(
    new Set(
      (url.searchParams.get("symbols") ?? "")
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => VALID_SYMBOL.test(symbol)),
    ),
  )
    .sort()
    .slice(0, MAX_SYMBOLS);
}

function parseTimestamp(value: unknown, fallback = Date.now()) {
  const numeric = toPositiveNumber(value);
  if (numeric !== null) {
    const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    if (Number.isFinite(milliseconds)) return milliseconds;
  }

  const parsed = Date.parse(cleanText(value, 50));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateChange(price: number, previousClose: number | null, percent: unknown) {
  const explicit = toFiniteNumber(percent);
  if (explicit !== null) return explicit;
  if (previousClose && previousClose > 0) {
    return ((price - previousClose) / previousClose) * 100;
  }
  return null;
}

function marketStatusFromBoolean(value: unknown): MarketStatus {
  if (value === true || value === "true") return "open";
  if (value === false || value === "false") return "closed";
  return "unknown";
}

function marketStatusFromText(value: unknown): MarketStatus {
  const status = cleanText(value, 30).toLowerCase();
  if (status.includes("open") || status.includes("regular")) return "open";
  if (status.includes("closed") || status.includes("post") || status.includes("pre")) {
    return "closed";
  }
  return "unknown";
}

function isFresh(updatedAt: number, minutes: number) {
  return Date.now() - updatedAt <= minutes * 60_000;
}

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "Jamals-Finance-Market-Quotes/2.0",
      ...headers,
    },
  });
  if (!response.ok) throw new Error(`Market quote provider failed (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function getTwelveRows(payload: unknown, symbols: readonly string[]) {
  if (!payload || typeof payload !== "object") return new Map<string, TwelveQuoteRow>();
  const object = payload as Record<string, unknown>;
  const rows = new Map<string, TwelveQuoteRow>();

  if (symbols.length === 1 && ("close" in object || "price" in object)) {
    rows.set(symbols[0], object as TwelveQuoteRow);
    return rows;
  }

  for (const symbol of symbols) {
    const value = object[symbol];
    if (value && typeof value === "object") rows.set(symbol, value as TwelveQuoteRow);
  }
  return rows;
}

async function fetchTwelvePrices(symbols: readonly string[]) {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
  const prices = new Map<string, PriceRow>();
  if (!apiKey || symbols.length === 0) return prices;

  const parameters = new URLSearchParams({
    symbol: symbols.join(","),
    dp: "8",
  });
  const payload = await fetchJson(`${TWELVE_QUOTE_URL}?${parameters}`, {
    Authorization: `apikey ${apiKey}`,
  });
  const rows = getTwelveRows(payload, symbols);

  for (const symbol of symbols) {
    const row = rows.get(symbol);
    if (!row) continue;
    const price = toPositiveNumber(row.close) ?? toPositiveNumber(row.price);
    const currency = normalizeCurrency(row.currency);
    if (price === null || !currency) continue;

    const updatedAt = parseTimestamp(row.timestamp ?? row.datetime);
    const marketStatus = marketStatusFromBoolean(row.is_market_open);
    const fresh = isFresh(updatedAt, 5);
    const priceMode: InvestmentPriceMode =
      marketStatus === "open" && fresh ? "realtime" : "delayed";
    prices.set(symbol, {
      price,
      currency,
      change24h: calculateChange(
        price,
        toPositiveNumber(row.previous_close),
        row.percent_change,
      ),
      updatedAt,
      source: "twelve-data",
      delayed: priceMode !== "realtime",
      priceMode,
      marketStatus,
      stale: marketStatus === "open" && !fresh,
      exchange: cleanText(row.exchange, 50),
    });
  }

  return prices;
}

function isLikelyUsTicker(symbol: string) {
  return /^[A-Z][A-Z0-9-]{0,9}$/.test(symbol);
}

async function fetchFinnhubPrice(symbol: string): Promise<PriceRow | null> {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey || !isLikelyUsTicker(symbol)) return null;

  const parameters = new URLSearchParams({ symbol, token: apiKey });
  const payload = (await fetchJson(
    `${FINNHUB_API_URL}/quote?${parameters}`,
  )) as FinnhubQuotePayload;
  const price = toPositiveNumber(payload.c);
  if (price === null) return null;

  const updatedAt = parseTimestamp(payload.t);
  const fresh = isFresh(updatedAt, 5);
  return {
    price,
    currency: "USD",
    change24h: calculateChange(price, toPositiveNumber(payload.pc), payload.dp),
    updatedAt,
    source: "finnhub",
    delayed: !fresh,
    priceMode: fresh ? "realtime" : "delayed",
    marketStatus: "unknown",
    stale: !fresh,
    exchange: "US",
  };
}

async function fetchYahooPrice(symbol: string): Promise<PriceRow | null> {
  const query = new URLSearchParams({
    interval: "5m",
    range: "1d",
    includePrePost: "false",
    events: "div,splits",
  });
  const payload = (await fetchJson(
    `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?${query}`,
  )) as YahooChartPayload;
  const meta = payload.chart?.result?.[0]?.meta;
  const price = toPositiveNumber(meta?.regularMarketPrice);
  const currency = normalizeCurrency(meta?.currency);
  if (price === null || !currency) return null;

  const previousClose =
    toPositiveNumber(meta?.chartPreviousClose) ?? toPositiveNumber(meta?.previousClose);
  const updatedAt = parseTimestamp(meta?.regularMarketTime);
  const marketStatus = marketStatusFromText(meta?.marketState);
  return {
    price,
    currency,
    change24h: calculateChange(price, previousClose, null),
    updatedAt,
    source: "yahoo-public-delayed",
    delayed: true,
    priceMode: "delayed",
    marketStatus,
    stale: marketStatus === "open" && !isFresh(updatedAt, 20),
    exchange: cleanText(meta?.exchangeName, 50),
  };
}

async function fillWithFallbacks(
  symbols: readonly string[],
  prices: Map<string, PriceRow>,
) {
  const unresolvedAfterTwelve = symbols.filter((symbol) => !prices.has(symbol));
  const finnhubRows = await Promise.allSettled(
    unresolvedAfterTwelve.map(async (symbol) => [symbol, await fetchFinnhubPrice(symbol)] as const),
  );
  for (const result of finnhubRows) {
    if (result.status !== "fulfilled") continue;
    const [symbol, row] = result.value;
    if (row) prices.set(symbol, row);
  }

  const unresolvedAfterFinnhub = symbols.filter((symbol) => !prices.has(symbol));
  const yahooRows = await Promise.allSettled(
    unresolvedAfterFinnhub.map(async (symbol) => [symbol, await fetchYahooPrice(symbol)] as const),
  );
  for (const result of yahooRows) {
    if (result.status !== "fulfilled") continue;
    const [symbol, row] = result.value;
    if (row) prices.set(symbol, row);
  }
}

export async function GET(request: Request) {
  const symbols = normalizeSymbols(request);
  if (symbols.length === 0) {
    return Response.json(
      { error: "Provide at least one valid stock symbol." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const prices = await fetchTwelvePrices(symbols).catch(() => new Map<string, PriceRow>());
  await fillWithFallbacks(symbols, prices);
  const responsePrices = Object.fromEntries(prices.entries());

  return Response.json(
    {
      generatedAt: Date.now(),
      source: "hybrid-stock-market-data",
      prices: responsePrices,
    },
    {
      status: Object.keys(responsePrices).length > 0 ? 200 : 503,
      headers: CACHE_HEADERS,
    },
  );
}
