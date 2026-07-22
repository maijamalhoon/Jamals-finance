import {
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import {
  searchInvestmentAssetCatalog,
  type InvestmentAssetType,
  type InvestmentMarketAsset,
  type InvestmentPriceMode,
} from "@/lib/market/investment-asset-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;
const UPSTREAM_TIMEOUT_MS = 5_500;
const VALID_QUERY = /^[\p{L}\p{N} .&+_:/()-]{2,64}$/u;
const TWELVE_SEARCH_URL = "https://api.twelvedata.com/symbol_search";
const FINNHUB_API_URL = "https://finnhub.io/api/v1";
const YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=300, stale-while-revalidate=1800",
};

type TwelveSearchRow = {
  symbol?: unknown;
  instrument_name?: unknown;
  exchange?: unknown;
  mic_code?: unknown;
  exchange_timezone?: unknown;
  instrument_type?: unknown;
  country?: unknown;
  currency?: unknown;
};

type TwelveSearchPayload = {
  data?: TwelveSearchRow[];
};

type FinnhubSearchRow = {
  description?: unknown;
  displaySymbol?: unknown;
  symbol?: unknown;
  type?: unknown;
};

type FinnhubSearchPayload = {
  result?: FinnhubSearchRow[];
};

type FinnhubProfilePayload = {
  country?: unknown;
  currency?: unknown;
  exchange?: unknown;
  logo?: unknown;
  name?: unknown;
  ticker?: unknown;
};

type YahooSearchRow = {
  symbol?: unknown;
  shortname?: unknown;
  longname?: unknown;
  quoteType?: unknown;
  exchange?: unknown;
  exchDisp?: unknown;
  currency?: unknown;
  market?: unknown;
  score?: unknown;
};

type YahooSearchPayload = {
  quotes?: YahooSearchRow[];
};

function cleanText(value: unknown, maxLength = 100) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeQuery(request: Request) {
  const url = new URL(request.url);
  const query = cleanText(url.searchParams.get("q"), 64);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(requestedLimit)))
    : DEFAULT_LIMIT;
  return { query, limit };
}

function normalizeCurrency(value: unknown): SupportedCurrency | null {
  const currency = cleanText(value, 3).toUpperCase();
  return isSupportedCurrency(currency) ? currency : null;
}

function normalizeAssetType(value: unknown): InvestmentAssetType | null {
  const type = cleanText(value).toLowerCase();
  if (
    type.includes("stock") ||
    type.includes("equity") ||
    type.includes("etf") ||
    type.includes("fund") ||
    type.includes("index") ||
    type.includes("depositary")
  ) {
    return "stock";
  }
  if (type.includes("forex") || type.includes("currency") || type === "fx") {
    return "forex";
  }
  if (type.includes("crypto")) return "crypto";
  return null;
}

function toAsset({
  source,
  name,
  symbol,
  assetType,
  quoteCurrency,
  priceMode,
  rank,
  logoUrl = "",
  exchange = "",
  country = "",
  marketTimezone = "",
  aliases = [],
}: {
  source: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  quoteCurrency: SupportedCurrency;
  priceMode: InvestmentPriceMode;
  rank: number;
  logoUrl?: string;
  exchange?: string;
  country?: string;
  marketTimezone?: string;
  aliases?: string[];
}): InvestmentMarketAsset {
  const providerSymbol = symbol.trim().toUpperCase();
  return {
    id: `${assetType}-${source}-${slugify(providerSymbol)}`,
    name,
    symbol: providerSymbol,
    aliases: [...aliases, exchange, country, marketTimezone].filter(Boolean),
    rank,
    logoUrl,
    assetType,
    quoteCurrency,
    priceMode,
    providerSymbol,
    binanceSymbol: null,
  };
}

