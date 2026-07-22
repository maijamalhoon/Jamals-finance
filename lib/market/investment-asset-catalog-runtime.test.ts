import { describe, expect, it } from "vitest";

import type { InvestmentMarketAsset } from "./investment-asset-catalog";
import { rankInvestmentAssetCandidates } from "./investment-asset-catalog-runtime";

function asset(
  name: string,
  symbol: string,
  rank: number,
  assetType: InvestmentMarketAsset["assetType"] = "crypto",
): InvestmentMarketAsset {
  return {
    id: `${assetType}-${symbol.toLowerCase()}`,
    name,
    symbol,
    aliases: [],
    rank,
    logoUrl: "",
    assetType,
    quoteCurrency: "USD",
    priceMode: assetType === "forex" ? "reference" : "realtime",
    providerSymbol: `${symbol}USDT`,
    binanceSymbol: assetType === "crypto" ? `${symbol}USDT` : null,
  };
}

describe("investment asset runtime ranking", () => {
  it("keeps an exact symbol ahead of provider-prefixed names", () => {
    const ranked = rankInvestmentAssetCandidates(
      "eth",
      [
        asset("Ethena", "ENA", 1),
        asset("Tether", "USDT", 2),
        asset("Ethereum Classic", "ETC", 3),
        asset("Ethereum", "ETH", 999),
      ],
      8,
    );

    expect(ranked.map((item) => item.symbol)).toEqual([
      "ETH",
      "ENA",
      "ETC",
      "USDT",
    ]);
  });

  it("keeps exact Pepe ahead of fuzzy stock and token matches", () => {
    const ranked = rankInvestmentAssetCandidates(
      "pepe",
      [
        asset("PepsiCo", "PEP", 1, "stock"),
        asset("Ape and Pepe", "APEPE", 2),
        asset("Pepe", "PEPE", 99),
      ],
      8,
    );

    expect(ranked.map((item) => item.name)).toEqual([
      "Pepe",
      "Ape and Pepe",
      "PepsiCo",
    ]);
  });
});
