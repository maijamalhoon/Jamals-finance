import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";

export const MINIMUM_CRYPTO_MARKET_CAP_USD = 10_000_000;

export type CoinGeckoMarketCatalogRow = {
  id?: unknown;
  name?: unknown;
  symbol?: unknown;
  image?: unknown;
  market_cap?: unknown;
  market_cap_rank?: unknown;
};

const TRUSTED_LOGO_HOSTS = new Set([
  "coin-images.coingecko.com",
  "assets.coingecko.com",
]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLogoUrl(value: unknown) {
  const source = cleanString(value);
  if (!source) return "";

  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || !TRUSTED_LOGO_HOSTS.has(url.hostname)) {
      return "";
    }

    // CoinGecko's current image CDN is already permitted by the app CSP. Older
    // assets.coingecko.com links use the same path and are normalized so logos
    // do not disappear when the provider returns a legacy hostname.
    if (url.hostname === "assets.coingecko.com") {
      url.hostname = "coin-images.coingecko.com";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function knownCatalogById() {
  return new Map(CRYPTO_CATALOG.map((asset) => [asset.id.toLowerCase(), asset]));
}

export function buildCryptoMarketCatalog(
  rows: readonly CoinGeckoMarketCatalogRow[],
  minimumMarketCapUsd = MINIMUM_CRYPTO_MARKET_CAP_USD,
): CryptoCatalogAsset[] {
  const knownById = knownCatalogById();
  const seenIds = new Set<string>();
  const assets: CryptoCatalogAsset[] = [];

  for (const row of rows) {
    const id = cleanString(row.id).toLowerCase();
    const name = cleanString(row.name);
    const symbol = cleanString(row.symbol).toUpperCase();
    const marketCapUsd = finiteNumber(row.market_cap);

    if (
      !id ||
      !name ||
      !/^[A-Z0-9._-]{1,24}$/.test(symbol) ||
      marketCapUsd === null ||
      marketCapUsd < minimumMarketCapUsd ||
      seenIds.has(id)
    ) {
      continue;
    }

    const rankValue = finiteNumber(row.market_cap_rank);
    const known = knownById.get(id);
    const logoUrl = normalizeLogoUrl(row.image) || known?.logoUrl || "";

    seenIds.add(id);
    assets.push({
      id,
      name,
      symbol,
      aliases: known?.aliases ?? [],
      rank:
        rankValue !== null && rankValue > 0
          ? Math.trunc(rankValue)
          : Number.MAX_SAFE_INTEGER,
      logoUrl,
      // Only reuse pairs already curated in the existing catalog. Guessing a
      // Binance pair from a duplicate ticker can attach the wrong market.
      binanceSymbol: known?.binanceSymbol ?? null,
    });
  }

  return assets.sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank;
    return left.name.localeCompare(right.name);
  });
}

export function pageReachedMarketCapFloor(
  rows: readonly CoinGeckoMarketCatalogRow[],
  minimumMarketCapUsd = MINIMUM_CRYPTO_MARKET_CAP_USD,
  pageSize = 250,
) {
  if (rows.length < pageSize) return true;

  return rows.some((row) => {
    const marketCap = finiteNumber(row.market_cap);
    return marketCap !== null && marketCap < minimumMarketCapUsd;
  });
}
