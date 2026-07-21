import { describe, expect, it } from "vitest";

import type { CryptoCatalogAsset } from "./crypto-catalog";
import {
  filterSearchableCryptoAssets,
  normalizeAvailableCryptoPairs,
} from "./crypto-search-catalog";

const assets: CryptoCatalogAsset[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    aliases: [],
    rank: 1,
    logoUrl: "",
    binanceSymbol: "BTCUSDT",
  },
  {
    id: "unsupported",
    name: "Unsupported Coin",
    symbol: "NOPE",
    aliases: [],
    rank: 2,
    logoUrl: "",
    binanceSymbol: "NOPEUSDT",
  },
  {
    id: "tether",
    name: "Tether",
    symbol: "USDT",
    aliases: [],
    rank: 3,
    logoUrl: "",
    binanceSymbol: null,
  },
];

describe("crypto search catalog", () => {
  it("keeps only assets backed by the shared price snapshot", () => {
    const pairs = normalizeAvailableCryptoPairs({
      prices: {
        BTCUSDT: { priceUsd: 1 },
        "bad pair": { priceUsd: 1 },
      },
    });

    expect(filterSearchableCryptoAssets(assets, pairs).map((asset) => asset.id)).toEqual([
      "bitcoin",
      "tether",
    ]);
  });

  it("returns an empty set for malformed payloads", () => {
    expect(normalizeAvailableCryptoPairs(null).size).toBe(0);
    expect(normalizeAvailableCryptoPairs({ prices: [] }).size).toBe(0);
  });
});
