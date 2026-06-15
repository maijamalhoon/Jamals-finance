"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Coins,
  TrendingUp,
  Banknote,
  Building2,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import InvestmentModal, { ExistingInvestment } from "./InvestmentModal";

const CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  crypto: {
    label: "Crypto",
    icon: Coins,
    color: "text-yellow-400",
    bg: "bg-yellow-500/15",
  },
  stocks: {
    label: "Stocks",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  savings: {
    label: "Savings",
    icon: Banknote,
    color: "text-green-400",
    bg: "bg-green-500/15",
  },
  real_estate: {
    label: "Real Estate",
    icon: Building2,
    color: "text-orange-400",
    bg: "bg-orange-500/15",
  },
  other: {
    label: "Other",
    icon: Package,
    color: "text-gray-400",
    bg: "bg-gray-500/15",
  },
};

export default function InvestmentCard({ inv }: { inv: ExistingInvestment }) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cfg = CONFIG[inv.type] || CONFIG.other;
  const Icon = cfg.icon;

  const qty = Number(inv.quantity);
  const buyPrice = Number(inv.purchase_price);
  const curPrice = Number(inv.current_price);
  const totalCost = qty * buyPrice;
  const currentValue = qty * curPrice;
  const pnl = currentValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const isProfit = pnl >= 0;

  async function handleDelete() {
    if (!confirm(`Delete "${inv.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await supabase.from("investments").delete().eq("id", inv.id);
    router.refresh();
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 hover:border-gray-700/60 transition-colors group relative">
        {/* Edit / Delete */}
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditOpen(true)}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-indigo-600/20 flex items-center justify-center transition-colors"
          >
            <Pencil size={12} className="text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>

        {/* Icon + Name */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}
          >
            <Icon size={18} className={cfg.color} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {inv.name}
            </p>
            <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
          </div>
        </div>

        {/* Quantity */}
        <p className="text-gray-500 text-xs mb-3">
          Qty:{" "}
          <span className="text-gray-300 font-medium">
            {qty.toLocaleString()}
          </span>
        </p>

        {/* Buy Price vs Current Price */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-800/50 rounded-xl p-2.5">
            <p className="text-gray-500 text-[10px] mb-0.5">Buy Price</p>
            <p className="text-white text-xs font-medium">
              PKR {fmt(buyPrice)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-2.5">
            <p className="text-gray-500 text-[10px] mb-0.5">Current Price</p>
            <p className="text-white text-xs font-medium">
              PKR {fmt(curPrice)}
            </p>
          </div>
        </div>

        {/* Current Value + P&L */}
        <div className="border-t border-gray-800/50 pt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Current Value</p>
            <p className="text-white text-sm font-bold">
              PKR {fmt(currentValue)}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">P&L</p>
            <div
              className={`flex items-center gap-1 ${isProfit ? "text-green-400" : "text-red-400"}`}
            >
              {isProfit ?
                <ArrowUpRight size={13} />
              : <ArrowDownRight size={13} />}
              <span className="text-sm font-semibold">
                PKR {fmt(Math.abs(pnl))}
              </span>
              <span className="text-xs opacity-80">
                ({Math.abs(pnlPct).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <InvestmentModal
        open={editOpen}
        investment={inv}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
