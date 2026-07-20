"use client";

import { useEffect, useMemo, useState } from "react";

import type { CryptoCatalogAsset } from "@/lib/market/crypto-catalog";

export type BinancePriceStatus =
  | "idle"
  | "connecting"
  | "live"
  | "unavailable";

export type BinancePriceSnapshot = {
  priceUsd: number | null;
  change24h: number | null;
  updatedAt: number | null;
  status: BinancePriceStatus;
};

type CentralPriceResponse = {
  generatedAt?: unknown;
  stale?: unknown;
  prices?: Record<
    string,
    {
      priceUsd?: unknown;
      change24h?: unknown;
      updatedAt?: unknown;
    }
  >;
};

type CentralPriceStore = {
  status: BinancePriceStatus;
  prices: Record<string, BinancePriceSnapshot>;
  lastSuccessAt: number | null;
};

const CENTRAL_PRICE_ENDPOINT = "/api/market/crypto-prices";
const LIVE_POLL_INTERVAL_MS = 1_000;
const MAX_RETRY_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8_000;

const EMPTY_SNAPSHOT: BinancePriceSnapshot = {
  priceUsd: null,
  change24h: null,
  updatedAt: null,
  status: "idle",
};

const INITIAL_STORE: CentralPriceStore = {
  status: "idle",
  prices: {},
  lastSuccessAt: null,
};

let centralStore = INITIAL_STORE;
let subscribers = new Set<() => void>();
let pollTimer: number | null = null;
let requestController: AbortController | null = null;
let failureCount = 0;
let visibilityListenerAttached = false;

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizePair(value: string | null | undefined) {
  const pair = (value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{5,24}$/.test(pair) ? pair : null;
}

function getFixedSnapshot(asset: CryptoCatalogAsset) {
  if (asset.symbol.toUpperCase() !== "USDT") return null;

  return {
    priceUsd: 1,
    change24h: 0,
    updatedAt: Date.now(),
    status: "live" as const,
  };
}

function publishCentralStore(next: CentralPriceStore) {
  centralStore = next;
  subscribers.forEach((listener) => listener());
}

function clearPollTimer() {
  if (pollTimer === null) return;
  window.clearTimeout(pollTimer);
  pollTimer = null;
}

function getRetryDelay() {
  return Math.min(
    LIVE_POLL_INTERVAL_MS * 2 ** Math.max(0, failureCount - 1),
    MAX_RETRY_INTERVAL_MS,
  );
}

function scheduleNextPoll(delay: number) {
  clearPollTimer();
  if (subscribers.size === 0) return;
  pollTimer = window.setTimeout(runCentralPricePoll, delay);
}

function parseCentralPrices(payload: CentralPriceResponse) {
  const next: Record<string, BinancePriceSnapshot> = {};

  for (const [rawPair, row] of Object.entries(payload.prices ?? {})) {
    const pair = normalizePair(rawPair);
    const priceUsd = toPositiveFiniteNumber(row?.priceUsd);
    if (!pair || priceUsd === null) continue;

    next[pair] = {
      priceUsd,
      change24h: toFiniteNumber(row?.change24h),
      updatedAt:
        toPositiveFiniteNumber(row?.updatedAt) ??
        toPositiveFiniteNumber(payload.generatedAt) ??
        Date.now(),
      status: "live",
    };
  }

  return next;
}

async function runCentralPricePoll() {
  if (subscribers.size === 0) return;

  if (document.visibilityState === "hidden") {
    scheduleNextPoll(5_000);
    return;
  }

  if (Object.keys(centralStore.prices).length === 0) {
    publishCentralStore({ ...centralStore, status: "connecting" });
  }

  requestController?.abort();
  requestController = new AbortController();
  const timeout = window.setTimeout(
    () => requestController?.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(CENTRAL_PRICE_ENDPOINT, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: requestController.signal,
    });
    const payload = (await response.json()) as CentralPriceResponse;

    if (!response.ok) {
      throw new Error(`Central price request failed (${response.status}).`);
    }

    const prices = parseCentralPrices(payload);
    if (Object.keys(prices).length === 0) {
      throw new Error("Central price response did not include usable prices.");
    }

    failureCount = 0;
    publishCentralStore({
      status: "live",
      prices,
      lastSuccessAt:
        toPositiveFiniteNumber(payload.generatedAt) ?? Date.now(),
    });
    scheduleNextPoll(LIVE_POLL_INTERVAL_MS);
  } catch {
    failureCount += 1;
    publishCentralStore({
      ...centralStore,
      status:
        Object.keys(centralStore.prices).length > 0
          ? "connecting"
          : "unavailable",
    });
    scheduleNextPoll(getRetryDelay());
  } finally {
    window.clearTimeout(timeout);
    requestController = null;
  }
}

function handleVisibilityChange() {
  if (document.visibilityState !== "visible" || subscribers.size === 0) return;
  scheduleNextPoll(0);
}

function subscribeToCentralPrices(listener: () => void) {
  subscribers.add(listener);

  if (!visibilityListenerAttached) {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    visibilityListenerAttached = true;
  }

  if (subscribers.size === 1) {
    scheduleNextPoll(0);
  }

  return () => {
    subscribers.delete(listener);
    if (subscribers.size > 0) return;

    clearPollTimer();
    requestController?.abort();
    requestController = null;
    failureCount = 0;

    if (visibilityListenerAttached) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      visibilityListenerAttached = false;
    }
  };
}

function useCentralPrices(enabled: boolean) {
  const [snapshot, setSnapshot] = useState(centralStore);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(INITIAL_STORE);
      return;
    }

    setSnapshot(centralStore);
    return subscribeToCentralPrices(() => setSnapshot(centralStore));
  }, [enabled]);

  return snapshot;
}

function getMissingStatus(store: CentralPriceStore, enabled: boolean) {
  if (!enabled) return "idle" as const;
  return store.status === "unavailable"
    ? ("unavailable" as const)
    : ("connecting" as const);
}

export function useBinanceSearchPrices(
  assets: readonly CryptoCatalogAsset[],
  enabled: boolean,
) {
  const store = useCentralPrices(enabled && assets.length > 0);

  return useMemo(() => {
    const prices: Record<string, BinancePriceSnapshot> = {};

    for (const asset of assets) {
      const fixed = getFixedSnapshot(asset);
      if (fixed) {
        prices[asset.id] = fixed;
        continue;
      }

      const pair = normalizePair(asset.binanceSymbol);
      const live = pair ? store.prices[pair] : undefined;
      prices[asset.id] =
        live ?? {
          ...EMPTY_SNAPSHOT,
          status: pair
            ? getMissingStatus(store, enabled)
            : "unavailable",
        };
    }

    return prices;
  }, [assets, enabled, store]);
}

export function useBinanceSelectedPrice(
  asset: CryptoCatalogAsset | null,
  enabled: boolean,
) {
  const store = useCentralPrices(enabled && Boolean(asset));

  return useMemo(() => {
    if (!enabled || !asset) return EMPTY_SNAPSHOT;

    const fixed = getFixedSnapshot(asset);
    if (fixed) return fixed;

    const pair = normalizePair(asset.binanceSymbol);
    if (!pair) return { ...EMPTY_SNAPSHOT, status: "unavailable" };

    return (
      store.prices[pair] ?? {
        ...EMPTY_SNAPSHOT,
        status: getMissingStatus(store, enabled),
      }
    );
  }, [asset, enabled, store]);
}
