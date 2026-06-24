"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTransactionIconMeta } from "@/lib/transaction-icons";
import TransactionModal, {
  ExistingTransaction,
} from "@/components/dashboard/TransactionModal";

interface Transaction extends ExistingTransaction {
  categories: {
    name: string;
    color: string;
    parent?: { name: string } | null;
  } | null;
  accounts: { name: string } | null;
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isIncome = tx.type === "income";
  const iconMeta = getTransactionIconMeta({
    type: tx.type,
    note: tx.note,
    categoryName: tx.categories?.name,
    parentCategoryName: tx.categories?.parent?.name,
  });
  const TypeIcon = iconMeta.icon;
  const categoryLabel =
    tx.categories?.parent?.name ?
      `${tx.categories.parent.name} / ${tx.categories.name}`
    : tx.categories?.name || "Uncategorized";
  const detailBits = [
    isIncome && tx.source_name ? `Source: ${tx.source_name}` : null,
    tx.person_name ? `Person: ${tx.person_name}` : null,
    tx.item_name ? `Item: ${tx.item_name}` : null,
  ].filter(Boolean);

  async function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("transactions").delete().eq("id", tx.id);
    router.refresh();
  }

  return (
    <>
      <div className="motion-table-row group grid grid-cols-[auto,1fr] gap-3 rounded-[14px] border-b border-slate-100 py-3.5 transition-all duration-200 hover:bg-hover last:border-0 md:flex md:items-center">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
          style={{
            color: iconMeta.accent,
            borderColor: `color-mix(in srgb, ${iconMeta.accent}, transparent 76%)`,
            backgroundColor: `color-mix(in srgb, ${iconMeta.accent}, transparent 92%)`,
          }}
        >
          <TypeIcon size={16} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 md:flex-1">
          <div className="flex items-start justify-between gap-3 md:block">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-950">
                {tx.note || tx.categories?.name || "Transaction"}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {tx.accounts?.name || "No account"}
              </p>
              {detailBits.length > 0 && (
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {detailBits.join(" - ")}
                </p>
              )}
            </div>
            <p
              className={`shrink-0 text-right text-sm font-semibold md:hidden ${
                isIncome ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {isIncome ? "+" : "-"} PKR {Number(tx.amount).toLocaleString()}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
            <span className="finance-state-pill px-2 py-1 text-[11px]">
              <TypeIcon size={12} strokeWidth={2.1} />
              {iconMeta.label}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
              {isIncome && tx.source_name ? tx.source_name : categoryLabel}
            </span>
            <span className="text-[11px] text-slate-500">
              {new Date(tx.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <p className="hidden w-32 truncate text-xs text-slate-600 md:block">
          {isIncome && tx.source_name ? tx.source_name : categoryLabel}
        </p>

        <span className="finance-state-pill hidden w-24 flex-shrink-0 justify-center text-xs md:inline-flex">
          <TypeIcon size={12} strokeWidth={2.1} />
          {iconMeta.label}
        </span>

        <p
          className={`hidden w-32 flex-shrink-0 text-right text-sm font-semibold md:block ${
            isIncome ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {isIncome ? "+" : "-"} PKR {Number(tx.amount).toLocaleString()}
        </p>

        <p className="hidden w-24 flex-shrink-0 text-right text-xs text-slate-500 md:block">
          {new Date(tx.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <div className="col-span-2 flex items-center justify-end gap-1 md:col-span-1 md:w-16 md:flex-shrink-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            onClick={() => setEditOpen(true)}
            className="icon-button"
            aria-label="Edit transaction"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="icon-button hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete transaction"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <TransactionModal
        open={editOpen}
        defaultType={tx.type}
        transaction={tx}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
