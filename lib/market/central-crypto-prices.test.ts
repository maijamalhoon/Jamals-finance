import { describe, expect, it } from "vitest";

import {
  CENTRAL_CRYPTO_PAIRS,
  chunkCryptoPairs,
  parseBinanceTickerPayload,
} from "./central-crypto-prices";

describe("central crypto price helpers", () => {
  it("keeps catalog pairs unique and normalized", () => {
    expect(CENTRAL_CRYPTO_PAIRS.length).toBeGreaterThan(0);
    expect(new Set(CENTRAL_CRYPTO_PAIRS).size).toBe(
      CENTRAL_CRYPTO_PAIRS.length,
    );
    expect(
      CENTRAL_CRYPTO_PAIRS.every((pair) => pair === pair.toUpperCase()),
    ).toBe(true);
  });

  it("chunks upstream requests at the requested size", () => {
    expect(chunkCryptoPairs(["A", "B", "C", "D", "E"], 2)).toEqual([
      ["A", "B"],
      ["C", "D"],
      ["E"],
    ]);
  });

  it("parses valid Binance ticker rows and ignores malformed rows", () => {
    expect(
      parseBinanceTickerPayload(
        [
          {
            symbol: "BTCUSDT",
            lastPrice: "123.45",
            priceChangePercent: "1.25",
            closeTime: 1_700_000_000_000,
          },
          { symbol: "BAD", lastPrice: "10" },
          { symbol: "ETHUSDT", lastPrice: "not-a-number" },
        ],
        99,
      ),
    ).toEqual({
      BTCUSDT: {
        priceUsd: 123.45,
        change24h: 1.25,
        updatedAt: 1_700_000_000_000,
      },
    });
  });
});
