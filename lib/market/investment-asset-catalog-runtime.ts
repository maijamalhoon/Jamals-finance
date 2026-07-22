import { isSupportedCurrency } from "@/lib/currency";
import {
  getInvestmentAssetCatalog as getBaseInvestmentAssetCatalog,
  getInvestmentMarketAsset as getBaseInvestmentMarketAsset,
  searchInvestmentAssetCatalog as searchBaseInvestmentAssetCatalog,
  type InvestmentAssetType,
  type InvestmentMarketAsset,
  type InvestmentPriceMode,
} from "./investment-asset-catalog";

export type {
  InvestmentAssetType,
  InvestmentMarketAsset,
  InvestmentPriceMode,
} from "./investment-asset-catalog";

const ASSET_UPDATE_EVENT = "jamals:investment-assets-updated";
const REMOTE_SEARCH_DELAY_MS = 260;
const remoteAssets = new Map<string, InvestmentMarketAsset>();
const searchCache = new Map<string, InvestmentMarketAsset[]>();
const searchTimers = new Map<string, number>();
const activeRequests = new Map<string, AbortController>();
let latestClientSearchKey = "";

type SearchResponse = {
  assets?: unknown;
};

function isAssetType(value: unknown): value is InvestmentAssetType {
  return value === "crypto" || value === "stock" || value === "forex";
}

function isPriceMode(value: unknown): value is InvestmentPriceMode {
  return value === "realtime" || value === "delayed" || value === "reference";
}

function isMarketAsset(value: unknown): value is InvestmentMarketAsset {
  if (!value || typeof value !== "object") return false;
  const asset = value as Partial<InvestmentMarketAsset>;
  return (
    typeof asset.id === "string" &&
    asset.id.length > 0 &&
    typeof asset.name === "string" &&
    asset.name.length > 0 &&
    typeof asset.symbol === "string" &&
    asset.symbol.length > 0 &&
    Array.isArray(asset.aliases) &&
    typeof asset.rank === "number" &&
    typeof asset.logoUrl === "string" &&
    isAssetType(asset.assetType) &&
    typeof asset.quoteCurrency === "string" &&
    isSupportedCurrency(asset.quoteCurrency) &&
    isPriceMode(asset.priceMode) &&
    (typeof asset.providerSymbol === "string" || asset.providerSymbol === null) &&
    (typeof asset.binanceSymbol === "string" || asset.binanceSymbol === null)
  );
}

function getAssetKey(asset: InvestmentMarketAsset) {
  const providerSymbol = (asset.providerSymbol || asset.symbol).trim().toUpperCase();
  return `${asset.assetType}:${providerSymbol}`;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function getCandidateScore(asset: InvestmentMarketAsset, normalizedQuery: string) {
  const symbol = normalizeSearchValue(asset.symbol);
  const name = normalizeSearchValue(asset.name);
  const aliases = asset.aliases.map(normalizeSearchValue);

  if (symbol === normalizedQuery) return 0;
  if (name === normalizedQuery) return 1;
  if (aliases.includes(normalizedQuery)) return 2;
  if (symbol.startsWith(normalizedQuery)) return 10;
  if (name.startsWith(normalizedQuery)) return 20;
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 25;
  if (symbol.includes(normalizedQuery)) return 30;
  if (name.includes(normalizedQuery)) return 40;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) return 45;
  return 100;
}

export function rankInvestmentAssetCandidates(
  query: string,
  candidates: readonly InvestmentMarketAsset[],
  limit: number,
) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery || limit <= 0) return [];

  const deduped = new Map<string, InvestmentMarketAsset>();
  for (const asset of candidates) {
    const key = getAssetKey(asset);
    if (!key || deduped.has(key)) continue;
    deduped.set(key, asset);
  }

  return Array.from(deduped.values())
    .sort((left, right) => {
      const scoreDifference =
        getCandidateScore(left, normalizedQuery) -
        getCandidateScore(right, normalizedQuery);
      if (scoreDifference !== 0) return scoreDifference;

      const providerDifference =
        Number(Boolean(right.providerSymbol || right.binanceSymbol)) -
        Number(Boolean(left.providerSymbol || left.binanceSymbol));
      if (providerDifference !== 0) return providerDifference;

      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

function mergeAssets(
  query: string,
  preferred: readonly InvestmentMarketAsset[],
  fallback: readonly InvestmentMarketAsset[],
  limit: number,
) {
  return rankInvestmentAssetCandidates(query, [...preferred, ...fallback], limit);
}

function dispatchAssetUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ASSET_UPDATE_EVENT));
}

