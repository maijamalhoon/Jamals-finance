import { getUsdToPkrRate } from "@/lib/exchange-rate";

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";
const MAX_SEARCH_RESULTS = 8;
const MAX_PRICE_IDS = 50;

export type CryptoSearchResult = {
  id: string;
  name: string;
  symbol: string;
  thumb: string | null;
  large: string | null;
  marketCapRank: number | null;
};

export type CryptoPrice = {
  usd: number | null;
  pkr: number | null;
  change24h: number | null;
  lastUpdatedAt: string | null;
};

export type CryptoPriceResponse = {
  prices: Record<string, CryptoPrice>;
  live: boolean;
};

type CoinGeckoSearchCoin = {
  id?: unknown;
  name?: unknown;
  symbol?: unknown;
  thumb?: unknown;
  large?: unknown;
  market_cap_rank?: unknown;
};

type CoinGeckoSearchResponse = {
  coins?: CoinGeckoSearchCoin[];
};

type CoinGeckoSimplePriceRow = {
  usd?: unknown;
  usd_24h_change?: unknown;
  last_updated_at?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCoin(coin: CoinGeckoSearchCoin): CryptoSearchResult | null {
  if (
    !isNonEmptyString(coin.id) ||
    !isNonEmptyString(coin.name) ||
    !isNonEmptyString(coin.symbol)
  ) {
    return null;
  }

  return {
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    thumb: isNonEmptyString(coin.thumb) ? coin.thumb : null,
    large: isNonEmptyString(coin.large) ? coin.large : null,
    marketCapRank: toNumberOrNull(coin.market_cap_rank),
  };
}

export function normalizeCryptoIds(ids: string[]) {
  return Array.from(
    new Set(
      ids
        .map((id) => id.trim().toLowerCase())
        .filter((id) => /^[a-z0-9._-]+$/.test(id)),
    ),
  ).slice(0, MAX_PRICE_IDS);
}

export async function searchCryptoAssets(query: string) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ query: cleanQuery });
  const response = await fetch(`${COINGECKO_API_BASE}/search?${params}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const error = new Error("CoinGecko search failed");
    error.name = response.status === 429 ? "RateLimitError" : "MarketApiError";
    throw error;
  }

  const data = (await response.json()) as CoinGeckoSearchResponse;

  return (data.coins ?? [])
    .map(normalizeCoin)
    .filter((coin): coin is CryptoSearchResult => Boolean(coin))
    .slice(0, MAX_SEARCH_RESULTS);
}

export async function getCryptoPrices(ids: string[]): Promise<CryptoPriceResponse> {
  const cryptoIds = normalizeCryptoIds(ids);

  if (cryptoIds.length === 0) {
    return { prices: {}, live: false };
  }

  const params = new URLSearchParams({
    ids: cryptoIds.join(","),
    vs_currencies: "usd",
    include_24hr_change: "true",
    include_last_updated_at: "true",
    precision: "full",
  });

  const [priceResponse, exchangeRate] = await Promise.all([
    fetch(`${COINGECKO_API_BASE}/simple/price?${params}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    }),
    getUsdToPkrRate(),
  ]);

  if (!priceResponse.ok) {
    const error = new Error("CoinGecko price lookup failed");
    error.name = priceResponse.status === 429 ? "RateLimitError" : "MarketApiError";
    throw error;
  }

  const data = (await priceResponse.json()) as Record<
    string,
    CoinGeckoSimplePriceRow
  >;

  const prices = cryptoIds.reduce<Record<string, CryptoPrice>>((acc, id) => {
    const row = data[id];
    const usd = toNumberOrNull(row?.usd);
    const lastUpdated = toNumberOrNull(row?.last_updated_at);

    acc[id] = {
      usd,
      pkr: usd === null ? null : usd * exchangeRate.rate,
      change24h: toNumberOrNull(row?.usd_24h_change),
      lastUpdatedAt:
        lastUpdated === null ? null : new Date(lastUpdated * 1000).toISOString(),
    };

    return acc;
  }, {});

  return { prices, live: priceResponse.ok };
}
