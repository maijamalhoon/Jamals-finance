import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import {
  buildCryptoMarketCatalog,
  MINIMUM_CRYPTO_MARKET_CAP_USD,
  pageReachedMarketCapFloor,
  type CoinGeckoMarketCatalogRow,
} from "@/lib/market/crypto-market-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PAGE_SIZE = 250;
const MAX_PAGES = 20;
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_WARM_STALE_MS = 24 * 60 * 60 * 1000;

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=21600, stale-while-revalidate=86400",
};
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

type CatalogSnapshot = {
  generatedAt: number;
  source: "coingecko" | "local-fallback";
  stale: boolean;
  minimumMarketCapUsd: number;
  assets: readonly CryptoCatalogAsset[];
};

type ProviderConfig = {
  baseUrl: string;
  headers: Record<string, string>;
};

let warmSnapshot: CatalogSnapshot | null = null;
let inFlightSnapshot: Promise<CatalogSnapshot> | null = null;
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

function getRetryAfterMs(response: Response) {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

async function fetchMarketPage(page: number) {
  if (Date.now() < providerBlockedUntil) {
    throw new Error("CoinGecko catalog backoff is active.");
  }

  const provider = providerConfig();
  const query = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(PAGE_SIZE),
    page: String(page),
    sparkline: "false",
    precision: "full",
  });
  const response = await fetch(
    `${provider.baseUrl}/coins/markets?${query.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "User-Agent": "Jamals-Finance-Crypto-Catalog/1.0",
        ...provider.headers,
      },
    },
  );

  if (response.status === 418 || response.status === 429) {
    providerBlockedUntil = Date.now() + getRetryAfterMs(response);
    throw new Error("CoinGecko catalog is temporarily rate limited.");
  }

  if (!response.ok) {
    throw new Error(`CoinGecko catalog request failed (${response.status}).`);
  }

  const rows = (await response.json()) as CoinGeckoMarketCatalogRow[];
  return Array.isArray(rows) ? rows : [];
}

async function refreshSnapshot(): Promise<CatalogSnapshot> {
  const rows: CoinGeckoMarketCatalogRow[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageRows = await fetchMarketPage(page);
    rows.push(...pageRows);

    if (
      pageReachedMarketCapFloor(
        pageRows,
        MINIMUM_CRYPTO_MARKET_CAP_USD,
        PAGE_SIZE,
      )
    ) {
      break;
    }
  }

  const assets = buildCryptoMarketCatalog(
    rows,
    MINIMUM_CRYPTO_MARKET_CAP_USD,
  );

  if (assets.length === 0) {
    throw new Error("CoinGecko returned no qualifying crypto assets.");
  }

  const snapshot: CatalogSnapshot = {
    generatedAt: Date.now(),
    source: "coingecko",
    stale: false,
    minimumMarketCapUsd: MINIMUM_CRYPTO_MARKET_CAP_USD,
    assets,
  };

  warmSnapshot = snapshot;
  return snapshot;
}

async function getSnapshot(): Promise<CatalogSnapshot> {
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

    console.error("[crypto-catalog] Provider refresh failed; using safe fallback", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      generatedAt: Date.now(),
      source: "local-fallback",
      stale: true,
      minimumMarketCapUsd: MINIMUM_CRYPTO_MARKET_CAP_USD,
      assets: CRYPTO_CATALOG,
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.search.length > 0) {
    return Response.json(
      { error: "Query parameters are not supported." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const snapshot = await getSnapshot();
  return Response.json(snapshot, {
    status: 200,
    headers: PUBLIC_CACHE_HEADERS,
  });
}
