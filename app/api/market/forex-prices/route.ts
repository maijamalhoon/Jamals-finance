import {
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import type { InvestmentPriceMode } from "@/lib/market/investment-asset-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const SUPPORTED: readonly SupportedCurrency[] = [
  "PKR",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
];
const MAX_PAIRS = 24;
const UPSTREAM_TIMEOUT_MS = 7_000;
const TWELVE_QUOTE_URL = "https://api.twelvedata.com/quote";
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2/rates";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=60, stale-while-revalidate=300",
};

type ForexPriceRow = {
  price: number;
  currency: SupportedCurrency;
  change24h: number | null;
  updatedAt: number;
  source: string;
  delayed: boolean;
  priceMode: InvestmentPriceMode;
  marketStatus: "open" | "reference" | "unknown";
  stale: boolean;
};

type TwelveQuoteRow = {
  close?: unknown;
  price?: unknown;
  previous_close?: unknown;
  percent_change?: unknown;
  timestamp?: unknown;
  datetime?: unknown;
  status?: unknown;
  message?: unknown;
};

type FrankfurterRow = {
  date?: unknown;
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
};

function cleanText(value: unknown, maxLength = 60) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizePairs(request: Request) {
  const url = new URL(request.url);
  return Array.from(
    new Set(
      (url.searchParams.get("pairs") ?? "")
        .split(",")
        .map((pair) => pair.trim().toUpperCase())
        .filter((pair) => {
          const [base, quote, extra] = pair.split("-");
          return !extra && isSupportedCurrency(base) && isSupportedCurrency(quote) && base !== quote;
        }),
    ),
  )
    .sort()
    .slice(0, MAX_PAIRS);
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

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 10);
  return { from: toDateKey(start), to: toDateKey(end) };
}

function getPairRate(
  base: SupportedCurrency,
  quote: SupportedCurrency,
  usdRates: ReadonlyMap<SupportedCurrency, number>,
) {
  if (base === quote) return 1;
  const baseRate = base === "USD" ? 1 : usdRates.get(base);
  const quoteRate = quote === "USD" ? 1 : usdRates.get(quote);
  if (!baseRate || !quoteRate) return null;
  return quoteRate / baseRate;
}

async function fetchJson(url: string, headers?: HeadersInit, revalidate?: number) {
  const response = await fetch(url, {
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "Jamals-Finance-Forex/2.0",
      ...headers,
    },
  });
  if (!response.ok) throw new Error(`Forex provider failed (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function getTwelveRows(payload: unknown, pairs: readonly string[]) {
  if (!payload || typeof payload !== "object") return new Map<string, TwelveQuoteRow>();
  const object = payload as Record<string, unknown>;
  const rows = new Map<string, TwelveQuoteRow>();

  if (pairs.length === 1 && ("close" in object || "price" in object)) {
    rows.set(pairs[0], object as TwelveQuoteRow);
    return rows;
  }

  for (const pair of pairs) {
    const slashPair = pair.replace("-", "/");
    const value = object[slashPair] ?? object[pair];
    if (value && typeof value === "object") rows.set(pair, value as TwelveQuoteRow);
  }
  return rows;
}

async function fetchTwelveForex(pairs: readonly string[]) {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
  const prices = new Map<string, ForexPriceRow>();
  if (!apiKey || pairs.length === 0) return prices;

  const parameters = new URLSearchParams({
    symbol: pairs.map((pair) => pair.replace("-", "/")).join(","),
    dp: "10",
  });
  const payload = await fetchJson(`${TWELVE_QUOTE_URL}?${parameters}`, {
    Authorization: `apikey ${apiKey}`,
  });
  const rows = getTwelveRows(payload, pairs);

  for (const pair of pairs) {
    const row = rows.get(pair);
    if (!row) continue;
    const price = toPositiveNumber(row.close) ?? toPositiveNumber(row.price);
    if (price === null) continue;
    const [, quote] = pair.split("-") as [SupportedCurrency, SupportedCurrency];
    const updatedAt = parseTimestamp(row.timestamp ?? row.datetime);
    const fresh = Date.now() - updatedAt <= 10 * 60_000;
    prices.set(pair, {
      price,
      currency: quote,
      change24h: calculateChange(
        price,
        toPositiveNumber(row.previous_close),
        row.percent_change,
      ),
      updatedAt,
      source: "twelve-data-forex",
      delayed: !fresh,
      priceMode: fresh ? "realtime" : "delayed",
      marketStatus: "open",
      stale: !fresh,
    });
  }

  return prices;
}

async function fetchReferenceRows() {
  const { from, to } = getRange();
  const query = new URLSearchParams({
    base: "USD",
    quotes: SUPPORTED.filter((currency) => currency !== "USD").join(","),
    from,
    to,
  });
  return (await fetchJson(`${FRANKFURTER_BASE}?${query}`, undefined, 21_600)) as FrankfurterRow[];
}

async function fillReferenceFallback(
  pairs: readonly string[],
  prices: Map<string, ForexPriceRow>,
) {
  const unresolved = pairs.filter((pair) => !prices.has(pair));
  if (unresolved.length === 0) return;

  const rows = await fetchReferenceRows();
  const byDate = new Map<string, Map<SupportedCurrency, number>>();
  for (const row of rows) {
    const date = cleanText(row.date, 10);
    const quote = cleanText(row.quote, 3).toUpperCase();
    const rate = toPositiveNumber(row.rate);
    if (!date || !isSupportedCurrency(quote) || rate === null) continue;
    const rates = byDate.get(date) ?? new Map<SupportedCurrency, number>();
    rates.set(quote, rate);
    byDate.set(date, rates);
  }

  const dates = Array.from(byDate.keys()).sort();
  const latestDate = dates.at(-1);
  const previousDate = dates.at(-2);
  if (!latestDate) return;

  const latestRates = byDate.get(latestDate) ?? new Map<SupportedCurrency, number>();
  const previousRates = previousDate
    ? byDate.get(previousDate) ?? new Map<SupportedCurrency, number>()
    : null;
  const parsedUpdatedAt = Date.parse(`${latestDate}T16:00:00Z`);
  const updatedAt = Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : Date.now();

  for (const pair of unresolved) {
    const [base, quote] = pair.split("-") as [SupportedCurrency, SupportedCurrency];
    const price = getPairRate(base, quote, latestRates);
    if (!price || !Number.isFinite(price)) continue;
    const previousPrice = previousRates ? getPairRate(base, quote, previousRates) : null;
    prices.set(pair, {
      price,
      currency: quote,
      change24h:
        previousPrice && previousPrice > 0
          ? ((price - previousPrice) / previousPrice) * 100
          : null,
      updatedAt,
      source: "frankfurter-reference",
      delayed: true,
      priceMode: "reference",
      marketStatus: "reference",
      stale: false,
    });
  }
}

export async function GET(request: Request) {
  const pairs = normalizePairs(request);
  if (pairs.length === 0) {
    return Response.json(
      { error: "Provide at least one valid forex pair." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const prices = await fetchTwelveForex(pairs).catch(
    () => new Map<string, ForexPriceRow>(),
  );
  await fillReferenceFallback(pairs, prices).catch(() => undefined);
  const responsePrices = Object.fromEntries(prices.entries());

  return Response.json(
    {
      generatedAt: Date.now(),
      source: "hybrid-forex-market-data",
      prices: responsePrices,
    },
    {
      status: Object.keys(responsePrices).length > 0 ? 200 : 503,
      headers: CACHE_HEADERS,
    },
  );
}
