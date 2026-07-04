import { createClient } from "@/lib/supabase/server";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";
import InvestmentOverview from "@/components/investments/InvestmentOverview";
import EmptyState from "@/components/ui/empty-state";
import { AlertTriangle, BarChart2, Sparkles, TrendingUp } from "lucide-react";
import { getCryptoPrices } from "@/lib/market/crypto";

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
  const liveAssetIds = Array.from(
    new Set(
      list
        .filter(
          (investment) =>
            investment.is_live_priced &&
            investment.price_source === "coingecko" &&
            investment.asset_id,
        )
        .map((investment) => investment.asset_id as string),
    ),
  );
  const emptyLivePrices: Awaited<ReturnType<typeof getCryptoPrices>> = {
    prices: {},
    live: false,
  };

  const livePrices =
    liveAssetIds.length > 0
      ? await getCryptoPrices(liveAssetIds).catch((error) => {
          console.error("Failed to refresh crypto prices", error);
          return emptyLivePrices;
        })
      : emptyLivePrices;

  const pricedList = list.map((investment) => {
    const livePrice = investment.asset_id
      ? livePrices.prices[investment.asset_id]
      : null;

    if (
      investment.is_live_priced &&
      investment.price_source === "coingecko" &&
      typeof livePrice?.pkr === "number"
    ) {
      return {
        ...investment,
        current_price: livePrice.pkr,
        current_price_original: livePrice.usd,
        current_price_currency: "USD",
        price_change_24h: livePrice.change24h,
        price_updated_at: livePrice.lastUpdatedAt,
        price_currency: "PKR",
      };
    }

    return investment;
  });

  const totalInvested = list.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.purchase_price),
    0,
  );
  const totalValue = pricedList.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.current_price),
    0,
  );
  const totalPnL = totalValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

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
            <h2 className="page-title mt-2">Investment Overview</h2>
            <p className="page-subtitle break-words">
              Portfolio value, profit/loss momentum, allocation signals, and compact AI guidance.
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
            description="Add your first holding to track invested value and profit or loss."
          />
        </div>
      ) : (
        <InvestmentOverview
          investments={pricedList}
          totalInvested={totalInvested}
          totalValue={totalValue}
          totalPnL={totalPnL}
          totalPnLPct={totalPnLPct}
        />
      )}
    </div>
  );
}
