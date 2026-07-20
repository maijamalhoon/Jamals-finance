export type CryptoCatalogAsset = {
  id: string;
  name: string;
  symbol: string;
  aliases: readonly string[];
  rank: number;
  logoUrl: string;
};

type CryptoCatalogSeed = readonly [
  id: string,
  name: string,
  symbol: string,
  aliases?: readonly string[],
  logoSymbol?: string,
];

const ICON_BASE =
  "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color";

const CRYPTO_SEEDS: readonly CryptoCatalogSeed[] = [
  ["bitcoin", "Bitcoin", "BTC", ["XBT"]],
  ["ethereum", "Ethereum", "ETH", ["Ether"]],
  ["tether", "Tether", "USDT", ["Tether USD"]],
  ["binancecoin", "BNB", "BNB", ["Binance Coin"]],
  ["solana", "Solana", "SOL"],
  ["usd-coin", "USDC", "USDC", ["USD Coin"]],
  ["ripple", "XRP", "XRP", ["Ripple"]],
  ["dogecoin", "Dogecoin", "DOGE"],
  ["cardano", "Cardano", "ADA"],
  ["tron", "TRON", "TRX"],
  ["avalanche-2", "Avalanche", "AVAX"],
  ["shiba-inu", "Shiba Inu", "SHIB"],
  ["the-open-network", "Toncoin", "TON", ["The Open Network"]],
  ["polkadot", "Polkadot", "DOT"],
  ["chainlink", "Chainlink", "LINK"],
  ["bitcoin-cash", "Bitcoin Cash", "BCH"],
  ["litecoin", "Litecoin", "LTC"],
  ["near", "NEAR Protocol", "NEAR", ["Near"]],
  ["uniswap", "Uniswap", "UNI"],
  ["internet-computer", "Internet Computer", "ICP"],
  ["aptos", "Aptos", "APT"],
  ["ethereum-classic", "Ethereum Classic", "ETC"],
  ["stellar", "Stellar", "XLM", ["Stellar Lumens"]],
  ["filecoin", "Filecoin", "FIL"],
  ["cosmos", "Cosmos Hub", "ATOM", ["Cosmos"]],
  ["hedera-hashgraph", "Hedera", "HBAR", ["Hedera Hashgraph"]],
  ["crypto-com-chain", "Cronos", "CRO", ["Crypto.com Coin"]],
  ["arbitrum", "Arbitrum", "ARB"],
  ["optimism", "Optimism", "OP"],
  ["injective-protocol", "Injective", "INJ"],
  ["immutable-x", "Immutable", "IMX", ["Immutable X"]],
  ["vechain", "VeChain", "VET"],
  ["maker", "Maker", "MKR"],
  ["the-graph", "The Graph", "GRT"],
  ["algorand", "Algorand", "ALGO"],
  ["lido-dao", "Lido DAO", "LDO", ["Lido"]],
  ["theta-token", "Theta Network", "THETA", ["Theta"]],
  ["thorchain", "THORChain", "RUNE"],
  ["aave", "Aave", "AAVE"],
  ["quant-network", "Quant", "QNT"],
  ["elrond-erd-2", "MultiversX", "EGLD", ["Elrond"]],
  ["the-sandbox", "The Sandbox", "SAND", ["Sandbox"]],
  ["decentraland", "Decentraland", "MANA"],
  ["axie-infinity", "Axie Infinity", "AXS"],
  ["fantom", "Fantom", "FTM"],
  ["flow", "Flow", "FLOW"],
  ["kaspa", "Kaspa", "KAS"],
  ["render-token", "Render", "RENDER", ["Render Token", "RNDR"], "rndr"],
  ["pepe", "Pepe", "PEPE"],
  ["bonk", "Bonk", "BONK"],
  ["dogwifcoin", "dogwifhat", "WIF", ["Dog Wif Hat"]],
  ["floki", "FLOKI", "FLOKI", ["Floki Inu"]],
  ["celestia", "Celestia", "TIA"],
  ["sei-network", "Sei", "SEI"],
  ["sui", "Sui", "SUI"],
  ["jupiter-exchange-solana", "Jupiter", "JUP"],
  ["pyth-network", "Pyth Network", "PYTH", ["Pyth"]],
  ["blockstack", "Stacks", "STX"],
  ["bittensor", "Bittensor", "TAO"],
  ["ondo-finance", "Ondo", "ONDO", ["Ondo Finance"]],
  ["ethena", "Ethena", "ENA"],
  ["worldcoin-wld", "Worldcoin", "WLD"],
  ["fetch-ai", "Artificial Superintelligence Alliance", "FET", ["Fetch.ai", "ASI"]],
  ["gala", "Gala", "GALA"],
  ["chiliz", "Chiliz", "CHZ"],
  ["enjincoin", "Enjin Coin", "ENJ", ["Enjin"]],
  ["basic-attention-token", "Basic Attention Token", "BAT"],
  ["zcash", "Zcash", "ZEC"],
  ["dash", "Dash", "DASH"],
  ["compound-governance-token", "Compound", "COMP"],
  ["havven", "Synthetix Network", "SNX", ["Synthetix"]],
  ["curve-dao-token", "Curve DAO", "CRV", ["Curve"]],
  ["1inch", "1inch", "1INCH"],
  ["loopring", "Loopring", "LRC"],
  ["kava", "Kava", "KAVA"],
  ["celo", "Celo", "CELO"],
  ["neo", "NEO", "NEO"],
  ["iota", "IOTA", "IOTA", ["MIOTA"]],
  ["tezos", "Tezos", "XTZ"],
  ["eos", "EOS", "EOS"],
  ["bitcoin-sv", "Bitcoin SV", "BSV"],
  ["monero", "Monero", "XMR"],
  ["okb", "OKB", "OKB"],
  ["leo-token", "UNUS SED LEO", "LEO", ["LEO Token"]],
  ["pancakeswap-token", "PancakeSwap", "CAKE"],
  ["bittorrent", "BitTorrent", "BTT"],
  ["ocean-protocol", "Ocean Protocol", "OCEAN"],
  ["singularitynet", "SingularityNET", "AGIX"],
  ["mina-protocol", "Mina Protocol", "MINA", ["Mina"]],
  ["conflux-token", "Conflux", "CFX"],
  ["klay-token", "Kaia", "KAIA", ["Klaytn", "KLAY"], "klay"],
  ["dydx-chain", "dYdX", "DYDX"],
  ["blur", "Blur", "BLUR"],
  ["rocket-pool", "Rocket Pool", "RPL"],
  ["frax-share", "Frax Share", "FXS"],
  ["osmosis", "Osmosis", "OSMO"],
  ["ecash", "eCash", "XEC"],
  ["trust-wallet-token", "Trust Wallet Token", "TWT"],
  ["neo-gas", "Gas", "GAS", ["NEO Gas"]],
  ["ankr", "Ankr Network", "ANKR", ["Ankr"]],
  ["jasmycoin", "JasmyCoin", "JASMY", ["Jasmy"]],
  ["safepal", "SafePal", "SFP"],
  ["mask-network", "Mask Network", "MASK"],
  ["iotex", "IoTeX", "IOTX"],
  ["zilliqa", "Zilliqa", "ZIL"],
  ["ravencoin", "Ravencoin", "RVN"],
  ["harmony", "Harmony", "ONE"],
  ["waves", "Waves", "WAVES"],
  ["nervos-network", "Nervos Network", "CKB"],
  ["terra-luna-2", "Terra", "LUNA", ["Terra 2.0"]],
  ["terra-luna", "Terra Classic", "LUNC"],
];

export const CRYPTO_CATALOG: readonly CryptoCatalogAsset[] = CRYPTO_SEEDS.map(
  ([id, name, symbol, aliases = [], logoSymbol], index) => ({
    id,
    name,
    symbol: symbol.toUpperCase(),
    aliases,
    rank: index + 1,
    logoUrl: `${ICON_BASE}/${(logoSymbol ?? symbol).toLowerCase()}.png`,
  }),
);

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
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
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

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

function getMatchScore(asset: CryptoCatalogAsset, normalizedQuery: string) {
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
    const nearestDistance = Math.min(
      ...candidates.map((candidate) => editDistance(candidate, normalizedQuery)),
    );
    const allowedDistance = normalizedQuery.length >= 7 ? 2 : 1;

    if (nearestDistance <= allowedDistance) {
      return 60 + nearestDistance;
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function searchCryptoCatalog(query: string, limit = 8) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery || limit <= 0) return [];

  return CRYPTO_CATALOG.map((asset) => ({
    asset,
    score: getMatchScore(asset, normalizedQuery),
  }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return left.asset.rank - right.asset.rank;
    })
    .slice(0, limit)
    .map(({ asset }) => asset);
}
