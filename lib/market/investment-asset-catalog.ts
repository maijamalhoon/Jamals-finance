import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import type { SupportedCurrency } from "@/lib/currency";

export type InvestmentAssetType = "crypto" | "stock" | "forex";
export type InvestmentPriceMode = "realtime" | "delayed" | "reference";

export type InvestmentMarketAsset = {
  id: string;
  name: string;
  symbol: string;
  aliases: readonly string[];
  rank: number;
  logoUrl: string;
  assetType: InvestmentAssetType;
  quoteCurrency: SupportedCurrency;
  priceMode: InvestmentPriceMode;
  providerSymbol: string | null;
  binanceSymbol: string | null;
};

type StockSeed = readonly [
  id: string,
  name: string,
  symbol: string,
  providerSymbol: string,
  logoSlug?: string,
  quoteCurrency?: SupportedCurrency,
  aliases?: readonly string[],
];

type CurrencyMeta = {
  name: string;
  flag: string;
  aliases: readonly string[];
};

const STOCK_ICON_BASE = "https://cdn.simpleicons.org";
const FLAG_BASE = "https://flagcdn.com/w80";

const STOCK_SEEDS: readonly StockSeed[] = [
  ["apple", "Apple", "AAPL", "AAPL", "apple"],
  ["microsoft", "Microsoft", "MSFT", "MSFT", "microsoft"],
  ["nvidia", "NVIDIA", "NVDA", "NVDA", "nvidia"],
  ["alphabet", "Alphabet", "GOOGL", "GOOGL", "google", "USD", ["Google"]],
  ["amazon", "Amazon", "AMZN", "AMZN", "amazon"],
  ["meta-platforms", "Meta Platforms", "META", "META", "meta", "USD", ["Facebook"]],
  ["tesla", "Tesla", "TSLA", "TSLA", "tesla"],
  ["berkshire-hathaway", "Berkshire Hathaway", "BRK.B", "BRK-B", "", "USD", ["Berkshire"]],
  ["broadcom", "Broadcom", "AVGO", "AVGO", "broadcom"],
  ["jpmorgan", "JPMorgan Chase", "JPM", "JPM", "jpmorgan"],
  ["visa", "Visa", "V", "V", "visa"],
  ["mastercard", "Mastercard", "MA", "MA", "mastercard"],
  ["walmart", "Walmart", "WMT", "WMT", "walmart"],
  ["eli-lilly", "Eli Lilly", "LLY", "LLY", "", "USD", ["Lilly"]],
  ["oracle", "Oracle", "ORCL", "ORCL", "oracle"],
  ["exxon-mobil", "Exxon Mobil", "XOM", "XOM", "exxonmobil"],
  ["costco", "Costco", "COST", "COST", "costco"],
  ["netflix", "Netflix", "NFLX", "NFLX", "netflix"],
  ["amd", "Advanced Micro Devices", "AMD", "AMD", "amd"],
  ["salesforce", "Salesforce", "CRM", "CRM", "salesforce"],
  ["adobe", "Adobe", "ADBE", "ADBE", "adobe"],
  ["intel", "Intel", "INTC", "INTC", "intel"],
  ["coca-cola", "Coca-Cola", "KO", "KO", "cocacola"],
  ["pepsico", "PepsiCo", "PEP", "PEP", "pepsi"],
  ["mcdonalds", "McDonald's", "MCD", "MCD", "mcdonalds"],
  ["nike", "Nike", "NKE", "NKE", "nike"],
  ["disney", "Walt Disney", "DIS", "DIS", "disney"],
  ["uber", "Uber", "UBER", "UBER", "uber"],
  ["airbnb", "Airbnb", "ABNB", "ABNB", "airbnb"],
  ["paypal", "PayPal", "PYPL", "PYPL", "paypal"],
  ["coinbase", "Coinbase", "COIN", "COIN", "coinbase"],
  ["palantir", "Palantir", "PLTR", "PLTR", "palantir"],
  ["shopify", "Shopify", "SHOP", "SHOP", "shopify"],
  ["tsmc", "Taiwan Semiconductor", "TSM", "TSM", "tsmc", "USD", ["TSMC"]],
  ["alibaba", "Alibaba", "BABA", "BABA", "alibabadotcom"],
  ["asml", "ASML", "ASML", "ASML", "asml"],
  ["novo-nordisk", "Novo Nordisk", "NVO", "NVO", "novonordisk"],
  ["sap", "SAP", "SAP", "SAP", "sap"],
  ["toyota", "Toyota Motor", "TM", "TM", "toyota"],
  ["sony", "Sony", "SONY", "SONY", "sony"],
  ["hsbc", "HSBC", "HSBC", "HSBC", "hsbc"],
  ["shell", "Shell", "SHEL", "SHEL", "shell"],
  ["bp", "BP", "BP", "BP", "bp"],
  ["qualcomm", "Qualcomm", "QCOM", "QCOM", "qualcomm"],
  ["cisco", "Cisco", "CSCO", "CSCO", "cisco"],
  ["ibm", "IBM", "IBM", "IBM", "ibm"],
  ["hbl", "Habib Bank", "HBL", "HBL.KA", "", "PKR", ["Habib Bank Limited"]],
  ["ubl", "United Bank", "UBL", "UBL.KA", "", "PKR", ["United Bank Limited"]],
  ["mcb", "MCB Bank", "MCB", "MCB.KA", "", "PKR", ["Muslim Commercial Bank"]],
  ["meezan-bank", "Meezan Bank", "MEBL", "MEBL.KA", "", "PKR"],
  ["ogdc", "Oil & Gas Development", "OGDC", "OGDC.KA", "", "PKR"],
  ["ppl", "Pakistan Petroleum", "PPL", "PPL.KA", "", "PKR"],
  ["pso", "Pakistan State Oil", "PSO", "PSO.KA", "", "PKR"],
  ["ffc", "Fauji Fertilizer", "FFC", "FFC.KA", "", "PKR"],
  ["engro", "Engro Corporation", "ENGRO", "ENGRO.KA", "", "PKR"],
  ["lucky-cement", "Lucky Cement", "LUCK", "LUCK.KA", "", "PKR"],
  ["mari-petroleum", "Mari Energies", "MARI", "MARI.KA", "", "PKR", ["Mari Petroleum"]],
  ["hub-power", "The Hub Power Company", "HUBC", "HUBC.KA", "", "PKR", ["Hubco"]],
  ["systems-limited", "Systems Limited", "SYS", "SYS.KA", "", "PKR"],
];

