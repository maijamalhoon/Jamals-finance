import { describe, expect, it } from "vitest";

import {
  buildCryptoMarketCatalog,
  MINIMUM_CRYPTO_MARKET_CAP_USD,
  pageReachedMarketCapFloor,
} from "./crypto-market-catalog";

describe("crypto market catalog", () => {
  it("keeps only coins at or above the market-cap floor", () => {
    const assets = buildCryptoMarketCatalog([
      {
        id: "bitcoin",
        name: "Bitcoin",
        symbol: "btc",
        image:
          "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
        market_cap: MINIMUM_CRYPTO_MARKET_CAP_USD + 1,
        market_cap_rank: 1,
      },
      {
        id: "tiny-token",
        name: "Tiny Token",
        symbol: "tiny",
        image:
          "https://coin-images.coingecko.com/coins/images/2/large/tiny.png",
        market_cap: MINIMUM_CRYPTO_MARKET_CAP_USD - 1,
        market_cap_rank: 5000,
      },
    ]);

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      rank: 1,
      binanceSymbol: "BTCUSDT",
    });
    expect(assets[0]?.logoUrl).toContain("coin-images.coingecko.com");
  });

  it("rejects untrusted image hosts and duplicate ids", () => {
    const assets = buildCryptoMarketCatalog([
      {
        id: "example",
        name: "Example",
        symbol: "ex",
        image: "https://untrusted.example/logo.png",
        market_cap: 50_000_000,
        market_cap_rank: 20,
      },
      {
        id: "example",
        name: "Duplicate",
        symbol: "dup",
        image:
          "https://coin-images.coingecko.com/coins/images/4/large/dup.png",
        market_cap: 40_000_000,
        market_cap_rank: 30,
      },
    ]);

    expect(assets).toHaveLength(1);
    expect(assets[0]?.name).toBe("Example");
    expect(assets[0]?.logoUrl).toBe("");
  });

  it("stops pagination when a page reaches the floor", () => {
    const fullPage = Array.from({ length: 250 }, (_, index) => ({
      id: `coin-${index}`,
      name: `Coin ${index}`,
      symbol: `c${index}`,
      market_cap: MINIMUM_CRYPTO_MARKET_CAP_USD + 1,
    }));

    expect(pageReachedMarketCapFloor(fullPage)).toBe(false);
    expect(
      pageReachedMarketCapFloor([
        ...fullPage.slice(0, 249),
        {
          id: "below-floor",
          name: "Below Floor",
          symbol: "low",
          market_cap: MINIMUM_CRYPTO_MARKET_CAP_USD - 1,
        },
      ]),
    ).toBe(true);
    expect(pageReachedMarketCapFloor(fullPage.slice(0, 249))).toBe(true);
  });
});
