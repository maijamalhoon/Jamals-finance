"use client";

import { useEffect, useMemo, useState } from "react";

import type { InvestmentMarketAsset } from "@/lib/market/investment-asset-catalog";

import {
  useInvestmentMarketPrices as useBaseInvestmentMarketPrices,
  type MarketPriceSnapshot,
} from "./useInvestmentMarketPrices";

export type {
  MarketPriceSnapshot,
  MarketStatus,
} from "./useInvestmentMarketPrices";

const EMPTY_FALLBACK: MarketPriceSnapshot = {
  price: null,
  currency: null,
  change24h: null,
  updatedAt: null,
  status: "idle",
  source: "manual",
  priceMode: "delayed",
  marketStatus: "unknown",
  stale: false,
};

type RemotePriceRow = {
  price?: unknown;
  currency?: unknown;
  change24h?: unknown;
  updatedAt?: unknown;
  source?: unknown;
  priceMode?: unknown;
  marketStatus?: unknown;
  stale?: unknown;
};

type RemotePriceResponse = {
  prices?: Record<string, RemotePriceRow>;
};

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getCryptoProviderId(asset: InvestmentMarketAsset) {
  const id = asset.id.trim().toLowerCase();
  const providerId = id.startsWith("crypto-") ? id.slice("crypto-".length) : id;
  return /^[a-z0-9-]{1,100}$/.test(providerId) ? providerId : null;
}

function useCryptoFallbackPrices(ids: readonly string[], enabled: boolean) {
  const idKey = useMemo(
    () => Array.from(new Set(ids.filter(Boolean))).sort().join(","),
    [ids],
  );
  const normalizedIds = useMemo(() => (idKey ? idKey.split(",") : []), [idKey]);
  const [prices, setPrices] = useState<Record<string, MarketPriceSnapshot>>({});

  useEffect(() => {
    if (!enabled || normalizedIds.length === 0) {
      setPrices({});
      return;
    }

    let stopped = false;
    let controller: AbortController | null = null;
    let timer: number | null = null;

    function scheduleNext() {
      if (stopped) return;
      if (timer !== null) window.clearTimeout(timer);
      const delay = document.visibilityState === "hidden" ? 5 * 60_000 : 60_000;
      timer = window.setTimeout(load, delay);
    }

    async function load() {
      if (stopped) return;
      controller?.abort();
      controller = new AbortController();

      setPrices((current) => {
        const next = { ...current };
        for (const id of normalizedIds) {
          next[id] = {
            ...(next[id] ?? EMPTY_FALLBACK),
            status: "connecting",
          };
        }
        return next;
      });

      try {
        const response = await fetch(
          `/api/market/crypto-reference-prices?ids=${encodeURIComponent(
            normalizedIds.join(","),
          )}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as RemotePriceResponse;
        if (!response.ok) throw new Error("Crypto fallback price request failed.");

        const next: Record<string, MarketPriceSnapshot> = {};
        for (const id of normalizedIds) {
          const row = payload.prices?.[id];
          const price = toPositiveNumber(row?.price);
          const currency = String(row?.currency ?? "").trim().toUpperCase();

          next[id] =
            price !== null && currency === "USD"
              ? {
                  price,
                  currency: "USD",
                  change24h: toFiniteNumber(row?.change24h),
                  updatedAt: toPositiveNumber(row?.updatedAt) ?? Date.now(),
                  status: "live",
                  source: String(row?.source ?? "coingecko-delayed"),
                  priceMode: "delayed",
                  marketStatus: "open",
                  stale: row?.stale === true,
                }
              : {
                  ...EMPTY_FALLBACK,
                  status: "unavailable",
                };
        }

        if (!stopped) setPrices(next);
      } catch (error) {
        if (
          !stopped &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setPrices((current) => {
            const next = { ...current };
            for (const id of normalizedIds) {
              next[id] = {
                ...(next[id] ?? EMPTY_FALLBACK),
                status: next[id]?.price !== null ? "connecting" : "unavailable",
              };
            }
            return next;
          });
        }
      } finally {
        if (!stopped) scheduleNext();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(load, 0);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    timer = window.setTimeout(load, 180);

    return () => {
      stopped = true;
      controller?.abort();
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, normalizedIds]);

  return prices;
}

export function useInvestmentMarketPrices(
  assets: readonly InvestmentMarketAsset[],
  enabled: boolean,
) {
  const basePrices = useBaseInvestmentMarketPrices(assets, enabled);
  const fallbackIds = useMemo(
    () =>
      assets
        .filter((asset) => asset.assetType === "crypto" && !asset.binanceSymbol)
        .map(getCryptoProviderId)
        .filter((id): id is string => Boolean(id)),
    [assets],
  );
  const fallbackPrices = useCryptoFallbackPrices(
    fallbackIds,
    enabled && fallbackIds.length > 0,
  );

  return useMemo(() => {
    const result = { ...basePrices };

    for (const asset of assets) {
      if (asset.assetType !== "crypto" || asset.binanceSymbol) continue;
      const base = basePrices[asset.id];
      if (base?.status === "live" && base.price !== null) continue;

      const providerId = getCryptoProviderId(asset);
      if (!providerId) continue;
      const fallback = fallbackPrices[providerId];
      if (fallback) result[asset.id] = fallback;
    }

    return result;
  }, [assets, basePrices, fallbackPrices]);
}

export function useSelectedInvestmentMarketPrice(
  asset: InvestmentMarketAsset | null,
  enabled: boolean,
) {
  const prices = useInvestmentMarketPrices(asset ? [asset] : [], enabled);
  return asset ? (prices[asset.id] ?? EMPTY_FALLBACK) : EMPTY_FALLBACK;
}
