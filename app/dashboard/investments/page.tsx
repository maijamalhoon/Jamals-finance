import { createClient } from "@/lib/supabase/server";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";
import InvestmentOverview from "@/components/investments/InvestmentOverview";
import EmptyState from "@/components/ui/empty-state";
import { AlertTriangle, BarChart2, Sparkles, TrendingUp } from "lucide-react";
import {
  aggregateInvestmentHoldings,
  getAggregatedPortfolioTotals,
} from "@/lib/investments/aggregation";
import { refreshInvestmentMarketPrices } from "@/lib/investments/pricing";

export const dynamic = "force-dynamic";

type InvestmentRow = {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  purchase_price_original?: number | string | null;
  purchase_currency?: string | null;
  current_price: number | string;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  purchased_at: string;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
};

export default async function InvestmentsPage() {
  const supabase = await createClient();

  const { data: investments, error: investmentsError } = await supabase
    .from("investments")
    .select("*")
    .order("created_at", { ascending: false });

  if (investmentsError) {
    console.error("Failed to load investments", investmentsError.message);
  }

  const list = (investments ?? []) as InvestmentRow[];
  const pricedList = await refreshInvestmentMarketPrices(list);

  const groupedHoldings = aggregateInvestmentHoldings(pricedList);
  const { totalInvested, totalValue, totalPnL, totalPnLPct } =
    getAggregatedPortfolioTotals(groupedHoldings);

  return (
    <div className="space-y-5">
      <div className="page-heading finance-surface-glass overflow-hidden">
        <div className="flex min-w-0 gap-3">
          <span
            className="finance-icon-container mt-0.5"
            data-size="lg"
            data-tone="investment"
          >
            <TrendingUp size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-active">
              <Sparkles size={14} />
              Investments
            </div>
            <h2 className="page-title mt-2">Investments</h2>
            <p className="page-subtitle break-words">
              Track live crypto, manual assets, portfolio value, and profit/loss.
            </p>
          </div>
        </div>
        <AddInvestmentButton />
      </div>

      {investmentsError ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load investments"
            description="Refresh the page or try again after checking your connection."
          />
        </div>
      ) : list.length === 0 ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={BarChart2}
            title="No investments yet"
            description="Add crypto or manual assets to start tracking portfolio performance."
          />
          <div className="-mt-8 flex justify-center pb-6 sm:-mt-9">
            <AddInvestmentButton />
          </div>
        </div>
      ) : (
        <InvestmentOverview
          investments={pricedList}
          groupedHoldings={groupedHoldings}
          totalInvested={totalInvested}
          totalValue={totalValue}
          totalPnL={totalPnL}
          totalPnLPct={totalPnLPct}
        />
      )}
    </div>
  );
}
