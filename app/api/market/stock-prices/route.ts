export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MAX_SYMBOLS = 12;
const UPSTREAM_TIMEOUT_MS = 6_000;
const VALID_SYMBOL = /^[A-Z0-9.^=-]{1,20}$/;
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=60, stale-while-revalidate=300",
};

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
      };
    }>;
  };
};

async function fetchStockPrice(symbol: string) {
  const query = new URLSearchParams({
    interval: "5m",
    range: "1d",
    includePrePost: "false",
    events: "div,splits",
  });
  const response = await fetch(
    `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?${query.toString()}`,
    {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 Jamals-Finance/1.0",
      },
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as YahooChartPayload;
  const meta = payload.chart?.result?.[0]?.meta;
  const price = toPositiveNumber(meta?.regularMarketPrice);
  if (price === null) return null;

  const previousClose =
    toPositiveNumber(meta?.chartPreviousClose) ??
    toPositiveNumber(meta?.previousClose);
  const change24h =
    previousClose && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : null;
  const marketTime = toPositiveNumber(meta?.regularMarketTime);
  const currency = String(meta?.currency ?? "USD").trim().toUpperCase();

  return {
    price,
    currency,
    change24h,
    updatedAt: marketTime ? marketTime * 1000 : Date.now(),
    source: "public-delayed-stock",
    delayed: true,
    exchange: String(meta?.exchangeName ?? "").trim(),
  };
}

export async function GET(request: Request) {
  const symbols = normalizeSymbols(request);
  if (symbols.length === 0) {
    return Response.json(
      { error: "Provide at least one valid stock symbol." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const rows = await Promise.all(
    symbols.map(async (symbol) => [symbol, await fetchStockPrice(symbol)] as const),
  );
  const prices: Record<
    string,
    NonNullable<Awaited<ReturnType<typeof fetchStockPrice>>>
  > = {};
  for (const [symbol, row] of rows) {
    if (row) prices[symbol] = row;
  }

  return Response.json(
    {
      generatedAt: Date.now(),
      source: "public-delayed-stock",
      delayed: true,
      prices,
    },
    {
      status: Object.keys(prices).length > 0 ? 200 : 503,
      headers: CACHE_HEADERS,
    },
  );
}
