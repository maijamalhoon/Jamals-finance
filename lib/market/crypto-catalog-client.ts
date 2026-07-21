"use client";

import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";

const STORAGE_KEY = "jamals-crypto-market-catalog-v2";
const STORAGE_TTL_MS = 6 * 60 * 60 * 1000;

type CatalogApiResponse = {
  generatedAt?: unknown;
  assets?: unknown;
};

type StoredCatalog = {
  savedAt: number;
  assets: CryptoCatalogAsset[];
};

let catalogRequest: Promise<CryptoCatalogAsset[]> | null = null;

function validString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAsset(value: unknown): CryptoCatalogAsset | null {
  if (!value || typeof value !== "object") return null;
  const asset = value as Partial<CryptoCatalogAsset>;
  const rank = Number(asset.rank);

  if (
    !validString(asset.id) ||
    !validString(asset.name) ||
    !validString(asset.symbol) ||
    !Number.isFinite(rank) ||
    rank <= 0
  ) {
    return null;
  }

  return {
    id: asset.id.trim().toLowerCase(),
    name: asset.name.trim(),
    symbol: asset.symbol.trim().toUpperCase(),
    aliases: Array.isArray(asset.aliases)
      ? asset.aliases.filter(validString).map((alias) => alias.trim())
      : [],
    rank,
    logoUrl: validString(asset.logoUrl) ? asset.logoUrl.trim() : "",
    binanceSymbol: validString(asset.binanceSymbol)
      ? asset.binanceSymbol.trim().toUpperCase()
      : null,
  };
}

function normalizeAssets(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .map(normalizeAsset)
    .filter((asset): asset is CryptoCatalogAsset => {
      if (!asset || seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    })
    .sort((left, right) => left.rank - right.rank);
}

function replaceRuntimeCatalog(assets: CryptoCatalogAsset[]) {
  if (assets.length === 0) return;
  const runtimeCatalog = CRYPTO_CATALOG as unknown as CryptoCatalogAsset[];
  runtimeCatalog.splice(0, runtimeCatalog.length, ...assets);
}

function readStoredCatalog() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as Partial<StoredCatalog>;
    const savedAt = Number(stored.savedAt);

    if (!Number.isFinite(savedAt) || Date.now() - savedAt > STORAGE_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return normalizeAssets(stored.assets);
  } catch {
    return [];
  }
}

function storeCatalog(assets: CryptoCatalogAsset[]) {
  if (typeof window === "undefined" || assets.length === 0) return;

  try {
    const payload: StoredCatalog = {
      savedAt: Date.now(),
      assets,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable in private browsing. The module-level promise
    // still prevents duplicate requests for the current page session.
  }
}

async function fetchMarketCatalog() {
  const response = await fetch("/api/market/crypto-prices/catalog", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];

  const payload = (await response.json()) as CatalogApiResponse;
  return normalizeAssets(payload.assets);
}

export function loadRuntimeCryptoCatalog() {
  if (catalogRequest) return catalogRequest;

  catalogRequest = (async () => {
    const stored = readStoredCatalog();
    if (stored.length > 0) {
      replaceRuntimeCatalog(stored);
      return stored;
    }

    const staticFallback = Array.from(CRYPTO_CATALOG);

    try {
      const marketAssets = await fetchMarketCatalog();
      const resolved = marketAssets.length > 0 ? marketAssets : staticFallback;
      replaceRuntimeCatalog(resolved);
      storeCatalog(resolved);
      return resolved;
    } catch {
      replaceRuntimeCatalog(staticFallback);
      return staticFallback;
    }
  })();

  return catalogRequest;
}
