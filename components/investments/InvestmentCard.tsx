"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  ChevronDown,
  Coins,
  History,
  LucideIcon,
  Package,
  Pencil,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  motionDurations,
  motionEase,
} from "@/components/motion/animation-config";
import {
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import { calculateInvestmentPosition } from "@/lib/investments/calculations";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";
import InvestmentModal, { ExistingInvestment } from "./InvestmentModal";

const CONFIG: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
    accent: string;
  }
> = {
  crypto: {
    label: "Crypto",
    icon: Coins,
    color: "text-warning",
    bg: "bg-warning/10",
    accent: "#f59e0b",
  },
  stocks: {
    label: "Stocks",
    icon: TrendingUp,
    color: "text-info",
    bg: "bg-info/10",
    accent: "#38bdf8",
  },
  savings: {
    label: "Savings",
    icon: Banknote,
    color: "text-success",
    bg: "bg-success/10",
    accent: "#34d399",
  },
  real_estate: {
    label: "Real Estate",
    icon: Building2,
    color: "text-[var(--investment)]",
    bg: "bg-surface-secondary",
    accent: "#a78bfa",
  },
  other: {
    label: "Other",
    icon: Package,
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
    accent: "#94a3b8",
  },
};

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "Manual price";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Manual price";

  return `Updated ${date.toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function AssetIdentity({
  inv,
  icon: Icon,
  iconClass,
  iconBackground,
}: {
  inv: ExistingInvestment;
  icon: LucideIcon;
  iconClass: string;
  iconBackground: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (inv.image_url && !imageFailed) {
    return (
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] sm:h-14 sm:w-14"
        style={{
          background:
            "color-mix(in srgb, var(--holding-accent) 10%, var(--surface-secondary))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={inv.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="h-9 w-9 rounded-full object-contain sm:h-10 sm:w-10"
        />
      </span>
    );
  }

  return (
    <span
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-[18px] sm:h-14 sm:w-14 ${iconBackground}`}
    >
      <Icon
        size={21}
        strokeWidth={2.1}
        className={iconClass}
        aria-hidden="true"
      />
    </span>
  );
}

