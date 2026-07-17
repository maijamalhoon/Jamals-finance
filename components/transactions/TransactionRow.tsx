"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Eye,
  Pencil,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import TransactionModal, {
  ExistingTransaction,
} from "@/components/dashboard/TransactionModal";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type TransactionType = "income" | "expense" | "investment" | "refund" | "transfer";

type Transaction = Omit<ExistingTransaction, "type"> & {
  type?: TransactionType | string | null;
  amount?: number | string | null;
  date?: string | null;
  created_at?: string | null;
  note?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  reference?: string | null;
  categories: {
    name?: string | null;
    color?: string | null;
    parent?: { name?: string | null } | null;
  } | null;
  accounts: { name?: string | null } | null;
};

function getTypeMeta(type?: string | null): {
  label: string;
  icon: LucideIcon;
  softClass: string;
  amountClass: string;
  prefix: string;
} {
  if (type === "income") {
    return {
      label: "Income",
      icon: TrendingUp,
      softClass:
        "border-success/30 bg-success/10 text-success",
      amountClass: "text-success",
      prefix: "+",
    };
  }

  if (type === "expense") {
    return {
      label: "Expense",
      icon: TrendingDown,
      softClass:
        "border-danger/30 bg-danger/10 text-danger",
      amountClass: "text-danger",
      prefix: "-",
    };
  }

  if (type === "investment") {
    return {
      label: "Investment contribution",
      icon: ChartNoAxesCombined,
      softClass:
        "border-investment/30 bg-investment/10 text-investment",
      amountClass: "text-investment",
      prefix: "-",
    };
  }

  if (type === "refund") {
    return {
      label: "Expense refund",
      icon: RotateCcw,
      softClass: "border-info/30 bg-info/10 text-info",
      amountClass: "text-info",
      prefix: "+",
    };
  }

  return {
    label: "Transfer",
    icon: ArrowLeftRight,
    softClass:
      "border-active/30 bg-active/10 text-active",
    amountClass: "text-active",
    prefix: "",
  };
}

function normalizeType(type?: string | null): TransactionType {
  if (
    type === "income" ||
    type === "expense" ||
    type === "investment" ||
    type === "refund" ||
    type === "transfer"
  ) {
    return type;
  }

  return "transfer";
}

