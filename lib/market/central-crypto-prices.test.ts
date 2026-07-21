import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CENTRAL_CRYPTO_PAIRS,
  chunkCryptoPairs,
  parseBinanceTickerPayload,
} from "./central-crypto-prices";

const routeSource = readFileSync(
  new URL("../../app/api/market/crypto-prices/route.ts", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL(
    "../../components/investments/useBinanceLivePrices.ts",
    import.meta.url,
  ),
  "utf8",
);
const proxySource = readFileSync(
  new URL("../supabase/proxy.ts", import.meta.url),
  "utf8",
);

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

  it("keeps the public endpoint behind the central CDN cache", () => {
    expect(proxySource).toContain('"/api/market/crypto-prices"');
    expect(routeSource).toContain('"CDN-Cache-Control"');
    expect(routeSource).toContain('"Vercel-CDN-Cache-Control"');
    expect(routeSource).toContain("s-maxage=1");
    expect(routeSource).toContain("stale-while-revalidate=5");
  });

  it("keeps one canonical cache key and rejects query-string cache busting", () => {
    expect(routeSource).toContain("url.search.length > 0");
    expect(routeSource).toContain("Query parameters are not supported.");
    expect(routeSource).toContain('"Cache-Control": "private, no-store, max-age=0"');
  });

  it("backs off upstream failures and keeps a bounded stale snapshot", () => {
    expect(routeSource).toContain("upstreamBlockedUntil");
    expect(routeSource).toContain("MAX_WARM_STALE_MS");
    expect(routeSource).toContain('response.status === 418');
    expect(routeSource).toContain('response.status === 429');
  });

  it("keeps browsers on one shared poller instead of direct Binance sockets", () => {
    expect(clientSource).toContain(
      'const CENTRAL_PRICE_ENDPOINT = "/api/market/crypto-prices"',
    );
    expect(clientSource).toContain("let centralStore");
    expect(clientSource).toContain("let subscribers");
    expect(clientSource).not.toContain("wss://stream.binance.com");
  });
});
