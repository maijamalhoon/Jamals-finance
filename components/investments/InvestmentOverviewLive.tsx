"use client";

import { useMemo } from "react";

import InvestmentOverviewClean from "@/components/investments/InvestmentOverviewClean";
import type { ExistingInvestment } from "@/components/investments/InvestmentModal";
import { useInvestmentPageIcons } from "@/components/investments/useInvestmentPageIcons";
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
  const liveRows = useLiveInvestmentRows(investments);
  const liveInvestments = useInvestmentPageIcons(liveRows);
  const groupedHoldings = useMemo(
    () => aggregateInvestmentHoldings(liveInvestments),
    [liveInvestments],
  );
  const totals = useMemo(
    () => getAggregatedPortfolioTotals(groupedHoldings),
    [groupedHoldings],
  );

  return (
    <div className="investment-overview-live">
      <InvestmentOverviewClean
        investments={liveInvestments}
        groupedHoldings={groupedHoldings}
        totalInvested={totals.totalInvested}
        totalValue={totals.totalValue}
        totalPnL={totals.totalPnL}
        totalPnLPct={totals.totalPnLPct}
      />

      <style jsx global>{`
        .investment-overview-live
          .recharts-wrapper:has(.recharts-pie)
          > .recharts-tooltip-wrapper {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
