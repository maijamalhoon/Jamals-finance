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

type PairStore = {
  status: BinancePriceStatus;
  prices: Record<string, BinancePriceSnapshot>;
};

type BinanceTickerEvent = {
  s?: unknown;
  c?: unknown;
  P?: unknown;
  E?: unknown;
};

type CombinedStreamPayload = {
  data?: BinanceTickerEvent;
};

const EMPTY_SNAPSHOT: BinancePriceSnapshot = {
  priceUsd: null,
  change24h: null,
  updatedAt: null,
  status: "idle",
};

const SOCKET_BASES = [
  "wss://stream.binance.com:9443/stream?streams=",
  "wss://data-stream.binance.vision/stream?streams=",
] as const;
const FLUSH_INTERVAL_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const STREAMS_PER_SOCKET = 80;

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

function chunkPairs(pairs: readonly string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < pairs.length; index += STREAMS_PER_SOCKET) {
    chunks.push(pairs.slice(index, index + STREAMS_PER_SOCKET));
  }
  return chunks;
}

function useBinancePairs(pairs: readonly string[], enabled: boolean) {
  const pairKey = useMemo(
    () =>
      Array.from(new Set(pairs.map(normalizePair).filter(Boolean) as string[]))
        .sort()
        .join(","),
    [pairs],
  );
  const normalizedPairs = useMemo(
    () => (pairKey ? pairKey.split(",") : []),
    [pairKey],
  );
  const [store, setStore] = useState<PairStore>({
    status: "idle",
    prices: {},
  });

  useEffect(() => {
    if (!enabled || normalizedPairs.length === 0 || typeof window === "undefined") {
      setStore({ status: "idle", prices: {} });
      return;
    }

    let stopped = false;
    let dirty = false;
    let receivedAny = false;
    let sourceIndex = 0;
    const attempts = new Map<number, number>();
    const sockets = new Map<number, WebSocket>();
    const reconnectTimers = new Map<number, number>();
    const latest: Record<string, BinancePriceSnapshot> = {};
    const chunks = chunkPairs(normalizedPairs);

    setStore({ status: "connecting", prices: {} });

    function clearReconnectTimer(index: number) {
      const timer = reconnectTimers.get(index);
      if (timer !== undefined) window.clearTimeout(timer);
      reconnectTimers.delete(index);
    }

    function closeSocket(index: number) {
      const socket = sockets.get(index);
      if (!socket) return;
      sockets.delete(index);
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // The browser can throw when a socket is already closing.
      }
    }

    function scheduleReconnect(index: number) {
      if (stopped || document.visibilityState === "hidden") return;
      clearReconnectTimer(index);
      const attempt = (attempts.get(index) ?? 0) + 1;
      attempts.set(index, attempt);
      const delay = Math.min(1_000 * 2 ** Math.max(0, attempt - 1), MAX_RETRY_MS);

      if (!receivedAny && attempt >= 3) {
        setStore((current) => ({ ...current, status: "unavailable" }));
      } else {
        setStore((current) => ({ ...current, status: "connecting" }));
      }

      reconnectTimers.set(
        index,
        window.setTimeout(() => connectChunk(index), delay),
      );
    }

    function handleTicker(event: BinanceTickerEvent) {
      const pair = normalizePair(typeof event.s === "string" ? event.s : null);
      const priceUsd = toPositiveFiniteNumber(event.c);
      if (!pair || priceUsd === null) return;

      latest[pair] = {
        priceUsd,
        change24h: toFiniteNumber(event.P),
        updatedAt: toPositiveFiniteNumber(event.E) ?? Date.now(),
        status: "live",
      };
      receivedAny = true;
      dirty = true;
    }

    function connectChunk(index: number) {
      if (stopped || document.visibilityState === "hidden") return;
      const chunk = chunks[index];
      if (!chunk || chunk.length === 0) return;

      clearReconnectTimer(index);
      closeSocket(index);

      const streams = chunk.map((pair) => `${pair.toLowerCase()}@ticker`).join("/");
      const base = SOCKET_BASES[(sourceIndex + index) % SOCKET_BASES.length];
      let socket: WebSocket;

      try {
        socket = new WebSocket(`${base}${streams}`);
      } catch {
        sourceIndex = (sourceIndex + 1) % SOCKET_BASES.length;
        scheduleReconnect(index);
        return;
      }

      sockets.set(index, socket);

      socket.onopen = () => {
        attempts.set(index, 0);
        setStore((current) => ({
          ...current,
          status: receivedAny ? "live" : "connecting",
        }));
      };

      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(String(message.data)) as
            | CombinedStreamPayload
            | BinanceTickerEvent;
          const ticker =
            payload && typeof payload === "object" && "data" in payload
              ? payload.data
              : (payload as BinanceTickerEvent);
          if (ticker) handleTicker(ticker);
        } catch {
          // Ignore one malformed upstream event and keep the stream alive.
        }
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          scheduleReconnect(index);
        }
      };

      socket.onclose = () => {
        sockets.delete(index);
        sourceIndex = (sourceIndex + 1) % SOCKET_BASES.length;
        scheduleReconnect(index);
      };
    }

    function connectAll() {
      chunks.forEach((_, index) => connectChunk(index));
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        sockets.forEach((_, index) => closeSocket(index));
        reconnectTimers.forEach((timer) => window.clearTimeout(timer));
        reconnectTimers.clear();
        return;
      }

      setStore((current) => ({
        ...current,
        status: receivedAny ? "live" : "connecting",
      }));
      connectAll();
    }

    const flushTimer = window.setInterval(() => {
      if (!dirty || stopped) return;
      dirty = false;
      setStore({
        status: receivedAny ? "live" : "connecting",
        prices: { ...latest },
      });
    }, FLUSH_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    connectAll();

    return () => {
      stopped = true;
      window.clearInterval(flushTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reconnectTimers.forEach((timer) => window.clearTimeout(timer));
      reconnectTimers.clear();
      sockets.forEach((_, index) => closeSocket(index));
      sockets.clear();
    };
  }, [enabled, normalizedPairs]);

  return store;
}

function getMissingStatus(store: PairStore, enabled: boolean) {
  if (!enabled) return "idle" as const;
  return store.status === "unavailable"
    ? ("unavailable" as const)
    : ("connecting" as const);
}

export function useBinanceSearchPrices(
  assets: readonly CryptoCatalogAsset[],
  enabled: boolean,
) {
  const pairs = useMemo(
    () =>
      assets
        .map((asset) => normalizePair(asset.binanceSymbol))
        .filter(Boolean) as string[],
    [assets],
  );
  const store = useBinancePairs(pairs, enabled && assets.length > 0);

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
          status: pair ? getMissingStatus(store, enabled) : "unavailable",
        };
    }

    return prices;
  }, [assets, enabled, store]);
}

export function useBinanceSelectedPrice(
  asset: CryptoCatalogAsset | null,
  enabled: boolean,
) {
  const prices = useBinanceSearchPrices(asset ? [asset] : [], enabled);
  return asset ? (prices[asset.id] ?? EMPTY_SNAPSHOT) : EMPTY_SNAPSHOT;
}
