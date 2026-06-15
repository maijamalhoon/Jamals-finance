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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold">Investments</h2>
          <p className="text-gray-500 text-sm mt-1">{list.length} holdings</p>
        </div>
        <AddInvestmentButton />
      </div>

      {/* Portfolio Summary — only shown when there's data */}
      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1.5">Total Invested</p>
            <p className="text-white text-xl font-bold">{fmt(totalInvested)}</p>
            <p className="text-gray-600 text-xs mt-0.5">
              ≈ ${(totalInvested / 281.2).toFixed(2)} USD
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1.5">Current Value</p>
            <p className="text-white text-xl font-bold">{fmt(totalValue)}</p>
            <p className="text-gray-600 text-xs mt-0.5">
              ≈ ${(totalValue / 281.2).toFixed(2)} USD
            </p>
          </div>

          <div
            className={`rounded-2xl p-4 border ${
              isProfit ?
                "bg-green-500/5 border-green-500/20"
              : "bg-red-500/5 border-red-500/20"
            }`}
          >
            <p className="text-gray-500 text-xs mb-1.5">Total P&L</p>
            <p
              className={`text-xl font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}
            >
              {isProfit ? "+" : "-"}
              {fmt(Math.abs(totalPnL))}
            </p>
            <p
              className={`text-xs mt-0.5 ${isProfit ? "text-green-500" : "text-red-500"}`}
            >
              {isProfit ? "▲" : "▼"} {Math.abs(totalPnLPct).toFixed(2)}% overall
            </p>
          </div>
        </div>
      )}

      {/* Cards */}
      {list.length === 0 ?
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-16 text-center">
          <p className="text-gray-600 text-sm">No investments yet</p>
          <p className="text-gray-700 text-xs mt-1">
            Click "Add Investment" to track your first holding
          </p>
        </div>
      : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((inv) => (
            <InvestmentCard key={inv.id} inv={inv as any} />
          ))}
        </div>
      }
    </div>
  );
}
