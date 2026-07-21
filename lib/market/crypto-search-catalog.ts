import type { CryptoCatalogAsset } from "@/lib/market/crypto-catalog";

const VALID_PAIR = /^[A-Z0-9]{5,24}$/;

export function normalizeAvailableCryptoPairs(value: unknown) {
  if (!value || typeof value !== "object") return new Set<string>();

  const prices = (value as { prices?: unknown }).prices;
  if (!prices || typeof prices !== "object") return new Set<string>();

  return new Set(
    Object.keys(prices as Record<string, unknown>)
      .map((pair) => pair.trim().toUpperCase())
      .filter((pair) => VALID_PAIR.test(pair)),
  );
}

export function filterSearchableCryptoAssets(
  assets: readonly CryptoCatalogAsset[],
  availablePairs: ReadonlySet<string>,
) {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    const id = asset.id.trim().toLowerCase();
    if (!id || seen.has(id)) return false;

    const symbol = asset.symbol.trim().toUpperCase();
    const pair = asset.binanceSymbol?.trim().toUpperCase() ?? null;
    const supported = symbol === "USDT" || Boolean(pair && availablePairs.has(pair));

    if (!supported) return false;
    seen.add(id);
    return true;
  });
}