function cancelSupersededSearches(nextKey: string) {
  if (typeof window === "undefined" || latestClientSearchKey === nextKey) return;
  latestClientSearchKey = nextKey;

  for (const [key, timer] of searchTimers) {
    if (key === nextKey) continue;
    window.clearTimeout(timer);
    searchTimers.delete(key);
  }
  for (const [key, controller] of activeRequests) {
    if (key === nextKey) continue;
    controller.abort();
    activeRequests.delete(key);
  }
}

function scheduleRemoteSearch(
  query: string,
  limit: number,
  mutableResults: InvestmentMarketAsset[],
) {
  if (typeof window === "undefined" || query.trim().length < 2) return;
  const cacheKey = `${query.trim().toLowerCase()}:${limit}`;
  cancelSupersededSearches(cacheKey);

  const cached = searchCache.get(cacheKey);
  if (cached) {
    mutableResults.splice(0, mutableResults.length, ...cached);
    return;
  }
  if (searchTimers.has(cacheKey) || activeRequests.has(cacheKey)) return;

  const timer = window.setTimeout(async () => {
    searchTimers.delete(cacheKey);
    const controller = new AbortController();
    activeRequests.set(cacheKey, controller);
    try {
      const parameters = new URLSearchParams({
        q: query.trim(),
        limit: String(limit),
      });
      const response = await fetch(`/api/market/asset-search?${parameters}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const payload = (await response.json()) as SearchResponse;
      if (!response.ok || !Array.isArray(payload.assets)) return;

      const validated = payload.assets.filter(isMarketAsset);
      const merged = mergeAssets(query, validated, mutableResults, limit);
      for (const asset of validated) remoteAssets.set(getAssetKey(asset), asset);
      searchCache.set(cacheKey, merged);
      mutableResults.splice(0, mutableResults.length, ...merged);
      if (latestClientSearchKey === cacheKey) dispatchAssetUpdate();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("[investment-asset-search] Remote search unavailable");
      }
    } finally {
      activeRequests.delete(cacheKey);
    }
  }, REMOTE_SEARCH_DELAY_MS);

  searchTimers.set(cacheKey, timer);
}

export function getInvestmentAssetCatalog() {
  return [...getBaseInvestmentAssetCatalog(), ...remoteAssets.values()];
}

export function searchInvestmentAssetCatalog(query: string, limit = 8) {
  const local = searchBaseInvestmentAssetCatalog(query, limit);
  if (typeof window === "undefined" || query.trim().length < 2 || limit <= 0) {
    return local;
  }

  const cacheKey = `${query.trim().toLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return [...cached];

  const mutableResults = [...local];
  scheduleRemoteSearch(query, limit, mutableResults);
  return mutableResults;
}

export function getInvestmentMarketAsset(
  assetId: string | null | undefined,
  symbol: string | null | undefined,
  type: string | null | undefined,
) {
  const base = getBaseInvestmentMarketAsset(assetId, symbol, type);
  if (base) return base;

  const normalizedId = (assetId ?? "").trim().toLowerCase();
  const normalizedSymbol = (symbol ?? "").trim().toUpperCase();
  const normalizedType = (type ?? "").trim().toLowerCase();
  const assets = Array.from(remoteAssets.values());
  if (normalizedId) {
    const byId = assets.find((asset) => asset.id.toLowerCase() === normalizedId);
    if (byId) return byId;
  }
  if (!normalizedSymbol) return null;
  return (
    assets.find(
      (asset) =>
        asset.symbol.toUpperCase() === normalizedSymbol &&
        asset.assetType === normalizedType,
    ) ??
    assets.find((asset) => asset.symbol.toUpperCase() === normalizedSymbol) ??
    null
  );
}

export const INVESTMENT_ASSET_UPDATE_EVENT = ASSET_UPDATE_EVENT;