const CURRENCY_META: Record<SupportedCurrency, CurrencyMeta> = {
  PKR: { name: "Pakistani Rupee", flag: "pk", aliases: ["Rupee", "Pakistan Rupee"] },
  USD: { name: "US Dollar", flag: "us", aliases: ["Dollar", "United States Dollar"] },
  INR: { name: "Indian Rupee", flag: "in", aliases: ["India Rupee"] },
  EUR: { name: "Euro", flag: "eu", aliases: ["European Euro"] },
  GBP: { name: "British Pound", flag: "gb", aliases: ["Pound Sterling", "Sterling"] },
  JPY: { name: "Japanese Yen", flag: "jp", aliases: ["Yen"] },
  CNY: { name: "Chinese Yuan", flag: "cn", aliases: ["Yuan", "Renminbi", "RMB"] },
};

const FOREX_CURRENCIES = Object.keys(CURRENCY_META) as SupportedCurrency[];

function toCryptoMarketAsset(asset: CryptoCatalogAsset): InvestmentMarketAsset {
  return {
    id: `crypto-${asset.id}`,
    name: asset.name,
    symbol: asset.symbol,
    aliases: asset.aliases,
    rank: asset.rank,
    logoUrl: asset.logoUrl,
    assetType: "crypto",
    quoteCurrency: "USD",
    priceMode: "realtime",
    providerSymbol: asset.binanceSymbol,
    binanceSymbol: asset.binanceSymbol,
  };
}

const STOCK_CATALOG: readonly InvestmentMarketAsset[] = STOCK_SEEDS.map(
  ([id, name, symbol, providerSymbol, logoSlug = "", quoteCurrency = "USD", aliases = []], index) => ({
    id: `stock-${id}`,
    name,
    symbol,
    aliases,
    rank: 10_000 + index,
    logoUrl: logoSlug ? `${STOCK_ICON_BASE}/${logoSlug}` : "",
    assetType: "stock" as const,
    quoteCurrency,
    priceMode: "delayed" as const,
    providerSymbol,
    binanceSymbol: null,
  }),
);

