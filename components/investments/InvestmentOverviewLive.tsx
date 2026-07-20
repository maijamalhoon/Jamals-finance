"use client";

import { useMemo } from "react";

import InvestmentOverview from "@/components/investments/InvestmentOverview";
import type { ExistingInvestment } from "@/components/investments/InvestmentModal";
import { useLiveInvestmentRows } from "@/components/investments/useLiveInvestmentRows";
import {
  aggregateInvestmentHoldings,
  getAggregatedPortfolioTotals,
} from "@/lib/investments/aggregation";

export default function InvestmentOverviewLive({
  investments,
}: {
  investments: ExistingInvestment[];
}) {
  const liveInvestments = useLiveInvestmentRows(investments);
  const groupedHoldings = useMemo(
    () => aggregateInvestmentHoldings(liveInvestments),
    [liveInvestments],
  );
  const totals = useMemo(
    () => getAggregatedPortfolioTotals(groupedHoldings),
    [groupedHoldings],
  );

  return (
    <InvestmentOverview
      investments={liveInvestments}
      groupedHoldings={groupedHoldings}
      totalInvested={totals.totalInvested}
      totalValue={totals.totalValue}
      totalPnL={totals.totalPnL}
      totalPnLPct={totals.totalPnLPct}
    />
  );
}
