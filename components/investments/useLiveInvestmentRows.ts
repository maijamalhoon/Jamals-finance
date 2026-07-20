"use client";

import { useEffect, useMemo, useState } from "react";

import { useBinanceSearchPrices } from "@/components/investments/useBinanceLivePrices";
import type { InvestmentLike } from "@/lib/investments/aggregation";
import type { CryptoCatalogAsset } from "@/lib/market/crypto-catalog";
import { createClient } from "@/lib/supabase/client";

type CryptoAssetRow = {
  id: string;
  name: string;
  symbol: string;
  aliases: string[] | null;
  logo_url: string | null;
  rank: number | null;
  binance_symbol: string | null;
};

type CatalogIndex = {
  byId: Map<string, CryptoCatalogAsset>;
  bySymbol: Map<string, CryptoCatalogAsset>;
};

let catalogRequest: Promise<CatalogIndex> | null = null;
let usdPkrRequest: Promise<number | null> | null = null;

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
}

function isCryptoInvestment(investment: InvestmentLike) {
  const type = normalize(investment.type).toLowerCase();
  const source = normalize(investment.price_source).toLowerCase();
  return type === "crypto" || source === "binance";
}

function fallbackBinancePair(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,16}$/.test(normalized)) return null;
  if (normalized === "USDT") return null;
  if (normalized === "BTT") return "BTTCUSDT";
  return `${normalized}USDT`;
}

function toCatalogAsset(row: CryptoAssetRow): CryptoCatalogAsset {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol.toUpperCase(),
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    rank: Number.isFinite(Number(row.rank)) ? Number(row.rank) : 999999,
    logoUrl: row.logo_url ?? "",
    binanceSymbol: row.binance_symbol,
  };
}

async function loadCatalogIndex() {
  if (catalogRequest) return catalogRequest;

  catalogRequest = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("crypto_assets")
      .select("id, name, symbol, aliases, logo_url, rank, binance_symbol")
      .eq("is_active", true)
      .order("rank", { ascending: true });

    const byId = new Map<string, CryptoCatalogAsset>();
    const bySymbol = new Map<string, CryptoCatalogAsset>();

    if (error || !data?.length) return { byId, bySymbol };

    for (const row of data as CryptoAssetRow[]) {
      const asset = toCatalogAsset(row);
      byId.set(asset.id.toLowerCase(), asset);
      if (!bySymbol.has(asset.symbol)) bySymbol.set(asset.symbol, asset);
    }

    return { byId, bySymbol };
  })();

  return catalogRequest;
}

async function loadUsdPkrRate() {
  if (usdPkrRequest) return usdPkrRequest;

  usdPkrRequest = fetch("/api/exchange-rate", { cache: "no-store" })
    .then(async (response) => {
      const data = (await response.json()) as { rate?: number };
      const rate = Number(data.rate);
      return response.ok && Number.isFinite(rate) && rate > 0 ? rate : null;
    })
    .catch(() => null);

  return usdPkrRequest;
}

export function useLiveInvestmentRows<T extends InvestmentLike>(investments: T[]) {
  const [catalog, setCatalog] = useState<CatalogIndex>({
    byId: new Map(),
    bySymbol: new Map(),
  });
  const [usdPkrRate, setUsdPkrRate] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([loadCatalogIndex(), loadUsdPkrRate()]).then(
      ([nextCatalog, nextRate]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setUsdPkrRate(nextRate);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(() => {
    const assetsByKey = new Map<string, CryptoCatalogAsset>();
    const investmentAssetKeys = new Map<string, string>();

    for (const investment of investments) {
      if (!isCryptoInvestment(investment)) continue;

      const assetId = normalize(investment.asset_id).toLowerCase();
      const symbol = normalize(investment.symbol).toUpperCase();
      const catalogAsset =
        (assetId ? catalog.byId.get(assetId) : undefined) ??
        (symbol ? catalog.bySymbol.get(symbol) : undefined);

      const fallbackAsset: CryptoCatalogAsset | null = symbol
        ? {
            id: assetId || `symbol-${symbol.toLowerCase()}`,
            name: normalize(investment.name) || symbol,
            symbol,
            aliases: [],
            rank: 999999,
            logoUrl: normalize(investment.image_url),
            binanceSymbol: fallbackBinancePair(symbol),
          }
        : null;

      const asset = catalogAsset ?? fallbackAsset;
      if (!asset) continue;

      assetsByKey.set(asset.id, asset);
      investmentAssetKeys.set(investment.id, asset.id);
    }

    return {
      assets: Array.from(assetsByKey.values()),
      investmentAssetKeys,
    };
  }, [catalog, investments]);

  const prices = useBinanceSearchPrices(
    resolved.assets,
    resolved.assets.length > 0,
  );

  return useMemo(() => {
    if (usdPkrRate === null) return investments;

    return investments.map((investment) => {
      const assetKey = resolved.investmentAssetKeys.get(investment.id);
      const snapshot = assetKey ? prices[assetKey] : undefined;

      if (
        snapshot?.status !== "live" ||
        snapshot.priceUsd === null ||
        !Number.isFinite(snapshot.priceUsd) ||
        snapshot.priceUsd <= 0
      ) {
        return investment;
      }

      const currentPricePkr = snapshot.priceUsd * usdPkrRate;
      if (!Number.isFinite(currentPricePkr) || currentPricePkr <= 0) {
        return investment;
      }

      return {
        ...investment,
        current_price: currentPricePkr,
        current_price_original: snapshot.priceUsd,
        current_price_currency: "USD",
        price_source: "binance",
        price_currency: "PKR",
        price_updated_at: new Date(
          snapshot.updatedAt ?? Date.now(),
        ).toISOString(),
        price_change_24h: snapshot.change24h,
        is_live_priced: true,
      };
    }) as T[];
  }, [investments, prices, resolved.investmentAssetKeys, usdPkrRate]);
}
