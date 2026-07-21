"use client";

import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import { loadRuntimeCryptoCatalog } from "@/lib/market/crypto-catalog-client";
import {
  filterSearchableCryptoAssets,
  normalizeAvailableCryptoPairs,
} from "@/lib/market/crypto-search-catalog";

const STORAGE_KEY = "jamals-crypto-search-pairs-v1";
const STORAGE_TTL_MS = 5 * 60 * 1000;

type StoredPairs = {
  savedAt: number;
  pairs: string[];
};

let searchableCatalogRequest: Promise<CryptoCatalogAsset[]> | null = null;

function replaceRuntimeCatalog(assets: CryptoCatalogAsset[]) {
  if (assets.length === 0) return;
  const runtimeCatalog = CRYPTO_CATALOG as unknown as CryptoCatalogAsset[];
  runtimeCatalog.splice(0, runtimeCatalog.length, ...assets);
}

function readStoredPairs() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();

    const stored = JSON.parse(raw) as Partial<StoredPairs>;
    const savedAt = Number(stored.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > STORAGE_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return new Set<string>();
    }

    return new Set(
      Array.isArray(stored.pairs)
        ? stored.pairs
            .filter((pair): pair is string => typeof pair === "string")
            .map((pair) => pair.trim().toUpperCase())
            .filter(Boolean)
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function storePairs(pairs: ReadonlySet<string>) {
  if (typeof window === "undefined" || pairs.size === 0) return;

  try {
    const payload: StoredPairs = {
      savedAt: Date.now(),
      pairs: Array.from(pairs),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing can disable storage. The module-level promise still
    // prevents duplicate requests for the active browser session.
  }
}

async function loadAvailablePairs() {
  const stored = readStoredPairs();
  if (stored.size > 0) return stored;

  const response = await fetch("/api/market/crypto-prices", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return new Set<string>();

  const pairs = normalizeAvailableCryptoPairs(await response.json());
  storePairs(pairs);
  return pairs;
}

export function loadSearchableCryptoCatalog() {
  if (searchableCatalogRequest) return searchableCatalogRequest;

  searchableCatalogRequest = (async () => {
    const [assetsResult, pairsResult] = await Promise.allSettled([
      loadRuntimeCryptoCatalog(),
      loadAvailablePairs(),
    ]);
    const assets =
      assetsResult.status === "fulfilled" && assetsResult.value.length > 0
        ? assetsResult.value
        : Array.from(CRYPTO_CATALOG);
    const pairs =
      pairsResult.status === "fulfilled" ? pairsResult.value : new Set<string>();

    const searchable = filterSearchableCryptoAssets(assets, pairs);
    const resolved = searchable.length > 0 ? searchable : assets;
    replaceRuntimeCatalog(resolved);
    return resolved;
  })();

  return searchableCatalogRequest;
}