const FOREX_CATALOG: readonly InvestmentMarketAsset[] = FOREX_CURRENCIES.flatMap(
  (base, baseIndex) =>
    FOREX_CURRENCIES.filter((quote) => quote !== base).map((quote, quoteIndex) => {
      const baseMeta = CURRENCY_META[base];
      const quoteMeta = CURRENCY_META[quote];
      return {
        id: `forex-${base.toLowerCase()}-${quote.toLowerCase()}`,
        name: `${baseMeta.name} / ${quoteMeta.name}`,
        symbol: `${base}/${quote}`,
        aliases: [
          `${base} ${quote}`,
          `${baseMeta.name} ${quoteMeta.name}`,
          ...baseMeta.aliases.map((alias) => `${alias} ${quote}`),
        ],
        rank: 20_000 + baseIndex * FOREX_CURRENCIES.length + quoteIndex,
        logoUrl: `${FLAG_BASE}/${baseMeta.flag}.png`,
        assetType: "forex" as const,
        quoteCurrency: quote,
        priceMode: "reference" as const,
        providerSymbol: `${base}-${quote}`,
        binanceSymbol: null,
      };
    }),
);

function normalizeSearchValue(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + substitutionCost,
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function getMatchScore(asset: InvestmentMarketAsset, normalizedQuery: string) {
  const symbol = normalizeSearchValue(asset.symbol);
  const name = normalizeSearchValue(asset.name);
  const aliases = asset.aliases.map(normalizeSearchValue);
  if (symbol === normalizedQuery) return 0;
  if (name === normalizedQuery) return 1;
  if (aliases.includes(normalizedQuery)) return 2;
  if (symbol.startsWith(normalizedQuery)) return 10;
  if (name.startsWith(normalizedQuery)) return 20;
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 25;
  if (symbol.includes(normalizedQuery)) return 30;
  if (name.includes(normalizedQuery)) return 40;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) return 45;
  if (normalizedQuery.length >= 4) {
    const candidates = [symbol, name, ...aliases];
    const nearestDistance = Math.min(...candidates.map((candidate) => editDistance(candidate, normalizedQuery)));
    const allowedDistance = normalizedQuery.length >= 7 ? 2 : 1;
    if (nearestDistance <= allowedDistance) return 60 + nearestDistance;
  }
  return Number.POSITIVE_INFINITY;
}

export function getInvestmentAssetCatalog() {
  return [...CRYPTO_CATALOG.map(toCryptoMarketAsset), ...STOCK_CATALOG, ...FOREX_CATALOG];
}

export function searchInvestmentAssetCatalog(query: string, limit = 8) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery || limit <= 0) return [];
  return getInvestmentAssetCatalog()
    .map((asset) => ({ asset, score: getMatchScore(asset, normalizedQuery) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return left.asset.rank - right.asset.rank;
    })
    .slice(0, limit)
    .map(({ asset }) => asset);
}

export function getInvestmentMarketAsset(
  assetId: string | null | undefined,
  symbol: string | null | undefined,
  type: string | null | undefined,
) {
  const normalizedId = (assetId ?? "").trim().toLowerCase();
  const normalizedSymbol = (symbol ?? "").trim().toUpperCase();
  const normalizedType = (type ?? "").trim().toLowerCase();
  const catalog = getInvestmentAssetCatalog();
  if (normalizedId) {
    const direct = catalog.find((asset) => asset.id.toLowerCase() === normalizedId);
    if (direct) return direct;
    const legacyCrypto = catalog.find(
      (asset) => asset.assetType === "crypto" && asset.id.toLowerCase() === `crypto-${normalizedId}`,
    );
    if (legacyCrypto) return legacyCrypto;
  }
  if (!normalizedSymbol) return null;
  const exactType = catalog.find(
    (asset) => asset.symbol.toUpperCase() === normalizedSymbol && asset.assetType === normalizedType,
  );
  if (exactType) return exactType;
  return catalog.find((asset) => asset.symbol.toUpperCase() === normalizedSymbol) ?? null;
}
