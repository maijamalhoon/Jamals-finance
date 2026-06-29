"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Coins,
  LucideIcon,
  Package,
  Pencil,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import InvestmentModal, { ExistingInvestment } from "./InvestmentModal";

const CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  crypto: {
    label: "Crypto",
    icon: Coins,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  stocks: {
    label: "Stocks",
    icon: TrendingUp,
    color: "text-info",
    bg: "bg-info/10",
  },
  savings: {
    label: "Savings",
    icon: Banknote,
    color: "text-success",
    bg: "bg-success/10",
  },
  real_estate: {
    label: "Real Estate",
    icon: Building2,
    color: "text-[var(--investment)]",
    bg: "bg-surface-secondary",
  },
  other: {
    label: "Other",
    icon: Package,
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  },
};

export default function InvestmentCard({ inv }: { inv: ExistingInvestment }) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

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

  return (
    <>
      <div className="finance-panel card-hover group relative p-5 hover:border-border">
        <div className="absolute right-4 top-4 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="icon-button"
            aria-label="Edit investment"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="icon-button hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
            aria-label="Delete investment"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 pr-16">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}
          >
            <Icon size={18} className={cfg.color} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">
              {inv.name}
            </p>
            <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
          </div>
        </div>

        <p className="mb-3 text-xs text-text-secondary">
          Qty:{" "}
          <span className="font-medium text-text-primary">
            {qty.toLocaleString()}
          </span>
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="finance-panel-soft min-w-0 p-2.5">
            <p className="mb-0.5 text-[10px] text-text-secondary">Buy Price</p>
            <p className="break-words text-xs font-medium text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(buyPrice)}
            </p>
          </div>
          <div className="finance-panel-soft min-w-0 p-2.5">
            <p className="mb-0.5 text-[10px] text-text-secondary">Current Price</p>
            <p className="break-words text-xs font-medium text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(curPrice)}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">Current Value</p>
            <p className="break-words text-right text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(currentValue)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">P&L</p>
            <div
              className={`flex min-w-0 items-center justify-end gap-1 text-right ${
                isProfit ? "text-success" : "text-danger"
              }`}
            >
              {isProfit ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span className="truncate text-sm font-semibold">
                {formatCurrency(Math.abs(pnl))}
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
