import { NextRequest, NextResponse } from "next/server";
import { getCryptoPrices, searchCryptoAssets } from "@/lib/market/crypto";
import type { CryptoPrice } from "@/lib/market/crypto";
import {
  getInternationalStockPrices,
  searchInternationalStocks,
} from "@/lib/market/stocks";
import type { StockPrice } from "@/lib/market/stocks";

function getWarning(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  if (error.name === "MissingConfigError") {
    return "Stock search is not configured yet.";
  }

  if (error.name === "RateLimitError") {
    return "Stock data limit reached. Try again later.";
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({
      results: [],
      warnings: ["Type at least 2 characters to search assets."],
    });
  }

  const warnings: string[] = [];

  const [cryptoSettled, stockSettled] = await Promise.allSettled([
    searchCryptoAssets(query),
    searchInternationalStocks(query),
  ]);

  const cryptoResults =
    cryptoSettled.status === "fulfilled" ? cryptoSettled.value : [];
  const stockResults =
    stockSettled.status === "fulfilled" ? stockSettled.value : [];
  const stockQuoteCandidates = stockResults
    .filter((asset) => asset.currency === "USD")
    .slice(0, 3);

  if (cryptoSettled.status === "rejected") {
    warnings.push(
      getWarning(cryptoSettled.reason, "Crypto search is temporarily unavailable."),
    );
  }

  if (stockSettled.status === "rejected") {
    warnings.push(
      getWarning(stockSettled.reason, "Stock search is temporarily unavailable."),
    );
  }

  const [cryptoPricesSettled, stockPricesSettled] = await Promise.allSettled([
    cryptoResults.length > 0
      ? getCryptoPrices(cryptoResults.map((asset) => asset.id))
      : Promise.resolve({ prices: {}, live: false }),
    stockQuoteCandidates.length > 0
      ? getInternationalStockPrices(
          stockQuoteCandidates.map((asset) => asset.symbol),
        )
      : Promise.resolve({ prices: {} }),
  ]);

  const cryptoPrices: Record<string, CryptoPrice> =
    cryptoPricesSettled.status === "fulfilled"
      ? cryptoPricesSettled.value.prices
      : {};
  const stockPrices: Record<string, StockPrice> =
    stockPricesSettled.status === "fulfilled"
      ? stockPricesSettled.value.prices
      : {};

  if (cryptoPricesSettled.status === "rejected" && cryptoResults.length > 0) {
    warnings.push("Crypto prices are temporarily unavailable.");
  }

  if (
    stockPricesSettled.status === "rejected" &&
    stockQuoteCandidates.length > 0
  ) {
    warnings.push(
      getWarning(
        stockPricesSettled.reason,
        "Stock quotes are temporarily unavailable.",
      ),
    );
  }

  const results = [
    ...cryptoResults.map((asset) => {
      const price = cryptoPrices[asset.id];

      return {
        id: asset.id,
        kind: "crypto" as const,
        provider: "coingecko",
        symbol: asset.symbol,
        name: asset.name,
        subtitle: asset.marketCapRank
          ? `Rank #${asset.marketCapRank}`
          : "Crypto asset",
        logoUrl: asset.large ?? asset.thumb,
        currency: "USD",
        pricePkr: price?.pkr ?? null,
        priceUsd: price?.usd ?? null,
        change24h: price?.change24h ?? null,
        changePercent: null,
        lastUpdatedAt: price?.lastUpdatedAt ?? null,
        live: typeof price?.pkr === "number",
        sourceLabel: "Live via CoinGecko",
      };
    }),
    ...stockResults.map((asset) => {
      const price = stockPrices[asset.symbol];

      return {
        id: asset.symbol,
        kind: "stock" as const,
        provider: "alpha_vantage",
        symbol: asset.symbol,
        name: asset.name,
        subtitle: [asset.region, asset.type].filter(Boolean).join(" | "),
        logoUrl: asset.logoUrl ?? null,
        currency: asset.currency,
        pricePkr: price?.pkr ?? null,
        priceUsd: price?.usd ?? null,
        change24h: null,
        changePercent: price?.changePercent ?? null,
        lastUpdatedAt: price?.lastUpdatedAt ?? null,
        live: false,
        sourceLabel: "Latest quote via Alpha Vantage",
      };
    }),
  ];

  return NextResponse.json(
    { results, warnings },
    {
      headers: {
        "Cache-Control": "s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