function MiniValue({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "profit" | "loss";
}) {
  const toneClass =
    tone === "profit"
      ? "text-success"
      : tone === "loss"
        ? "text-danger"
        : "text-text-primary";

  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-text-secondary sm:text-[10px]">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-bold tabular-nums tracking-tight [overflow-wrap:anywhere] sm:text-base ${toneClass}`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-0.5 truncate text-[10px] text-text-secondary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export default function InvestmentCard({
  inv,
  lots,
  accentColor,
}: {
  inv: ExistingInvestment;
  lots?: ExistingInvestment[];
  accentColor?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { formatCurrency } = useCurrency();

  const [editingInvestment, setEditingInvestment] =
    useState<ExistingInvestment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const cfg = CONFIG[inv.type] || CONFIG.other;
  const Icon = cfg.icon;
  const purchaseLots = useMemo(
    () =>
      (lots?.length ? [...lots] : [inv]).sort((left, right) => {
        const leftDate = Date.parse(left.purchased_at || "") || 0;
        const rightDate = Date.parse(right.purchased_at || "") || 0;
        return rightDate - leftDate;
      }),
    [inv, lots],
  );
  const isGrouped = purchaseLots.length > 1;
  const position = calculateInvestmentPosition(
    inv.quantity,
    inv.purchase_price,
    inv.current_price,
  );
  const qty = position?.quantity ?? 0;
  const buyPrice = position?.purchasePrice ?? 0;
  const currentPrice = position?.currentPrice ?? 0;
  const totalInvested = position?.totalInvested ?? 0;
  const currentValue = position?.currentValue ?? 0;
  const pnl = position?.totalPnL ?? 0;
  const pnlPct = position?.totalPnLPct ?? 0;
  const isProfit = pnl >= 0;
  const progressRatio =
    totalInvested > 0
      ? Math.max(0, Math.min(1.35, currentValue / totalInvested))
      : 0;
  const progressWidth = Math.min(100, Math.max(3, progressRatio * 74));
  const change24h =
    typeof inv.price_change_24h === "number" &&
    Number.isFinite(inv.price_change_24h)
      ? inv.price_change_24h
      : null;
  const priceSourceText =
    inv.price_source === "alpha_vantage"
      ? "Latest quote via Alpha Vantage"
      : inv.price_source === "coingecko"
        ? "Live via CoinGecko"
        : inv.price_source === "binance"
          ? "Live via Binance"
          : "Manual asset";
  const resolvedAccent = accentColor || cfg.accent;
  const cardStyle = {
    "--holding-accent": resolvedAccent,
    background:
      "linear-gradient(145deg, color-mix(in srgb, var(--holding-accent) 8%, var(--card)) 0%, var(--card) 48%, color-mix(in srgb, var(--holding-accent) 4%, var(--card)) 100%)",
  } as CSSProperties;

  async function handleDelete(target: ExistingInvestment) {
    if (!confirm(`Delete "${target.name}"? This cannot be undone.`)) return;
    setDeletingId(target.id);

    const { error } = await supabase
      .from("investments")
      .delete()
      .eq("id", target.id);

    setDeletingId(null);

    if (error) {
      toast.error(
        getUserMutationError(
          error,
          "Investment could not be deleted. Try again.",
        ),
      );
      return;
    }

    router.refresh();
  }

  function originalLotPrice(lot: ExistingInvestment) {
    const original = toFiniteNumber(lot.purchase_price_original);
    const currency = isSupportedCurrency(lot.purchase_currency)
      ? lot.purchase_currency
      : null;

    if (original === null || !currency) return null;

    return formatCurrency(original, {
      currency,
      fromCurrency: currency,
      maximumFractionDigits: currency === "JPY" ? 0 : original < 1 ? 8 : 2,
    });
  }

  function lotSummary(lot: ExistingInvestment) {
    const lotPosition = calculateInvestmentPosition(
      lot.quantity,
      lot.purchase_price,
      lot.current_price,
    );

    return {
      quantity: lotPosition?.quantity ?? 0,
      buyPrice: lotPosition?.purchasePrice ?? 0,
      invested: lotPosition?.totalInvested ?? 0,
      currentValue: lotPosition?.currentValue ?? 0,
      pnl: lotPosition?.totalPnL ?? 0,
      pnlPct: lotPosition?.totalPnLPct ?? 0,
      originalPrice: originalLotPrice(lot),
      originalCurrency: isSupportedCurrency(lot.purchase_currency)
        ? (lot.purchase_currency as SupportedCurrency)
        : null,
    };
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDurations.base, ease: motionEase }}
        className="group relative min-w-0 overflow-hidden rounded-[26px] shadow-[var(--shadow-soft)] transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5"
        style={cardStyle}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-7 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--holding-accent), transparent)",
          }}
        />

        <div className="relative p-4 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AssetIdentity
                inv={inv}
                icon={Icon}
                iconClass={cfg.color}
                iconBackground={cfg.bg}
              />
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold tracking-tight text-text-primary sm:text-lg">
                    {inv.name}
                  </h3>
                  {inv.is_live_priced ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-success">
                      Live
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-secondary">
                  <span className={`font-bold uppercase ${cfg.color}`}>
                    {inv.symbol?.toUpperCase() || cfg.label}
                  </span>
                  <span>·</span>
                  <span>
                    {purchaseLots.length} buy
                    {purchaseLots.length === 1 ? "" : "s"}
                  </span>
                  <span>·</span>
                  <span>Qty {formatQuantity(qty)}</span>
                </div>
              </div>
            </div>

            {change24h !== null ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  change24h >= 0
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {change24h >= 0 ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
                {change24h >= 0 ? "+" : ""}
                {change24h.toFixed(2)}%
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)]">
            <div className="min-w-0 rounded-[20px] bg-surface-primary/48 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                Current value
              </p>
              <p className="mt-1.5 break-words text-2xl font-bold tabular-nums tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere] sm:text-3xl">
                {formatCurrency(currentValue)}
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {inv.is_live_priced ? priceSourceText : "Manual position value"}
              </p>
            </div>

            <div
              className="min-w-0 rounded-[20px] px-4 py-4"
              style={{
                background: isProfit
                  ? "color-mix(in srgb, var(--success) 8%, var(--surface-primary))"
                  : "color-mix(in srgb, var(--danger) 8%, var(--surface-primary))",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                Total profit / loss
              </p>
              <p
                className={`mt-1.5 flex items-center gap-1 text-lg font-bold tabular-nums sm:text-xl ${
                  isProfit ? "text-success" : "text-danger"
                }`}
              >
                {isProfit ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <ArrowDownRight size={18} />
                )}
                {isProfit ? "+" : "-"}
                {formatCurrency(Math.abs(pnl))}
              </p>
              <p
                className={`mt-1 text-[11px] font-semibold ${
                  isProfit ? "text-success" : "text-danger"
                }`}
              >
                {isProfit ? "+" : "-"}
                {Math.abs(pnlPct).toFixed(2)}% return
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] bg-surface-primary/36 px-3.5 py-3.5 sm:px-4">
            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-text-secondary">
              <span>Position value</span>
              <span>Cost basis</span>
            </div>
            <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-text-secondary/22"
                style={{ width: "74%" }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${progressWidth}%`,
                  background: `linear-gradient(90deg, var(--holding-accent), ${
                    isProfit ? "var(--success)" : "var(--danger)"
                  })`,
                }}
              />
              <span className="absolute inset-y-[-2px] left-[74%] w-px bg-text-primary/45" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-[17px] bg-surface-primary/42 px-3 py-3">
              <MiniValue
                label="Invested"
                value={formatCurrency(totalInvested)}
                helper="Combined cost"
              />
            </div>
            <div className="rounded-[17px] bg-surface-primary/42 px-3 py-3">
              <MiniValue
                label="Avg buy"
                value={formatCurrency(buyPrice)}
                helper="Weighted price"
              />
            </div>
            <div className="rounded-[17px] bg-surface-primary/42 px-3 py-3">
              <MiniValue
                label={inv.is_live_priced ? "Live price" : "Current price"}
                value={formatCurrency(currentPrice)}
                helper={inv.is_live_priced ? "Latest market price" : "Manual price"}
              />
            </div>
            <div className="rounded-[17px] bg-surface-primary/42 px-3 py-3">
              <MiniValue
                label="Position"
                value={`${formatQuantity(qty)} ${
                  inv.symbol?.toUpperCase() || "units"
                }`}
                helper={
                  isGrouped
                    ? `${purchaseLots.length} separate buys`
                    : formatPurchaseDate(purchaseLots[0]?.purchased_at)
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-secondary/24">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="finance-focus flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left transition-colors duration-150 hover:bg-hover/55 sm:px-5"
          >
            <span className="flex min-w-0 items-center gap-2">
              <History size={15} className="shrink-0 text-active" />
              <span className="truncate text-xs font-semibold text-text-primary">
                Purchase history and options
              </span>
              <span className="rounded-full bg-surface-primary/70 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                {purchaseLots.length}
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-text-secondary transition-transform duration-200 ${
                historyOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {historyOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionDurations.fast, ease: motionEase }}
              className="space-y-2.5 px-3 pb-3 sm:px-4 sm:pb-4"
            >
              {purchaseLots.map((lot, index) => {
                const summary = lotSummary(lot);
                const lotProfit = summary.pnl >= 0;

                return (
                  <div
                    key={lot.id}
                    className="relative overflow-hidden rounded-[18px] bg-surface-primary/62 p-3.5 sm:p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-3 left-0 w-0.5 rounded-full"
                      style={{ backgroundColor: "var(--holding-accent)" }}
                    />
                    <div className="flex min-w-0 items-start justify-between gap-3 pl-1">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black"
                          style={{
                            color: "var(--holding-accent)",
                            background:
                              "color-mix(in srgb, var(--holding-accent) 11%, var(--surface-secondary))",
                          }}
                        >
                          {purchaseLots.length - index}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary">
                            Bought {formatPurchaseDate(lot.purchased_at)}
                          </p>
                          <p className="mt-1 text-[11px] text-text-secondary">
                            Qty {formatQuantity(summary.quantity)} ·{" "}
                            {formatCurrency(summary.invested)} invested
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
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
                          className="icon-button h-8 w-8 hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${lot.name} buy`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2.5 pl-1 sm:grid-cols-4">
                      <MiniValue
                        label="Buy price"
                        value={formatCurrency(summary.buyPrice)}
                        helper={
                          summary.originalPrice && summary.originalCurrency
                            ? `Original ${summary.originalPrice}`
                            : undefined
                        }
                      />
                      <MiniValue
                        label="Current value"
                        value={formatCurrency(summary.currentValue)}
                      />
                      <MiniValue
                        label="P/L"
                        value={`${lotProfit ? "+" : "-"}${formatCurrency(
                          Math.abs(summary.pnl),
                        )}`}
                        helper={`${lotProfit ? "+" : "-"}${Math.abs(
                          summary.pnlPct,
                        ).toFixed(1)}%`}
                        tone={lotProfit ? "profit" : "loss"}
                      />
                      <MiniValue
                        label="Price source"
                        value={lot.is_live_priced ? "Live" : "Manual"}
                        helper={
                          lot.is_live_priced
                            ? formatUpdatedAt(lot.price_updated_at)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : null}
        </div>
      </motion.article>

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
