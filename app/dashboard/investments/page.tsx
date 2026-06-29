import { createClient } from "@/lib/supabase/server";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";
import InvestmentOverview from "@/components/investments/InvestmentOverview";
import EmptyState from "@/components/ui/empty-state";
import { BarChart2, Sparkles, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const supabase = await createClient();

  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .order("created_at", { ascending: false });

  const list = investments ?? [];
  const totalInvested = list.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.purchase_price),
    0,
  );
  const totalValue = list.reduce(
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

      {list.length === 0 ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={BarChart2}
            title="No investments yet"
            description="Add your first holding to track invested value and profit or loss."
          />
        </div>
      ) : (
        <InvestmentOverview
          investments={list as any}
          totalInvested={totalInvested}
          totalValue={totalValue}
          totalPnL={totalPnL}
          totalPnLPct={totalPnLPct}
        />
      )}
    </div>
  );
}
