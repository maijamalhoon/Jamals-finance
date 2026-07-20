import { describe, expect, it } from "vitest";

import { searchCryptoCatalog } from "@/lib/market/crypto-catalog";

describe("searchCryptoCatalog", () => {
  it("returns useful results from the first character", () => {
    const results = searchCryptoCatalog("b");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.symbol).toBe("BTC");
  });

  it("ranks an exact symbol match first", () => {
    const results = searchCryptoCatalog("btc");

    expect(results[0]?.id).toBe("bitcoin");
  });

  it("ranks an exact full-name match first", () => {
    const results = searchCryptoCatalog("bitcoin cash");

    expect(results[0]?.symbol).toBe("BCH");
  });

  it("supports common aliases", () => {
    const results = searchCryptoCatalog("xbt");

    expect(results[0]?.symbol).toBe("BTC");
  });

  it("handles a small spelling mistake", () => {
    const results = searchCryptoCatalog("bitcon");

    expect(results[0]?.symbol).toBe("BTC");
  });

  it("respects the result limit", () => {
    expect(searchCryptoCatalog("a", 4)).toHaveLength(4);
  });
});
