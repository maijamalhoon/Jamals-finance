import type { InvestmentLike } from "@/lib/investments/aggregation";

/**
 * Legacy server-side market providers remain in the repository for future use,
 * but portfolio pages no longer call them. Saved rows are returned immediately;
 * supported crypto holdings are refreshed in the browser through the public
 * Binance live stream.
 */
export async function refreshInvestmentMarketPrices<T extends InvestmentLike>(
  investments: T[],
) {
  return investments;
}