function formatDate(date?: string | null) {
  if (!date) return "No date";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCategoryLabel(tx: Transaction) {
  if (tx.type === "transfer") return "Transfer";

  const parentName = tx.categories?.parent?.name;
  const categoryName = tx.categories?.name;

  if (parentName && categoryName) return `${parentName} / ${categoryName}`;

  return categoryName || "Uncategorized";
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const type = normalizeType(tx.type);
  const meta = getTypeMeta(type);
  const TypeIcon = meta.icon;
  const canEdit = type === "income" || type === "expense";
  const canDelete = type !== "investment";

  const categoryLabel = getCategoryLabel(tx);
  const title = tx.note || tx.categories?.name || meta.label;
  const accountName = tx.accounts?.name || "No account";
  const displayAmount = `${meta.prefix}${formatCurrency(Number(tx.amount ?? 0))}`;

  const receiptHref =
    tx.id ?
      `/dashboard/transactions/${encodeURIComponent(String(tx.id))}`
    : "/dashboard/transactions";

  const smallDetail = useMemo(() => {
    const details = [
      type === "income" && tx.source_name ? `Source: ${tx.source_name}` : null,
      tx.person_name ? `Person: ${tx.person_name}` : null,
      tx.item_name ? `Item: ${tx.item_name}` : null,
      tx.reference ? `Ref: ${tx.reference}` : null,
    ].filter(Boolean);

    return details.join(" - ");
  }, [tx.item_name, tx.person_name, tx.reference, tx.source_name, type]);

  async function handleDelete() {
    if (!tx.id) return;

    if (!confirm("Delete this transaction? This cannot be undone.")) return;

    setDeleting(true);

    const tableName =
      type === "transfer" ? "account_transfers" : "transactions";

    const { error } = await supabase.from(tableName).delete().eq("id", tx.id);

    setDeleting(false);

    if (error) {
      toast.error("Could not delete this transaction. Please try again.");
      return;
    }

    router.refresh();
  }

  return (
    <>
      <article
        data-transaction-row
        className="group grid min-w-0 grid-cols-[auto,minmax(0,1fr)] gap-3 rounded-[var(--oneui-tile-radius)] border border-transparent px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-hover hover:shadow-sm md:flex md:items-center"
      >
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105 ${meta.softClass}`}
        >
          <TypeIcon size={18} strokeWidth={2.4} />
        </div>

        <div className="min-w-0 md:flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere] sm:truncate">
                {title}
              </p>

              <p className="mt-0.5 break-words text-xs font-medium text-text-secondary [overflow-wrap:anywhere] sm:truncate">
                {accountName}
              </p>

              {smallDetail ?
                <p className="mt-1 break-words text-[11px] text-text-secondary [overflow-wrap:anywhere] sm:truncate">
                  {smallDetail}
                </p>
              : null}
            </div>

            <p
              className={`max-w-[52%] shrink-0 break-words text-right text-[13px] font-black leading-tight [overflow-wrap:anywhere] sm:text-sm md:hidden ${meta.amountClass}`}
            >
              {displayAmount}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
            <TypePill meta={meta} TypeIcon={TypeIcon} />

            <span className="max-w-full break-words rounded-full bg-hover px-2 py-1 text-[11px] font-medium text-text-secondary [overflow-wrap:anywhere]">
              {type === "income" && tx.source_name ?
                tx.source_name
              : categoryLabel}
            </span>

            <span className="text-[11px] font-medium text-text-secondary">
              {formatDate(tx.date)}
            </span>
          </div>
        </div>

        <p className="hidden w-32 truncate text-xs font-medium text-text-secondary md:block">
          {type === "income" && tx.source_name ? tx.source_name : categoryLabel}
        </p>

        <div className="hidden w-24 shrink-0 justify-center md:flex">
          <TypePill meta={meta} TypeIcon={TypeIcon} />
        </div>

        <p
          className={`hidden w-32 shrink-0 break-words text-right text-sm font-black [overflow-wrap:anywhere] md:block ${meta.amountClass}`}
        >
          {displayAmount}
        </p>

        <p className="hidden w-24 shrink-0 text-right text-xs font-medium text-text-secondary md:block">
          {formatDate(tx.date)}
        </p>

        <div className="col-span-2 flex items-center justify-end gap-1.5 md:col-span-1 md:w-24 md:shrink-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              router.push(receiptHref);
            }}
            className="finance-focus grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:text-active hover:shadow-md md:h-8 md:w-8"
            aria-label="View receipt"
            title="View receipt"
            type="button"
          >
            <Eye size={14} />
          </button>

          {canEdit ?
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                setEditOpen(true);
              }}
              className="finance-focus grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:text-active hover:shadow-md md:h-8 md:w-8"
              aria-label="Edit transaction"
              title="Edit"
              type="button"
            >
              <Pencil size={14} />
            </button>
          : null}

          {canDelete ?
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                void handleDelete();
              }}
              disabled={deleting}
              className="finance-focus grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:border-danger/30 hover:bg-danger/10 hover:text-danger hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:w-8"
              aria-label="Delete transaction"
              title="Delete"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          : null}
        </div>
      </article>

      {canEdit ?
        <TransactionModal
          open={editOpen}
          defaultType={type}
          transaction={tx as ExistingTransaction}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      : null}
    </>
  );
}

function TypePill({
  meta,
  TypeIcon,
}: {
  meta: {
    label: string;
    softClass: string;
  };
  TypeIcon: LucideIcon;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.softClass}`}
    >
      <TypeIcon size={12} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}
