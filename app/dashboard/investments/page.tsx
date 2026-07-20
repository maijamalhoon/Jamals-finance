import { createClient } from "@/lib/supabase/server";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";
import InvestmentOverviewLive from "@/components/investments/InvestmentOverviewLive";
import EmptyState from "@/components/ui/empty-state";
import { AlertTriangle, BarChart2 } from "lucide-react";

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

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
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
        <div className="py-3 sm:py-6">
          <EmptyState
            icon={BarChart2}
            title="No investments yet"
            description="Add your first investment to see portfolio performance here."
            action={
              <AddInvestmentButton
                label="Add an investment"
                showIcon={false}
              />
            }
          />
        </div>
      ) : (
        <InvestmentOverviewLive investments={list} />
      )}
    </div>
  );
}
