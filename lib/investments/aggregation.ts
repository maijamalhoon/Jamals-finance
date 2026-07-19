import { CHART_COLOR_PALETTE } from "@/lib/theme-colors";

export type InvestmentLike = {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
  purchase_price_original?: number | string | null;
  purchase_currency?: string | null;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  purchased_at?: string | null;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
};

export type AggregatedInvestment = {
  id: string;
  groupKey: string;
  name: string;
  type: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  current_price_original: number | null;
  current_price_currency: string | null;
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPct: number;
  asset_id: string | null;
  symbol: string | null;
  image_url: string | null;
  price_source: string | null;
  price_updated_at: string | null;
  price_change_24h: number | null;
  is_live_priced: boolean;
  itemCount: number;
  color: string;
};

const ASSET_COLORS = CHART_COLOR_PALETTE;

const ASSET_BRAND_COLORS: Record<string, string> = {
  bitcoin: "#f7931a",
  btc: "#f7931a",
  ethereum: "#627eea",
  eth: "#627eea",
  solana: "#7c3aed",
  sol: "#7c3aed",
  render: "#e60012",
  rendertoken: "#e60012",
  rndr: "#e60012",
  tether: "#26a17b",
  usdt: "#26a17b",
  usdcoin: "#2775ca",
  usdc: "#2775ca",
  binancecoin: "#f3ba2f",
  bnb: "#f3ba2f",
  ripple: "#23292f",
  xrp: "#23292f",
  cardano: "#3468d4",
  ada: "#3468d4",
  dogecoin: "#c2a633",
  doge: "#c2a633",
  litecoin: "#345d9d",
  ltc: "#345d9d",
  polkadot: "#e6007a",
  dot: "#e6007a",
  avalanche: "#e84142",
  avax: "#e84142",
  chainlink: "#2a5ada",
  link: "#2a5ada",
  polygon: "#8247e5",
  polygonpos: "#8247e5",
  matic: "#8247e5",
  tron: "#ef0027",
  trx: "#ef0027",
  uniswap: "#ff007a",
  uni: "#ff007a",
  cosmos: "#2e3148",
  atom: "#2e3148",
  near: "#111111",
  stellar: "#7d00ff",
  xlm: "#7d00ff",
  algorand: "#111111",
  algo: "#111111",
  aptos: "#2dd8a3",
  apt: "#2dd8a3",
  arbitrum: "#28a0f0",
  arb: "#28a0f0",
  optimism: "#ff0420",
  op: "#ff0420",
  apple: "#555555",
  aapl: "#555555",
  tesla: "#e82127",
  tsla: "#e82127",
  microsoft: "#737373",
  msft: "#737373",
  alphabet: "#4285f4",
  google: "#4285f4",
  goog: "#4285f4",
  googl: "#4285f4",
  amazon: "#ff9900",
  amzn: "#ff9900",
  nvidia: "#76b900",
  nvda: "#76b900",
  meta: "#0668e1",
  netflix: "#e50914",
  nflx: "#e50914",
  adobe: "#ff0000",
  adbe: "#ff0000",
  coinbase: "#0052ff",
  coin: "#0052ff",
};

