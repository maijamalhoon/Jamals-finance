"use client";

import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import { loadRuntimeCryptoCatalog } from "@/lib/market/crypto-catalog-client";

let searchableCatalogRequest: Promise<CryptoCatalogAsset[]> | null = null;

function replaceRuntimeCatalog(assets: CryptoCatalogAsset[]) {
  if (assets.length === 0) return;
  const runtimeCatalog = CRYPTO_CATALOG as unknown as CryptoCatalogAsset[];
  runtimeCatalog.splice(0, runtimeCatalog.length, ...assets);
}

export function loadSearchableCryptoCatalog() {
  if (searchableCatalogRequest) return searchableCatalogRequest;

  searchableCatalogRequest = loadRuntimeCryptoCatalog()
    .then((assets) => {
      const resolved = assets.length > 0 ? assets : Array.from(CRYPTO_CATALOG);
      replaceRuntimeCatalog(resolved);
      return resolved;
    })
    .catch(() => Array.from(CRYPTO_CATALOG));

  return searchableCatalogRequest;
}
