"use client";

import { useEffect, useMemo, useState } from "react";

import type { ExistingInvestment } from "@/components/investments/InvestmentModal";
import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import { loadRuntimeCryptoCatalog } from "@/lib/market/crypto-catalog-client";

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildCatalogIndex(assets: readonly CryptoCatalogAsset[]) {
  const byId = new Map<string, CryptoCatalogAsset>();
  const bySymbol = new Map<string, CryptoCatalogAsset>();
  const byName = new Map<string, CryptoCatalogAsset>();

  for (const asset of assets) {
    const id = normalize(asset.id);
    const symbol = normalize(asset.symbol);
    const name = normalize(asset.name);

    if (id && !byId.has(id)) byId.set(id, asset);
    if (symbol && !bySymbol.has(symbol)) bySymbol.set(symbol, asset);
    if (name && !byName.has(name)) byName.set(name, asset);
  }

  return { byId, bySymbol, byName };
}

function resolveCatalogAsset(
  investment: ExistingInvestment,
  index: ReturnType<typeof buildCatalogIndex>,
) {
  const assetId = normalize(investment.asset_id);
  const symbol = normalize(investment.symbol);
  const name = normalize(investment.name);

  return (
    (assetId ? index.byId.get(assetId) : undefined) ??
    (symbol ? index.bySymbol.get(symbol) : undefined) ??
    (name ? index.byName.get(name) : undefined) ??
    null
  );
}

/**
 * Investment-page-only icon resolver.
 *
 * The built-in catalog supplies an immediate deterministic icon on first paint.
 * The shared browser catalog then replaces it with the canonical cached market
 * logo when available. `loadRuntimeCryptoCatalog` reads its six-hour local cache
 * first, so a normal page refresh does not search the provider again.
 */
export function useInvestmentPageIcons(investments: ExistingInvestment[]) {
  const [catalog, setCatalog] = useState<readonly CryptoCatalogAsset[]>(
    CRYPTO_CATALOG,
  );

  useEffect(() => {
    let active = true;

    void loadRuntimeCryptoCatalog().then((assets) => {
      if (!active || assets.length === 0) return;
      setCatalog(assets);
    });

    return () => {
      active = false;
    };
  }, []);

  const index = useMemo(() => buildCatalogIndex(catalog), [catalog]);

  return useMemo(
    () =>
      investments.map((investment) => {
        if (investment.type !== "crypto" && investment.price_source !== "binance") {
          return investment;
        }

        const catalogAsset = resolveCatalogAsset(investment, index);
        const resolvedLogo =
          catalogAsset?.logoUrl?.trim() || investment.image_url?.trim() || null;

        if (!resolvedLogo || resolvedLogo === investment.image_url) {
          return investment;
        }

        return {
          ...investment,
          image_url: resolvedLogo,
        };
      }),
    [index, investments],
  );
}
