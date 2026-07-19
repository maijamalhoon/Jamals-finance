import type {
  DeterministicFinanceAnswer,
  FinanceInvestmentRecord,
} from "@/lib/ai/deterministic-finance-chat";

type AssetAggregate = {
  key: string;
  name: string;
  symbol: string | null;
  records: number;
  quantity: number;
  invested: number;
  currentValue: number;
  quantityComplete: boolean;
  investedComplete: boolean;
  currentValueComplete: boolean;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(value);
}

function getAssetKey(investment: FinanceInvestmentRecord) {
  return (
    normalize(investment.asset_id) ||
    normalize(investment.symbol) ||
    normalize(investment.name) ||
    normalize(investment.id)
  );
}

function getAssetLabel(asset: Pick<AssetAggregate, "name" | "symbol">) {
  return asset.symbol && normalize(asset.symbol) !== normalize(asset.name)
    ? `${asset.name} (${asset.symbol})`
    : asset.name;
}

function aggregateAssets(investments: FinanceInvestmentRecord[]) {
  const assets = new Map<string, AssetAggregate>();

  investments.forEach((investment) => {
    const key = getAssetKey(investment);
    if (!key) return;

    const name =
      investment.name?.trim() ||
      investment.symbol?.trim().toUpperCase() ||
      investment.asset_id?.trim() ||
      "Unnamed asset";
    const symbol = investment.symbol?.trim().toUpperCase() || null;
    const quantity = toFiniteNumber(investment.quantity);
    const purchasePrice = toFiniteNumber(investment.purchase_price);
    const currentPrice = toFiniteNumber(investment.current_price);

    const asset =
      assets.get(key) ??
      ({
        key,
        name,
        symbol,
        records: 0,
        quantity: 0,
        invested: 0,
        currentValue: 0,
        quantityComplete: true,
        investedComplete: true,
        currentValueComplete: true,
      } satisfies AssetAggregate);

    asset.records += 1;
    if (!asset.symbol && symbol) asset.symbol = symbol;
    if (asset.name === "Unnamed asset" && name !== "Unnamed asset") {
      asset.name = name;
    }

    if (quantity === null || quantity < 0) {
      asset.quantityComplete = false;
      asset.investedComplete = false;
      asset.currentValueComplete = false;
    } else {
      asset.quantity += quantity;

      if (purchasePrice === null || purchasePrice < 0) {
        asset.investedComplete = false;
      } else {
        asset.invested += quantity * purchasePrice;
      }

      if (currentPrice === null || currentPrice <= 0) {
        asset.currentValueComplete = false;
      } else {
        asset.currentValue += quantity * currentPrice;
      }
    }

    assets.set(key, asset);
  });

  return Array.from(assets.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function isAssetBreakdownRequest(
  question: string,
  previousQuestion: string,
) {
  const current = normalize(question);
  const previous = normalize(previousQuestion);
  const assetWords =
    /\b(asset|assets|investment|investments|holding|holdings|portfolio|stock|stocks|share|shares|crypto|coin|coins)\b/;
  const amountWords =
    /\b(amount|amounts|value|values|worth|quantity|quantities|units|balance|balances|cost|costs|invested|each|individual|breakdown|how much)\b/;
  const referenceWords =
    /\b(this|these|those|them|their|there|it|its|each|individual|asset|assets|investment|investments|portfolio)\b/;
  const previousAssetList =
    assetWords.test(previous) &&
    /\b(how many|count|number|name|names|list|which|what)\b/.test(previous);

  return (
    (assetWords.test(current) && amountWords.test(current)) ||
    (previousAssetList && amountWords.test(current) && referenceWords.test(current))
  );
}

export function buildAssetBreakdownAnswer(
  investments: FinanceInvestmentRecord[],
  money: (value: number) => string,
): DeterministicFinanceAnswer {
  const assets = aggregateAssets(investments);

  if (assets.length === 0) {
    return {
      answer: "You do not have any recorded investment assets yet.",
      followUps: [
        "How many accounts do I have?",
        "How much is currently payable?",
      ],
    };
  }

  let completePortfolio = true;
  let portfolioInvested = 0;
  let portfolioCurrentValue = 0;

  const details = assets.map((asset) => {
    const label = getAssetLabel(asset);
    const parts: string[] = [];

    parts.push(
      asset.quantityComplete
        ? `quantity ${formatQuantity(asset.quantity)}${asset.symbol ? ` ${asset.symbol}` : " units"}`
        : "quantity unavailable",
    );

    if (asset.investedComplete) {
      parts.push(`invested ${money(asset.invested)}`);
      portfolioInvested += asset.invested;
    } else {
      parts.push("invested amount unavailable");
      completePortfolio = false;
    }

    if (asset.currentValueComplete) {
      parts.push(`current value ${money(asset.currentValue)}`);
      portfolioCurrentValue += asset.currentValue;
    } else {
      parts.push("current value unavailable because a current price is missing");
      completePortfolio = false;
    }

    if (asset.investedComplete && asset.currentValueComplete) {
      const pnl = asset.currentValue - asset.invested;
      parts.push(
        `unrealized ${pnl >= 0 ? "profit" : "loss"} ${money(Math.abs(pnl))}`,
      );
    }

    return `${label}: ${parts.join(", ")}`;
  });

  const portfolioSummary = completePortfolio
    ? (() => {
        const pnl = portfolioCurrentValue - portfolioInvested;
        return ` Portfolio total: invested ${money(portfolioInvested)}, current value ${money(portfolioCurrentValue)}, unrealized ${pnl >= 0 ? "profit" : "loss"} ${money(Math.abs(pnl))}.`;
      })()
    : " Some records are incomplete, so I did not provide a potentially misleading portfolio total.";

  return {
    answer: `${details.join("; ")}.${portfolioSummary}`,
    followUps: assets.slice(0, 2).map((asset) => {
      const label = asset.symbol || asset.name;
      return `How much profit do I have on ${label}?`;
    }),
  };
}
