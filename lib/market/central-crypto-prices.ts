import { CRYPTO_CATALOG } from "@/lib/market/crypto-catalog";

export type CentralCryptoPrice = {
  priceUsd: number;
  change24h: number | null;
  updatedAt: number;
};

export type CentralCryptoPricePayload = {
  generatedAt: number;
  source: "binance";
  stale: boolean;
  prices: Record<string, CentralCryptoPrice>;
};

type BinanceTickerRow = {
  symbol?: unknown;
  lastPrice?: unknown;
  priceChangePercent?: unknown;
  closeTime?: unknown;
};

const VALID_PAIR = /^[A-Z0-9]{5,24}$/;

export const CENTRAL_CRYPTO_PAIRS = Array.from(
  new Set(
    CRYPTO_CATALOG.map((asset) => asset.binanceSymbol?.trim().toUpperCase())
      .filter((pair): pair is string => Boolean(pair && VALID_PAIR.test(pair))),
  ),
).sort();

export function chunkCryptoPairs(pairs: readonly string[], size = 100) {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: string[][] = [];

  for (let index = 0; index < pairs.length; index += safeSize) {
    chunks.push(pairs.slice(index, index + safeSize));
  }

  return chunks;
}

function toPositiveFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBinanceTickerPayload(
  payload: unknown,
  fallbackTimestamp = Date.now(),
) {
  const rows = Array.isArray(payload) ? payload : [payload];
  const prices: Record<string, CentralCryptoPrice> = {};

  for (const candidate of rows) {
    if (!candidate || typeof candidate !== "object") continue;

    const row = candidate as BinanceTickerRow;
    const symbol = String(row.symbol ?? "").trim().toUpperCase();
    const priceUsd = toPositiveFiniteNumber(row.lastPrice);

    if (!VALID_PAIR.test(symbol) || priceUsd === null) continue;

    prices[symbol] = {
      priceUsd,
      change24h: toFiniteNumber(row.priceChangePercent),
      updatedAt: toPositiveFiniteNumber(row.closeTime) ?? fallbackTimestamp,
    };
  }

  return prices;
}
