import { createClient } from "@/lib/supabase/server";
import InvestmentCard from "@/components/investments/InvestmentCard";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";

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
  const isProfit = totalPnL >= 0;

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Investments</h2>
          <p className="page-subtitle">{list.length} holdings</p>
        </div>
        <AddInvestmentButton />
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="summary-card">
            <p className="mb-1.5 text-xs text-slate-500">Total Invested</p>
            <p className="text-xl font-bold text-white">
              {fmt(totalInvested)}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Approx. ${(totalInvested / 281.2).toFixed(2)} USD
            </p>
          </div>

          <div className="summary-card">
            <p className="mb-1.5 text-xs text-slate-500">Current Value</p>
            <p className="text-xl font-bold text-white">{fmt(totalValue)}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Approx. ${(totalValue / 281.2).toFixed(2)} USD
            </p>
          </div>

          <div
            className={`summary-card ${
              isProfit
                ? "border-green-500/20 bg-green-500/5"
                : "border-red-500/20 bg-red-500/5"
            }`}
          >
            <p className="mb-1.5 text-xs text-slate-500">Total P&L</p>
            <p
              className={`text-xl font-bold ${
                isProfit ? "text-green-400" : "text-red-400"
              }`}
            >
              {isProfit ? "+" : "-"}
              {fmt(Math.abs(totalPnL))}
            </p>
            <p
              className={`mt-0.5 text-xs ${
                isProfit ? "text-green-500" : "text-red-500"
              }`}
            >
              {isProfit ? "Up" : "Down"} {Math.abs(totalPnLPct).toFixed(2)}%
              overall
            </p>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="finance-panel p-12 text-center sm:p-16">
          <p className="text-sm text-slate-500">No investments yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Click "Add Investment" to track your first holding
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((inv) => (
            <InvestmentCard key={inv.id} inv={inv as any} />
          ))}
        </div>
      )}
    </div>
  );
}
