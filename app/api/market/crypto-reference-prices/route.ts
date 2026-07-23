import type { InvestmentPriceMode } from "@/lib/market/investment-asset-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MAX_IDS = 25;
const UPSTREAM_TIMEOUT_MS = 7_000;
const MAX_WARM_STALE_MS = 15 * 60_000;
const VALID_ID = /^[a-z0-9-]{1,100}$/;

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=60, stale-while-revalidate=300",
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

type ProviderConfig = {
  baseUrl: string;
  headers: Record<string, string>;
};

type CoinGeckoPriceRow = {
  usd?: unknown;
  usd_24h_change?: unknown;
  last_updated_at?: unknown;
};

type PriceRow = {
  price: number;
  currency: "USD";
  change24h: number | null;
  updatedAt: number;
  source: string;
  delayed: boolean;
  priceMode: InvestmentPriceMode;
  marketStatus: "open";
  stale: boolean;
};

type WarmPriceRow = {
  savedAt: number;
  row: PriceRow;
};

const warmPrices = new Map<string, WarmPriceRow>();
let providerBlockedUntil = 0;

function providerConfig(): ProviderConfig {
  const proKey = process.env.COINGECKO_PRO_API_KEY?.trim();
  if (proKey) {
    return {
      baseUrl: "https://pro-api.coingecko.com/api/v3",
      headers: { "x-cg-pro-api-key": proKey },
    };
  }

  const demoKey = (
    process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY
  )?.trim();

  return {
    baseUrl: "https://api.coingecko.com/api/v3",
    headers: demoKey ? { "x-cg-demo-api-key": demoKey } : {},
  };
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeIds(request: Request) {
  const url = new URL(request.url);
  return Array.from(
    new Set(
      (url.searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter((id) => VALID_ID.test(id)),
    ),
  )
    .sort()
    .slice(0, MAX_IDS);
}

function getRetryAfterMs(response: Response) {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

function getWarmRows(ids: readonly string[]) {
  const now = Date.now();
  const rows: Record<string, PriceRow> = {};

  for (const id of ids) {
    const cached = warmPrices.get(id);
    if (!cached || now - cached.savedAt > MAX_WARM_STALE_MS) continue;
    rows[id] = { ...cached.row, stale: true };
  }

  return rows;
}

async function fetchProviderRows(ids: readonly string[]) {
  if (Date.now() < providerBlockedUntil) {
    throw new Error("CoinGecko price backoff is active.");
  }

  const provider = providerConfig();
  const query = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: "usd",
    include_24hr_change: "true",
    include_last_updated_at: "true",
    precision: "full",
  });

  const response = await fetch(`${provider.baseUrl}/simple/price?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "Jamals-Finance-Crypto-Fallback/1.0",
      ...provider.headers,
    },
  });

  if (response.status === 418 || response.status === 429) {
    providerBlockedUntil = Date.now() + getRetryAfterMs(response);
    throw new Error("CoinGecko price service is temporarily rate limited.");
  }

  if (!response.ok) {
    throw new Error(`CoinGecko price request failed (${response.status}).`);
  }

  const payload = (await response.json()) as Record<string, CoinGeckoPriceRow>;
  const rows: Record<string, PriceRow> = {};
  const now = Date.now();

  for (const id of ids) {
    const providerRow = payload[id];
    const price = toPositiveNumber(providerRow?.usd);
    if (price === null) continue;

    const updatedSeconds = toPositiveNumber(providerRow?.last_updated_at);
    const updatedAt = updatedSeconds ? updatedSeconds * 1000 : now;
    const row: PriceRow = {
      price,
      currency: "USD",
      change24h: toFiniteNumber(providerRow?.usd_24h_change),
      updatedAt,
      source: "coingecko-delayed",
      delayed: true,
      priceMode: "delayed",
      marketStatus: "open",
      stale: now - updatedAt > 10 * 60_000,
    };

    rows[id] = row;
    warmPrices.set(id, { savedAt: now, row });
  }

  return rows;
}

export async function GET(request: Request) {
  const ids = normalizeIds(request);
  if (ids.length === 0) {
    return Response.json(
      { error: "Provide at least one valid crypto asset id." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const prices = await fetchProviderRows(ids);
    return Response.json(
      {
        generatedAt: Date.now(),
        source: "coingecko-delayed",
        prices,
      },
      {
        status: Object.keys(prices).length > 0 ? 200 : 503,
        headers: CACHE_HEADERS,
      },
    );
  } catch (error) {
    const prices = getWarmRows(ids);
    console.warn("[crypto-reference-prices] Provider unavailable", {
      message: error instanceof Error ? error.message : "Unknown error",
      cachedRows: Object.keys(prices).length,
    });

    return Response.json(
      {
        generatedAt: Date.now(),
        source: "coingecko-delayed",
        stale: true,
        prices,
      },
      {
        status: Object.keys(prices).length > 0 ? 200 : 503,
        headers: {
          ...CACHE_HEADERS,
          "Retry-After": "60",
        },
      },
    );
  }
}
