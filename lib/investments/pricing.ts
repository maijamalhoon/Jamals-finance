import type { InvestmentLike } from "@/lib/investments/aggregation";
import {
  getCryptoPrices,
  searchCryptoAssets,
} from "@/lib/market/crypto";
import type {
  CryptoPrice,
  CryptoSearchResult,
} from "@/lib/market/crypto";
import {
  getInternationalStockPrices,
  searchInternationalStocks,
} from "@/lib/market/stocks";
import type {
  StockPrice,
  StockSearchResult,
} from "@/lib/market/stocks";

const MAX_LEGACY_LOGO_LOOKUPS = 12;

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeMatchText(value: string | null | undefined) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getStockLogoUrl(symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!/^[A-Z0-9.:-]{1,24}$/.test(normalizedSymbol)) return null;

  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(
    normalizedSymbol,
  )}.png`;
}

function getMatchScore(
  investment: InvestmentLike,
  candidateName: string,
  candidateSymbol: string,
) {
  const investmentName = normalizeMatchText(investment.name);
  const investmentSymbol = normalizeMatchText(investment.symbol);
  const normalizedCandidateName = normalizeMatchText(candidateName);
  const normalizedCandidateSymbol = normalizeMatchText(candidateSymbol);

  if (
    investmentSymbol &&
    normalizedCandidateSymbol &&
    investmentSymbol === normalizedCandidateSymbol
  ) {
    return 100;
  }

  if (
    investmentName &&
    normalizedCandidateName &&
    investmentName === normalizedCandidateName
  ) {
    return 90;
  }

  if (
    investmentName.length >= 3 &&
    normalizedCandidateName.length >= 3 &&
    (normalizedCandidateName.startsWith(investmentName) ||
      investmentName.startsWith(normalizedCandidateName))
  ) {
    return 70;
  }

  return 0;
}

function pickBestCryptoMatch(
  investment: InvestmentLike,
  results: CryptoSearchResult[],
) {
  return results
    .map((result) => ({
      result,
      score: getMatchScore(investment, result.name, result.symbol),
    }))
    .filter((entry) => entry.score >= 70)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;

      const leftRank = left.result.marketCapRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.result.marketCapRank ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank;
    })[0]?.result;
}

function pickBestStockMatch(
  investment: InvestmentLike,
  results: StockSearchResult[],
) {
  return results
    .map((result) => ({
      result,
      score: getMatchScore(investment, result.name, result.symbol),
    }))
    .filter((entry) => entry.score >= 70)
    .sort((left, right) => right.score - left.score)[0]?.result;
}

function isCryptoInvestment(investment: InvestmentLike) {
  return normalizeText(investment.type).toLowerCase() === "crypto";
}

function isStockInvestment(investment: InvestmentLike) {
  const type = normalizeText(investment.type).toLowerCase();
  return type === "stock" || type === "stocks";
}

function needsLegacyLogoLookup(investment: InvestmentLike) {
  if (normalizeText(investment.image_url)) return false;

  if (isCryptoInvestment(investment)) {
    return !(
      investment.price_source === "coingecko" &&
      normalizeText(investment.asset_id)
    );
  }

  if (isStockInvestment(investment)) {
    return !normalizeText(investment.asset_id ?? investment.symbol);
  }

  return false;
}

async function resolveLegacyLogo(investment: InvestmentLike) {
  const query = normalizeText(investment.symbol) || normalizeText(investment.name);
  if (query.length < 2) return null;

  if (isCryptoInvestment(investment)) {
    const match = pickBestCryptoMatch(
      investment,
      await searchCryptoAssets(query),
    );
    return match?.large ?? match?.thumb ?? null;
  }

  if (isStockInvestment(investment)) {
    const match = pickBestStockMatch(
      investment,
      await searchInternationalStocks(query),
    );
    return match ? getStockLogoUrl(match.symbol) : null;
  }

  return null;
}

async function resolveLegacyLogos(investments: InvestmentLike[]) {
  const candidates = investments
    .filter(needsLegacyLogoLookup)
    .slice(0, MAX_LEGACY_LOGO_LOOKUPS);
  const settled = await Promise.allSettled(
    candidates.map(async (investment) => ({
      id: investment.id,
      imageUrl: await resolveLegacyLogo(investment),
    })),
  );

  return settled.reduce<Map<string, string>>((logos, entry) => {
    if (entry.status === "fulfilled" && entry.value.imageUrl) {
      logos.set(entry.value.id, entry.value.imageUrl);
    }
    return logos;
  }, new Map());
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

  const [cryptoSettled, stockSettled, legacyLogosSettled] =
    await Promise.allSettled([
      cryptoIds.length > 0
        ? getCryptoPrices(cryptoIds)
        : Promise.resolve({ prices: {}, live: false }),
      stockSymbols.length > 0
        ? getInternationalStockPrices(stockSymbols)
        : Promise.resolve({ prices: {} }),
      resolveLegacyLogos(investments),
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
  const legacyLogos =
    legacyLogosSettled.status === "fulfilled"
      ? legacyLogosSettled.value
      : new Map<string, string>();

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
        : isStockInvestment(investment) && stockSymbol
          ? getStockLogoUrl(stockSymbol)
          : null) ??
      legacyLogos.get(investment.id) ??
      null;

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
