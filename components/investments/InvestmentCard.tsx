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
import { BASE_CURRENCY, formatMoney } from "@/lib/currency";
import { getAssetInitials } from "@/lib/investments/aggregation";
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

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "Manual price";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Manual price";

  return `Updated ${date.toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function formatPriceChange(
  value: number | null | undefined,
  source: string | null | undefined,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%${
    source === "coingecko" ? " 24h" : ""
  }`;
}

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUsd(value: number | string | null | undefined) {
  const parsed = toFiniteNumber(value);

  if (parsed === null) return null;

  return formatMoney(parsed, {
    currency: "USD",
    fromCurrency: "USD",
    maximumFractionDigits: parsed >= 1 ? 2 : 6,
  });
}

function formatQuantity(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 1 ? 4 : 8,
  });
}

function formatPurchaseDate(value: string | null | undefined) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvestmentCard({
  inv,
  lots,
}: {
  inv: ExistingInvestment;
  lots?: ExistingInvestment[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [editingInvestment, setEditingInvestment] =
    useState<ExistingInvestment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cfg = CONFIG[inv.type] || CONFIG.other;
  const Icon = cfg.icon;
  const isGrouped = Number(inv.item_count ?? 1) > 1;
  const quoteLabel =
    inv.price_source === "alpha_vantage"
      ? "Latest quote"
      : inv.is_live_priced
        ? "Live"
        : null;
  const priceSourceText =
    inv.price_source === "alpha_vantage"
      ? "Latest quote via Alpha Vantage"
      : inv.price_source === "coingecko"
        ? "Live via CoinGecko"
        : "Manual asset";

  const qty = Number(inv.quantity);
  const buyPrice = Number(inv.purchase_price);
  const curPrice = Number(inv.current_price);
  const originalBuyPrice = toFiniteNumber(inv.purchase_price_original);
  const purchaseCurrency = inv.purchase_currency === "USD" ? "USD" : "PKR";
  const liveUsdPrice =
    inv.current_price_currency === "USD"
      ? formatUsd(inv.current_price_original)
      : null;
  const currentUsdValue =
    inv.current_price_currency === "USD" && toFiniteNumber(inv.current_price_original) !== null
      ? formatUsd((toFiniteNumber(inv.current_price_original) ?? 0) * qty)
      : null;
  const purchaseSecondary =
    purchaseCurrency === "USD" && originalBuyPrice !== null
      ? `Original ${formatUsd(originalBuyPrice)}`
      : `${BASE_CURRENCY} cost basis`;
  const totalCost = qty * buyPrice;
  const currentValue = qty * curPrice;
  const pnl = currentValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const isProfit = pnl >= 0;
  const change24h = formatPriceChange(inv.price_change_24h, inv.price_source);
  const purchaseLots = lots?.length ? lots : [inv];

  async function handleDelete(target: ExistingInvestment) {
    if (!confirm(`Delete "${target.name}"? This cannot be undone.`)) return;
    setDeletingId(target.id);

    const { error } = await supabase
      .from("investments")
      .delete()
      .eq("id", target.id);

    setDeletingId(null);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <article className="finance-reference-card finance-hover-lift group relative flex h-full min-h-[342px] min-w-0 flex-col p-5">
        {!isGrouped ? (
          <div className="absolute right-4 top-4 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => setEditingInvestment(inv)}
              className="icon-button h-8 w-8"
              aria-label="Edit investment"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(inv)}
              disabled={deletingId === inv.id}
              className="icon-button h-8 w-8 hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
              aria-label="Delete investment"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : null}

        <div className="flex min-w-0 items-start gap-3 pr-16">
          {inv.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inv.image_url}
              alt=""
              className="h-11 w-11 flex-shrink-0 rounded-full"
            />
          ) : inv.symbol ? (
            <span
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] text-xs font-bold ${cfg.bg} ${cfg.color}`}
            >
              {getAssetInitials(inv.name, inv.symbol)}
            </span>
          ) : (
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] ${cfg.bg}`}
            >
              <Icon size={18} className={cfg.color} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {inv.name}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={`truncate text-xs font-bold uppercase ${cfg.color}`}>
                {inv.symbol ? inv.symbol.toUpperCase() : cfg.label}
              </span>
              {quoteLabel ? (
                <span className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                  {quoteLabel}
                </span>
              ) : null}
              {isGrouped ? (
                <span className="rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary">
                  {inv.item_count} buys
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}
          >
            {cfg.label}
          </span>
          {change24h ? (
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                Number(inv.price_change_24h ?? 0) >= 0
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-danger/25 bg-danger/10 text-danger"
              }`}
            >
              {change24h}
            </span>
          ) : null}
        </div>

        <div className="mt-5 min-w-0">
          <p className="text-xs font-medium text-text-secondary">Current Value</p>
          <p className="mt-1 break-words text-2xl font-bold tracking-normal text-text-primary [overflow-wrap:anywhere]">
            {formatCurrency(currentValue)}
          </p>
          {currentUsdValue ? (
            <p className="mt-1 text-xs text-text-secondary">{currentUsdValue}</p>
          ) : null}
        </div>

        <div
          className={`mt-4 flex min-w-0 items-center justify-between gap-3 rounded-[16px] border px-3 py-2.5 ${
            isProfit
              ? "border-success/25 bg-success/10 text-success"
              : "border-danger/25 bg-danger/10 text-danger"
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            {isProfit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            P/L
          </span>
          <span className="min-w-0 truncate text-right text-sm font-bold">
            {isProfit ? "+" : "-"}
            {formatCurrency(Math.abs(pnl))} ({Math.abs(pnlPct).toFixed(1)}%)
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="finance-panel-soft min-w-0 p-3">
            <p className="text-[11px] text-text-secondary">Buy Price</p>
            <p className="mt-1 break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(buyPrice)}
            </p>
            <p className="mt-1 break-words text-[10px] text-text-secondary [overflow-wrap:anywhere]">
              {purchaseSecondary}
            </p>
          </div>
          <div className="finance-panel-soft min-w-0 p-3">
            <p className="text-[11px] text-text-secondary">
              {inv.price_source === "alpha_vantage"
                ? "Latest Quote"
                : inv.is_live_priced
                  ? "Live Price"
                  : "Current Price"}
            </p>
            <p className="mt-1 break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
              {formatCurrency(curPrice)}
            </p>
            {liveUsdPrice ? (
              <p className="mt-1 break-words text-[10px] text-text-secondary [overflow-wrap:anywhere]">
                {liveUsdPrice}
              </p>
            ) : null}
          </div>
        </div>

        {isGrouped && purchaseLots.length > 0 ? (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-secondary">
                Individual buys
              </p>
              <span className="text-[11px] font-semibold text-text-secondary">
                {purchaseLots.length}
              </span>
            </div>
            <div className="space-y-2">
              {purchaseLots.map((lot) => {
                const lotQuantity = Number(lot.quantity);
                const lotBuyPrice = Number(lot.purchase_price);
                const lotTotal =
                  Number.isFinite(lotQuantity) && Number.isFinite(lotBuyPrice)
                    ? lotQuantity * lotBuyPrice
                    : 0;

                return (
                  <div
                    key={lot.id}
                    className="flex min-w-0 items-center gap-2 rounded-[14px] border border-border bg-surface-secondary px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text-primary">
                        {formatPurchaseDate(lot.purchased_at)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                        Qty {formatQuantity(lotQuantity)} - {formatCurrency(lotTotal)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingInvestment(lot)}
                      className="icon-button h-8 w-8"
                      aria-label={`Edit ${lot.name} buy`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(lot)}
                      disabled={deletingId === lot.id}
                      className="icon-button h-8 w-8 hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${lot.name} buy`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-text-secondary">
          <span>
            Qty{" "}
            <span className="font-semibold text-text-primary">
              {formatQuantity(qty)}
            </span>
          </span>
          <span className="truncate">
            {inv.is_live_priced
              ? `${priceSourceText} | ${formatUpdatedAt(inv.price_updated_at)}`
              : "Manual asset"}
          </span>
        </div>
      </article>

      <InvestmentModal
        open={Boolean(editingInvestment)}
        investment={editingInvestment ?? undefined}
        onClose={() => setEditingInvestment(null)}
        onSuccess={() => {
          setEditingInvestment(null);
          router.refresh();
        }}
      />
    </>
  );
}
