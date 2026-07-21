import {
  CENTRAL_CRYPTO_PAIRS,
  chunkCryptoPairs,
  parseBinanceTickerPayload,
  type CentralCryptoPricePayload,
} from "@/lib/market/central-crypto-prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const BINANCE_MARKET_BASE =
  process.env.BINANCE_MARKET_DATA_BASE_URL?.replace(/\/+$/, "") ||
  "https://data-api.binance.vision";
const ACTIVE_PAIR_CACHE_SECONDS = 300;
const MAX_WARM_STALE_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 7_000;

let warmSnapshot: CentralCryptoPricePayload | null = null;
let inFlightSnapshot: Promise<CentralCryptoPricePayload> | null = null;
let upstreamBlockedUntil = 0;

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=1, stale-while-revalidate=5",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=1, stale-while-revalidate=5",
};
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function getRetryAfterMs(response: Response) {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 5_000;
}

async function fetchActivePairs() {
  const response = await fetch(
    `${BINANCE_MARKET_BASE}/api/v3/exchangeInfo?symbolStatus=TRADING`,
    {
      next: { revalidate: ACTIVE_PAIR_CACHE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Binance exchange information failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    symbols?: Array<{
      symbol?: unknown;
      status?: unknown;
      isSpotTradingAllowed?: unknown;
    }>;
  };
  const activeSymbols = new Set(
    (payload.symbols ?? [])
      .filter(
        (row) =>
          row.status === "TRADING" && row.isSpotTradingAllowed !== false,
      )
      .map((row) => String(row.symbol ?? "").trim().toUpperCase())
      .filter(Boolean),
  );

  return CENTRAL_CRYPTO_PAIRS.filter((pair) => activeSymbols.has(pair));
}

async function fetchTickerBatch(symbols: readonly string[]) {
  if (symbols.length === 0) return {};

  const query = new URLSearchParams({
    symbols: JSON.stringify(symbols),
    type: "FULL",
    symbolStatus: "TRADING",
  });
  const response = await fetch(
    `${BINANCE_MARKET_BASE}/api/v3/ticker/24hr?${query.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "User-Agent": "Jamals-Finance-Market-Cache/1.0",
      },
    },
  );

  if (response.status === 418 || response.status === 429) {
    upstreamBlockedUntil = Date.now() + getRetryAfterMs(response);
    throw new Error("Binance market data is temporarily rate limited.");
  }

  if (!response.ok) {
    throw new Error(`Binance ticker request failed (${response.status}).`);
  }

  return parseBinanceTickerPayload(await response.json());
}

async function refreshSnapshot() {
  if (Date.now() < upstreamBlockedUntil) {
    throw new Error("Binance market data backoff is active.");
  }

  const activePairs = await fetchActivePairs();
  const batches = chunkCryptoPairs(activePairs, 100);
  const batchPrices = await Promise.all(
    batches.map((batch) => fetchTickerBatch(batch)),
  );
  const generatedAt = Date.now();
  const prices = Object.assign({}, ...batchPrices);

  const snapshot: CentralCryptoPricePayload = {
    generatedAt,
    source: "binance",
    stale: false,
    prices,
  };
  warmSnapshot = snapshot;
  return snapshot;
}

async function getSnapshot() {
  if (!inFlightSnapshot) {
    inFlightSnapshot = refreshSnapshot().finally(() => {
      inFlightSnapshot = null;
    });
  }

  try {
    return await inFlightSnapshot;
  } catch (error) {
    if (
      warmSnapshot &&
      Date.now() - warmSnapshot.generatedAt <= MAX_WARM_STALE_MS
    ) {
      return { ...warmSnapshot, stale: true };
    }

    throw error;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Keep one canonical CDN cache key. Unknown query strings otherwise create
  // unlimited cache variants and can amplify upstream market-data requests.
  if (url.search.length > 0) {
    return Response.json(
      { error: "Query parameters are not supported." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const snapshot = await getSnapshot();
    return Response.json(snapshot, {
      status: 200,
      headers: PUBLIC_CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[crypto-prices] Central price refresh failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        generatedAt: Date.now(),
        source: "binance",
        stale: true,
        prices: {},
        error: "Live crypto prices are temporarily unavailable.",
      },
      {
        status: 503,
        headers: {
          ...PUBLIC_CACHE_HEADERS,
          "Retry-After": "5",
        },
      },
    );
  }
}
