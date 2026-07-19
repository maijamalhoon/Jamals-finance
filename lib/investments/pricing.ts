import type { InvestmentLike } from "@/lib/investments/aggregation";
import { getCryptoPrices } from "@/lib/market/crypto";
import type { CryptoPrice } from "@/lib/market/crypto";
import { getInternationalStockPrices } from "@/lib/market/stocks";
import type { StockPrice } from "@/lib/market/stocks";

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function getStockLogoUrl(symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!/^[A-Z0-9.:-]{1,24}$/.test(normalizedSymbol)) return null;

  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(
    normalizedSymbol,
  )}.png`;
}

export async function refreshInvestmentMarketPrices<T extends InvestmentLike>(
  investments: T[],
) {
  const cryptoIds = Array.from(
    new Set(
      investments
        .filter(
          (investment) =>
            investment.price_source === "coingecko" && investment.asset_id,
        )
        .map((investment) => normalizeText(investment.asset_id).toLowerCase())
        .filter(Boolean),
    ),
  );
  const stockSymbols = Array.from(
    new Set(
      investments
        .filter(
          (investment) =>
            investment.price_source === "alpha_vantage" &&
            (investment.asset_id || investment.symbol),
        )
        .map((investment) =>
          normalizeText(investment.asset_id ?? investment.symbol).toUpperCase(),
        )
        .filter(Boolean),
    ),
  );

  const [cryptoSettled, stockSettled] = await Promise.allSettled([
    cryptoIds.length > 0
      ? getCryptoPrices(cryptoIds)
      : Promise.resolve({ prices: {}, live: false }),
    stockSymbols.length > 0
      ? getInternationalStockPrices(stockSymbols)
      : Promise.resolve({ prices: {} }),
  ]);

  if (cryptoSettled.status === "rejected") {
    console.error("Failed to refresh crypto prices", cryptoSettled.reason);
  }

  if (stockSettled.status === "rejected") {
    console.error("Failed to refresh stock prices", stockSettled.reason);
  }

  const cryptoPrices: Record<string, CryptoPrice> =
    cryptoSettled.status === "fulfilled" ? cryptoSettled.value.prices : {};
  const stockPrices: Record<string, StockPrice> =
    stockSettled.status === "fulfilled" ? stockSettled.value.prices : {};

  return investments.map((investment) => {
    const cryptoPrice = investment.asset_id
      ? cryptoPrices[normalizeText(investment.asset_id).toLowerCase()]
      : null;
    const stockSymbol = normalizeText(
      investment.asset_id ?? investment.symbol,
    ).toUpperCase();
    const stockPrice = stockSymbol ? stockPrices[stockSymbol] : null;
    const existingImageUrl = normalizeText(investment.image_url) || null;
    const resolvedImageUrl =
      existingImageUrl ??
      (investment.price_source === "coingecko"
        ? cryptoPrice?.imageUrl ?? null
        : investment.price_source === "alpha_vantage"
          ? getStockLogoUrl(stockSymbol)
          : null);

    if (
      investment.is_live_priced &&
      investment.price_source === "coingecko" &&
      typeof cryptoPrice?.pkr === "number"
    ) {
      return {
        ...investment,
        image_url: resolvedImageUrl,
        current_price: cryptoPrice.pkr,
        current_price_original: cryptoPrice.usd,
        current_price_currency: "USD",
        price_change_24h: cryptoPrice.change24h,
        price_updated_at: cryptoPrice.lastUpdatedAt,
        price_currency: "PKR",
      };
    }

    if (
      investment.price_source === "alpha_vantage" &&
      typeof stockPrice?.pkr === "number"
    ) {
      return {
        ...investment,
        image_url: resolvedImageUrl,
        current_price: stockPrice.pkr,
        current_price_original: stockPrice.usd,
        current_price_currency: "USD",
        price_change_24h: stockPrice.changePercent,
        price_updated_at: stockPrice.lastUpdatedAt ?? new Date().toISOString(),
        price_currency: "PKR",
        is_live_priced: true,
      };
    }

    if (!existingImageUrl && resolvedImageUrl) {
      return {
        ...investment,
        image_url: resolvedImageUrl,
      };
    }

    return investment;
  });
}
