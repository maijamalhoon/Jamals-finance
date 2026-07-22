import type { SupportedCurrency } from "@/lib/currency";

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
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2/rates";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=21600, stale-while-revalidate=43200",
};

type FrankfurterRow = {
  date?: unknown;
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
};

function isSupportedCurrency(value: string): value is SupportedCurrency {
  return SUPPORTED.includes(value as SupportedCurrency);
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
          return !extra && isSupportedCurrency(base) && isSupportedCurrency(quote);
        }),
    ),
  )
    .sort()
    .slice(0, MAX_PAIRS);
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

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

async function fetchReferenceRows() {
  const { from, to } = getRange();
  const query = new URLSearchParams({
    base: "USD",
    quotes: SUPPORTED.filter((currency) => currency !== "USD").join(","),
    from,
    to,
  });
  const response = await fetch(`${FRANKFURTER_BASE}?${query.toString()}`, {
    next: { revalidate: 21_600 },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "Jamals-Finance-Forex-Reference/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Forex reference request failed (${response.status}).`);
  }

  return (await response.json()) as FrankfurterRow[];
}

export async function GET(request: Request) {
  const pairs = normalizePairs(request);
  if (pairs.length === 0) {
    return Response.json(
      { error: "Provide at least one valid forex pair." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const rows = await fetchReferenceRows();
    const byDate = new Map<string, Map<SupportedCurrency, number>>();

    for (const row of rows) {
      const date = String(row.date ?? "").trim();
      const quote = String(row.quote ?? "").trim().toUpperCase();
      const rate = toPositiveNumber(row.rate);
      if (!date || !isSupportedCurrency(quote) || rate === null) continue;
      const rates = byDate.get(date) ?? new Map<SupportedCurrency, number>();
      rates.set(quote, rate);
      byDate.set(date, rates);
    }

    const dates = Array.from(byDate.keys()).sort();
    const latestDate = dates.at(-1);
    const previousDate = dates.at(-2);
    if (!latestDate) throw new Error("No forex reference rows were returned.");

    const latestRates = byDate.get(latestDate) ?? new Map();
    const previousRates = previousDate ? byDate.get(previousDate) ?? new Map() : null;
    const updatedAt = Date.parse(`${latestDate}T16:00:00Z`);
    const prices: Record<
      string,
      {
        price: number;
        currency: SupportedCurrency;
        change24h: number | null;
        updatedAt: number;
        source: string;
        delayed: true;
      }
    > = {};

    for (const pair of pairs) {
      const [base, quote] = pair.split("-") as [
        SupportedCurrency,
        SupportedCurrency,
      ];
      const price = getPairRate(base, quote, latestRates);
      if (!price || !Number.isFinite(price)) continue;

      const previousPrice = previousRates
        ? getPairRate(base, quote, previousRates)
        : null;
      const change24h =
        previousPrice && previousPrice > 0
          ? ((price - previousPrice) / previousPrice) * 100
          : null;

      prices[pair] = {
        price,
        currency: quote,
        change24h,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        source: "frankfurter-reference",
        delayed: true,
      };
    }

    return Response.json(
      {
        generatedAt: Date.now(),
        source: "frankfurter-reference",
        delayed: true,
        referenceDate: latestDate,
        prices,
      },
      {
        status: Object.keys(prices).length > 0 ? 200 : 503,
        headers: CACHE_HEADERS,
      },
    );
  } catch (error) {
    console.error("[forex-prices] Reference refresh failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        generatedAt: Date.now(),
        source: "frankfurter-reference",
        delayed: true,
        prices: {},
        error: "Forex reference rates are temporarily unavailable.",
      },
      { status: 503, headers: CACHE_HEADERS },
    );
  }
}
