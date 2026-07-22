export type InvestmentMarketType = "crypto" | "stock" | "forex";

function normalizeTypeToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeInvestmentMarketType(
  value: string | null | undefined,
): InvestmentMarketType | null {
  const type = normalizeTypeToken(value);

  if (
    ["stock", "stocks", "equity", "equities", "share", "shares"].includes(
      type,
    )
  ) {
    return "stock";
  }

  if (["forex", "fx", "currency", "currencies"].includes(type)) {
    return "forex";
  }

  if (
    ["crypto", "cryptocurrency", "cryptocurrencies", "coin", "coins"].includes(
      type,
    )
  ) {
    return "crypto";
  }

  return null;
}

export function normalizeInvestmentEditorType(
  value: string | null | undefined,
): InvestmentMarketType | "other" {
  return normalizeInvestmentMarketType(value) ?? "other";
}