const ASSET_BRAND_ALIASES = Object.keys(ASSET_BRAND_COLORS).sort(
  (left, right) => right.length - left.length,
);

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKeyText(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function normalizeAssetColorKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeGroupIdentity(value: string | null | undefined) {
  return normalizeAssetColorKey(normalizeText(value));
}

function getCanonicalInvestmentType(investment: InvestmentLike) {
  const source = normalizeKeyText(investment.price_source);

  if (source === "coingecko") return "crypto";
  if (source === "alpha_vantage") return "stocks";

  const normalizedType = normalizeKeyText(investment.type)
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  if (["crypto", "cryptocurrency", "coin"].includes(normalizedType)) {
    return "crypto";
  }

  if (
    ["stock", "stocks", "equity", "equities", "share", "shares"].includes(
      normalizedType,
    )
  ) {
    return "stocks";
  }

  if (["realestate", "real_estate"].includes(normalizedType)) {
    return "real_estate";
  }

  return normalizedType || "other";
}

function getBrandAssetColor(groupKey: string) {
  const normalizedGroupKey = normalizeAssetColorKey(groupKey);
  const alias = ASSET_BRAND_ALIASES.find((candidate) =>
    normalizedGroupKey.endsWith(candidate),
  );

  return alias ? ASSET_BRAND_COLORS[alias] : null;
}

export function getInvestmentGroupKey(investment: InvestmentLike) {
  const type = getCanonicalInvestmentType(investment);
  const name = normalizeGroupIdentity(investment.name);
  const symbol = normalizeGroupIdentity(investment.symbol);
  const assetId = normalizeGroupIdentity(investment.asset_id);

  // The selected market asset name is stable across new and legacy purchases.
  // Using it first bridges older rows that may be missing symbol/provider metadata,
  // so repeated buys of the same asset stay in one holding and one chart segment.
  if (name) return `${type}:${name}`;
  if (symbol) return `${type}:${symbol}`;
  if (assetId) return `${type}:${assetId}`;

  return `${type}:${investment.id}`;
}

export function getStableAssetColor(groupKey: string) {
  const brandColor = getBrandAssetColor(groupKey);
  if (brandColor) return brandColor;

  let hash = 0;

  for (let index = 0; index < groupKey.length; index += 1) {
    hash = (hash * 31 + groupKey.charCodeAt(index)) >>> 0;
  }

  return ASSET_COLORS[hash % ASSET_COLORS.length];
}

export function getAssetInitials(name: string, symbol?: string | null) {
  const cleanSymbol = normalizeText(symbol).toUpperCase();

  if (cleanSymbol) return cleanSymbol.slice(0, 2);

  const words = normalizeText(name).split(" ").filter(Boolean);

  if (words.length === 0) return "IN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function aggregateInvestmentHoldings(investments: InvestmentLike[]) {
  const groups = new Map<
    string,
    {
      firstId: string;
      name: string;
      type: string;
      quantity: number;
      totalInvested: number;
      weightedCurrentValue: number;
      latestCurrentPrice: number | null;
      liveCurrentPrice: number | null;
      liveCurrentOriginal: number | null;
      currentPriceCurrency: string | null;
      assetId: string | null;
      symbol: string | null;
      imageUrl: string | null;
      priceSource: string | null;
      priceUpdatedAt: string | null;
      priceChange24h: number | null;
      isLivePriced: boolean;
      itemCount: number;
    }
  >();

  investments.forEach((investment) => {
    const groupKey = getInvestmentGroupKey(investment);
    const quantity = toFiniteNumber(investment.quantity);
    const purchasePrice = toFiniteNumber(investment.purchase_price);
    const currentPrice = toFiniteNumber(investment.current_price);
    const currentOriginal = Number(investment.current_price_original);
    const existing = groups.get(groupKey);
    const current =
      existing ??
      {
        firstId: investment.id,
        name: normalizeText(investment.name) || "Investment",
        type: getCanonicalInvestmentType(investment),
        quantity: 0,
        totalInvested: 0,
        weightedCurrentValue: 0,
        latestCurrentPrice: null,
        liveCurrentPrice: null,
        liveCurrentOriginal: null,
        currentPriceCurrency: investment.current_price_currency ?? null,
        assetId: normalizeText(investment.asset_id) || null,
        symbol: normalizeText(investment.symbol).toUpperCase() || null,
        imageUrl: normalizeText(investment.image_url) || null,
        priceSource: normalizeText(investment.price_source) || null,
        priceUpdatedAt: investment.price_updated_at ?? null,
        priceChange24h: investment.price_change_24h ?? null,
        isLivePriced: false,
        itemCount: 0,
      };

    current.quantity += quantity;
    current.totalInvested += quantity * purchasePrice;
    current.weightedCurrentValue += quantity * currentPrice;
    current.itemCount += 1;

    if (current.latestCurrentPrice === null && currentPrice > 0) {
      current.latestCurrentPrice = currentPrice;
    }

    if (!current.imageUrl && investment.image_url) {
      current.imageUrl = normalizeText(investment.image_url);
    }

    if (!current.symbol && investment.symbol) {
      current.symbol = normalizeText(investment.symbol).toUpperCase();
    }

    if (!current.assetId && investment.asset_id) {
      current.assetId = normalizeText(investment.asset_id);
    }

    if (!current.priceSource && investment.price_source) {
      current.priceSource = normalizeText(investment.price_source);
    }

    if (investment.is_live_priced && currentPrice > 0) {
      current.isLivePriced = true;

      if (current.liveCurrentPrice === null) {
        current.liveCurrentPrice = currentPrice;
        current.liveCurrentOriginal = Number.isFinite(currentOriginal)
          ? currentOriginal
          : null;
        current.currentPriceCurrency = investment.current_price_currency ?? null;
        current.priceUpdatedAt = investment.price_updated_at ?? null;
        current.priceChange24h = investment.price_change_24h ?? null;
      }
    }

    groups.set(groupKey, current);
  });

  return Array.from(groups.entries())
    .map(([groupKey, group]) => {
      const averageBuyPrice =
        group.quantity > 0 ? group.totalInvested / group.quantity : 0;
      const currentPrice =
        group.liveCurrentPrice ??
        (group.quantity > 0
          ? group.weightedCurrentValue / group.quantity
          : group.latestCurrentPrice ?? 0);
      const currentValue = group.quantity * currentPrice;
      const totalPnL = currentValue - group.totalInvested;

      return {
        id: group.firstId,
        groupKey,
        name: group.name,
        type: group.type,
        quantity: group.quantity,
        purchase_price: averageBuyPrice,
        current_price: currentPrice,
        current_price_original: group.liveCurrentOriginal,
        current_price_currency: group.currentPriceCurrency,
        totalInvested: group.totalInvested,
        currentValue,
        totalPnL,
        totalPnLPct:
          group.totalInvested > 0 ? (totalPnL / group.totalInvested) * 100 : 0,
        asset_id: group.assetId,
        symbol: group.symbol,
        image_url: group.imageUrl,
        price_source: group.priceSource,
        price_updated_at: group.priceUpdatedAt,
        price_change_24h: group.priceChange24h,
        is_live_priced: group.isLivePriced,
        itemCount: group.itemCount,
        color: getStableAssetColor(groupKey),
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue);
}

export function getAggregatedPortfolioTotals(
  holdings: Pick<AggregatedInvestment, "totalInvested" | "currentValue">[],
) {
  const totalInvested = holdings.reduce(
    (sum, holding) => sum + holding.totalInvested,
    0,
  );
  const totalValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  const totalPnL = totalValue - totalInvested;

  return {
    totalInvested,
    totalValue,
    totalPnL,
    totalPnLPct: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
  };
}