function dedupeAssets(assets: readonly InvestmentMarketAsset[], limit: number) {
  const result: InvestmentMarketAsset[] = [];
  const seen = new Set<string>();

  for (const asset of assets) {
    const providerSymbol = (asset.providerSymbol || asset.symbol).trim().toUpperCase();
    if (!providerSymbol) continue;
    const key = `${asset.assetType}:${providerSymbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(asset);
    if (result.length >= limit) break;
  }

  return result;
}

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "Jamals-Finance-Market-Search/2.0",
      ...headers,
    },
  });
  if (!response.ok) throw new Error(`Market search provider failed (${response.status}).`);
  return response.json() as Promise<unknown>;
}

async function searchTwelveData(query: string, limit: number) {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
  if (!apiKey) return [];

  const parameters = new URLSearchParams({
    symbol: query,
    outputsize: String(Math.max(limit * 2, 12)),
  });
  const payload = (await fetchJson(`${TWELVE_SEARCH_URL}?${parameters}`, {
    Authorization: `apikey ${apiKey}`,
  })) as TwelveSearchPayload;

  const results: InvestmentMarketAsset[] = [];
  for (const [index, row] of (payload.data ?? []).entries()) {
    const symbol = cleanText(row.symbol, 32).toUpperCase();
    const name = cleanText(row.instrument_name || row.symbol, 100);
    const assetType = normalizeAssetType(row.instrument_type);
    const quoteCurrency = normalizeCurrency(row.currency);
    if (!symbol || !name || !assetType || !quoteCurrency) continue;

    // Dynamic crypto symbols cannot be safely mapped to Binance without an
    // exchange pair, so the existing curated Binance catalog remains primary.
    if (assetType === "crypto") continue;

    const exchange = cleanText(row.exchange || row.mic_code, 50);
    const country = cleanText(row.country, 40);
    const marketTimezone = cleanText(row.exchange_timezone, 50);
    results.push(
      toAsset({
        source: "twelve-data",
        name,
        symbol,
        assetType,
        quoteCurrency,
        priceMode: assetType === "forex" ? "realtime" : "delayed",
        rank: 30_000 + index,
        exchange,
        country,
        marketTimezone,
        aliases: [],
      }),
    );
  }
  return results;
}

function isLikelyUsTicker(symbol: string) {
  return /^[A-Z][A-Z0-9-]{0,9}$/.test(symbol);
}

async function searchFinnhub(query: string, limit: number) {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) return [];

  const parameters = new URLSearchParams({ q: query, token: apiKey });
  const payload = (await fetchJson(`${FINNHUB_API_URL}/search?${parameters}`)) as FinnhubSearchPayload;
  const candidates = (payload.result ?? [])
    .map((row) => ({
      symbol: cleanText(row.symbol || row.displaySymbol, 24).toUpperCase(),
      name: cleanText(row.description || row.displaySymbol, 100),
      type: normalizeAssetType(row.type),
    }))
    .filter(
      (row) => row.symbol && row.name && row.type === "stock" && isLikelyUsTicker(row.symbol),
    )
    .slice(0, Math.min(limit, 4));

  const profiles = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const profileQuery = new URLSearchParams({
        symbol: candidate.symbol,
        token: apiKey,
      });
      const profile = (await fetchJson(
        `${FINNHUB_API_URL}/stock/profile2?${profileQuery}`,
      )) as FinnhubProfilePayload;
      return { candidate, profile };
    }),
  );

  const results: InvestmentMarketAsset[] = [];
  for (const [index, profileResult] of profiles.entries()) {
    if (profileResult.status !== "fulfilled") continue;
    const { candidate, profile } = profileResult.value;
    const quoteCurrency = normalizeCurrency(profile.currency);
    if (!quoteCurrency) continue;
    const name = cleanText(profile.name || candidate.name, 100);
    const exchange = cleanText(profile.exchange, 50);
    const country = cleanText(profile.country, 40);
    const logoUrl = cleanText(profile.logo, 300);
    results.push(
      toAsset({
        source: "finnhub",
        name,
        symbol: candidate.symbol,
        assetType: "stock",
        quoteCurrency,
        priceMode: "realtime",
        rank: 40_000 + index,
        logoUrl,
        exchange,
        country,
        aliases: [candidate.name],
      }),
    );
  }
  return results;
}

async function searchYahoo(query: string, limit: number) {
  const parameters = new URLSearchParams({
    q: query,
    quotesCount: String(Math.max(limit * 2, 12)),
    newsCount: "0",
    enableFuzzyQuery: "true",
    quotesQueryId: "tss_match_phrase_query",
  });
  const payload = (await fetchJson(`${YAHOO_SEARCH_URL}?${parameters}`)) as YahooSearchPayload;
  const results: InvestmentMarketAsset[] = [];

  for (const [index, row] of (payload.quotes ?? []).entries()) {
    const assetType = normalizeAssetType(row.quoteType);
    const quoteCurrency = normalizeCurrency(row.currency);
    const symbol = cleanText(row.symbol, 32).toUpperCase();
    const name = cleanText(row.longname || row.shortname || row.symbol, 100);
    if (assetType !== "stock" || !quoteCurrency || !symbol || !name) continue;

    const exchange = cleanText(row.exchDisp || row.exchange, 50);
    const market = cleanText(row.market, 50);
    results.push(
      toAsset({
        source: "yahoo",
        name,
        symbol,
        assetType: "stock",
        quoteCurrency,
        priceMode: "delayed",
        rank: 50_000 + index,
        exchange,
        marketTimezone: market,
        aliases: [],
      }),
    );
  }

  return results;
}

export async function GET(request: Request) {
  const { query, limit } = normalizeQuery(request);
  if (!VALID_QUERY.test(query)) {
    return Response.json(
      { error: "Enter at least two valid search characters.", assets: [] },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const local = searchInvestmentAssetCatalog(query, limit);
  const providerResults = await Promise.allSettled([
    searchTwelveData(query, limit),
    searchFinnhub(query, limit),
    searchYahoo(query, limit),
  ]);

  const twelve = providerResults[0].status === "fulfilled" ? providerResults[0].value : [];
  const finnhub = providerResults[1].status === "fulfilled" ? providerResults[1].value : [];
  const yahoo = providerResults[2].status === "fulfilled" ? providerResults[2].value : [];
  const assets = dedupeAssets([...local, ...twelve, ...finnhub, ...yahoo], limit);

  return Response.json(
    {
      query,
      generatedAt: Date.now(),
      assets,
      providers: {
        local: local.length > 0,
        twelveData: twelve.length > 0,
        finnhub: finnhub.length > 0,
        publicFallback: yahoo.length > 0,
      },
    },
    { status: 200, headers: CACHE_HEADERS },
  );
}
