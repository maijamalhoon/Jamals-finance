"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type CombinedStreamMessage = {
  stream?: string;
  data?: {
    e?: string;
    E?: number;
    T?: number;
    s?: string;
    p?: string;
    c?: string;
    P?: string;
  };
};

const BINANCE_STREAM_BASE =
  "wss://stream.binance.com:9443/stream?streams=";
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000] as const;

const EMPTY_SNAPSHOT: BinancePriceSnapshot = {
  priceUsd: null,
  change24h: null,
  updatedAt: null,
  status: "idle",
};

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toFiniteChange(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePair(value: string | null | undefined) {
  const pair = (value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{5,24}$/.test(pair) ? pair : null;
}

function createStreamUrl(streams: string[]) {
  return `${BINANCE_STREAM_BASE}${streams.join("/")}`;
}

function getReconnectDelay(attempt: number) {
  return RECONNECT_DELAYS[
    Math.min(attempt, RECONNECT_DELAYS.length - 1)
  ];
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

export function useBinanceSearchPrices(
  assets: readonly CryptoCatalogAsset[],
  enabled: boolean,
) {
  const [prices, setPrices] = useState<Record<string, BinancePriceSnapshot>>({});

  const subscription = useMemo(() => {
    const pairToAssetIds = new Map<string, string[]>();
    const fixedPrices: Record<string, BinancePriceSnapshot> = {};

    for (const asset of assets) {
      const fixed = getFixedSnapshot(asset);
      if (fixed) {
        fixedPrices[asset.id] = fixed;
        continue;
      }

      const pair = normalizePair(asset.binanceSymbol);
      if (!pair) continue;

      const assetIds = pairToAssetIds.get(pair) ?? [];
      assetIds.push(asset.id);
      pairToAssetIds.set(pair, assetIds);
    }

    return {
      pairToAssetIds,
      fixedPrices,
      streams: Array.from(pairToAssetIds.keys()).map(
        (pair) => `${pair.toLowerCase()}@ticker`,
      ),
    };
  }, [assets]);

  useEffect(() => {
    setPrices(subscription.fixedPrices);
    if (!enabled || subscription.streams.length === 0) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    function connect() {
      if (disposed) return;

      socket = new WebSocket(createStreamUrl(subscription.streams));

      socket.onopen = () => {
        reconnectAttempt = 0;
      };

      socket.onmessage = (event) => {
        let message: CombinedStreamMessage;
        try {
          message = JSON.parse(String(event.data)) as CombinedStreamMessage;
        } catch {
          return;
        }

        const data = message.data;
        const pair = normalizePair(data?.s);
        const priceUsd = toFiniteNumber(data?.c);
        if (!pair || priceUsd === null) return;

        const assetIds = subscription.pairToAssetIds.get(pair);
        if (!assetIds?.length) return;

        const change24h = toFiniteChange(data?.P);
        const updatedAt = Number(data?.E) || Date.now();

        setPrices((current) => {
          const next = { ...current };
          for (const assetId of assetIds) {
            next[assetId] = {
              priceUsd,
              change24h,
              updatedAt,
              status: "live",
            };
          }
          return next;
        });
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (disposed) return;
        const delay = getReconnectDelay(reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
  }, [enabled, subscription]);

  return prices;
}

export function useBinanceSelectedPrice(
  asset: CryptoCatalogAsset | null,
  enabled: boolean,
) {
  const [snapshot, setSnapshot] =
    useState<BinancePriceSnapshot>(EMPTY_SNAPSHOT);
  const pendingRef = useRef<BinancePriceSnapshot>(EMPTY_SNAPSHOT);
  const frameRef = useRef<number | null>(null);

  const assetKey = asset
    ? `${asset.id}:${asset.binanceSymbol ?? ""}:${asset.symbol}`
    : "";

  useEffect(() => {
    if (!enabled || !asset) {
      pendingRef.current = EMPTY_SNAPSHOT;
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }

    const fixed = getFixedSnapshot(asset);
    if (fixed) {
      pendingRef.current = fixed;
      setSnapshot(fixed);
      return;
    }

    const pair = normalizePair(asset.binanceSymbol);
    if (!pair) {
      const unavailable: BinancePriceSnapshot = {
        ...EMPTY_SNAPSHOT,
        status: "unavailable",
      };
      pendingRef.current = unavailable;
      setSnapshot(unavailable);
      return;
    }
    const streamPair = pair;

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const connecting: BinancePriceSnapshot = {
      ...EMPTY_SNAPSHOT,
      status: "connecting",
    };
    pendingRef.current = connecting;
    setSnapshot(connecting);

    function flushOnNextFrame() {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setSnapshot(pendingRef.current);
      });
    }

    function connect() {
      if (disposed) return;

      const lowerPair = streamPair.toLowerCase();
      socket = new WebSocket(
        createStreamUrl([
          `${lowerPair}@trade`,
          `${lowerPair}@ticker`,
        ]),
      );

      socket.onopen = () => {
        reconnectAttempt = 0;
      };

      socket.onmessage = (event) => {
        let message: CombinedStreamMessage;
        try {
          message = JSON.parse(String(event.data)) as CombinedStreamMessage;
        } catch {
          return;
        }

        const data = message.data;
        if (!data) return;

        if (data.e === "trade") {
          const priceUsd = toFiniteNumber(data.p);
          if (priceUsd === null) return;

          pendingRef.current = {
            priceUsd,
            change24h: pendingRef.current.change24h,
            updatedAt: Number(data.T) || Number(data.E) || Date.now(),
            status: "live",
          };
          flushOnNextFrame();
          return;
        }

        if (data.e === "24hrTicker") {
          const priceUsd =
            toFiniteNumber(data.c) ?? pendingRef.current.priceUsd;
          if (priceUsd === null) return;

          pendingRef.current = {
            priceUsd,
            change24h: toFiniteChange(data.P),
            updatedAt: Number(data.E) || Date.now(),
            status: "live",
          };
          flushOnNextFrame();
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (disposed) return;

        pendingRef.current = {
          ...pendingRef.current,
          status:
            pendingRef.current.priceUsd === null ? "unavailable" : "connecting",
        };
        flushOnNextFrame();

        const delay = getReconnectDelay(reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
  }, [asset, assetKey, enabled]);

  return snapshot;
}
