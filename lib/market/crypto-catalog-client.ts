"use client";

import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "jamals-crypto-market-catalog-v1";
const STORAGE_TTL_MS = 6 * 60 * 60 * 1000;

type CryptoAssetRow = {
  id: string;
  name: string;
  symbol: string;
  aliases: string[] | null;
  logo_url: string | null;
  rank: number | null;
  binance_symbol: string | null;
};

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

    if (
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > STORAGE_TTL_MS
    ) {
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

async function fetchSupabaseCatalog() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("crypto_assets")
    .select("id, name, symbol, aliases, logo_url, rank, binance_symbol")
    .eq("is_active", true)
    .order("rank", { ascending: true });

  if (error || !data?.length) return [];

  return (data as CryptoAssetRow[])
    .map((asset) =>
      normalizeAsset({
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        aliases: asset.aliases ?? [],
        logoUrl: asset.logo_url ?? "",
        rank: asset.rank ?? Number.MAX_SAFE_INTEGER,
        binanceSymbol: asset.binance_symbol,
      }),
    )
    .filter((asset): asset is CryptoCatalogAsset => Boolean(asset));
}

function mergeCatalogs(
  marketAssets: CryptoCatalogAsset[],
  knownAssets: CryptoCatalogAsset[],
) {
  if (marketAssets.length === 0) return knownAssets;

  const knownById = new Map(
    knownAssets.map((asset) => [asset.id.toLowerCase(), asset]),
  );

  return marketAssets.map((asset) => {
    const known = knownById.get(asset.id.toLowerCase());
    if (!known) return asset;

    return {
      ...asset,
      aliases: Array.from(new Set([...asset.aliases, ...known.aliases])),
      logoUrl: asset.logoUrl || known.logoUrl,
      binanceSymbol: asset.binanceSymbol ?? known.binanceSymbol,
    };
  });
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
    const [marketResult, supabaseResult] = await Promise.allSettled([
      fetchMarketCatalog(),
      fetchSupabaseCatalog(),
    ]);
    const marketAssets =
      marketResult.status === "fulfilled" ? marketResult.value : [];
    const knownAssets =
      supabaseResult.status === "fulfilled" && supabaseResult.value.length > 0
        ? supabaseResult.value
        : staticFallback;
    const assets = mergeCatalogs(marketAssets, knownAssets);
    const resolved = assets.length > 0 ? assets : staticFallback;

    replaceRuntimeCatalog(resolved);
    storeCatalog(resolved);
    return resolved;
  })();

  return catalogRequest;
}
