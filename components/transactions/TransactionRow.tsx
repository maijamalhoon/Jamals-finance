"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import TransactionModal, {
  ExistingTransaction,
} from "@/components/dashboard/TransactionModal";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase/client";
import {
  getTransactionIconMeta,
  getTransactionPrefix,
  getTransactionToneClass,
} from "@/lib/transaction-icons";

type TransactionType =
  | "income"
  | "expense"
  | "investment"
  | "goal"
  | "refund"
  | "transfer";

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
  goal_contribution_id?: string | null;
  categories: {
    id?: string | null;
    name?: string | null;
    color?: string | null;
    icon_key?: string | null;
    type?: string | null;
    parent?: { name?: string | null } | null;
  } | null;
  accounts: { name?: string | null } | null;
};

function normalizeType(type?: string | null): TransactionType {
  if (
    type === "income" ||
    type === "expense" ||
    type === "investment" ||
    type === "goal" ||
    type === "refund" ||
    type === "transfer"
  ) {
    return type;
  }

  return "transfer";
}

function getCategoryLabel(tx: Transaction, type: TransactionType) {
  if (type === "transfer") return "Transfer";
  if (type === "goal") return tx.item_name || "Goal contribution";
  if (type === "investment") {
    return tx.item_name || tx.categories?.name || "Investment";
  }
  if (type === "refund") return tx.categories?.name || "Expense refund";

  const parentName = tx.categories?.parent?.name;
  const categoryName = tx.categories?.name;
  if (parentName && categoryName) return `${parentName} / ${categoryName}`;

  if (categoryName) return categoryName;
  if (type === "income") return tx.source_name || "Income";
  return "Expense";
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const { formatCurrency } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const type = normalizeType(tx.type);
  const iconMeta = getTransactionIconMeta({
    type,
    note: tx.note,
    categoryName: tx.categories?.name,
    categoryIconKey: tx.categories?.icon_key,
    parentCategoryName: tx.categories?.parent?.name,
    sourceName: tx.source_name,
    itemName: tx.item_name,
  });
  const TransactionIcon = iconMeta.icon;
  const categoryLabel = getCategoryLabel(tx, type);
  const amount = Number(tx.amount ?? 0);
  const displayAmount = `${getTransactionPrefix(type)}${formatCurrency(
    Number.isFinite(amount) ? Math.abs(amount) : 0,
  )}`;
  const receiptHref = tx.id
    ? `/dashboard/transactions/${encodeURIComponent(String(tx.id))}`
    : "/dashboard/transactions";
  const isTransactionsPage = pathname === "/dashboard/transactions";

  const canEdit =
    (type === "income" || type === "expense") &&
    iconMeta.semanticType !== "payable";
  const canDelete = type !== "investment";

  async function deleteGoalContribution() {
    if (!tx.goal_contribution_id) {
      throw new Error("This goal contribution is missing its ledger link.");
    }

    const { error } = await supabase.rpc("delete_goal_contribution", {
      p_contribution_id: tx.goal_contribution_id,
    });
    if (error) throw error;
  }

  async function deletePayablePayment() {
    const { error } = await supabase.rpc(
      "delete_liability_payment_transaction",
      {
        p_transaction_id: tx.id,
      },
    );
    if (error) throw error;
  }

  async function handleDelete() {
    if (!tx.id || deleting) return;

    const confirmed = confirm(
      iconMeta.semanticType === "goal"
        ? "Delete this goal contribution? Goal progress will be reduced by the same amount."
        : iconMeta.semanticType === "payable"
          ? "Delete this payable payment? The payable balance will be restored."
          : "Delete this transaction? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      if (iconMeta.semanticType === "goal") {
        await deleteGoalContribution();
      } else if (iconMeta.semanticType === "payable") {
        await deletePayablePayment();
      } else {
        const tableName =
          type === "transfer" ? "account_transfers" : "transactions";
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq("id", tx.id);
        if (error) throw error;
      }

      toast.success("Transaction deleted.");
      router.refresh();
    } catch {
      toast.error("Could not delete this transaction. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function openReceiptFromRow(target: EventTarget | null) {
    if (!isTransactionsPage) return;
    if (target instanceof HTMLElement && target.closest("button")) return;
    router.push(receiptHref);
  }

  return (
    <>
      <article
        data-transaction-row
        className={`group grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border/55 px-2 py-3.5 last:border-b-0 sm:px-3 md:grid-cols-[40px_minmax(0,1fr)_minmax(110px,auto)_auto] md:gap-x-4 ${isTransactionsPage ? "cursor-pointer" : ""}`}
        onClick={(event) => openReceiptFromRow(event.target)}
        onKeyDown={(event) => {
          if (
            !isTransactionsPage ||
            (event.key !== "Enter" && event.key !== " ")
          ) {
            return;
          }

          event.preventDefault();
          openReceiptFromRow(event.target);
        }}
        role={isTransactionsPage ? "link" : undefined}
        tabIndex={isTransactionsPage ? 0 : undefined}
        aria-label={
          isTransactionsPage
            ? `Open receipt for ${categoryLabel}`
            : undefined
        }
      >
        <span
          className="grid size-10 shrink-0 place-items-center"
          style={{ color: iconMeta.accent }}
          aria-label={`${iconMeta.label} icon`}
        >
          <TransactionIcon
            size={22}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
        </span>

        <p className="min-w-0 truncate text-sm font-bold text-text-primary">
          {categoryLabel}
        </p>

        <p
          className={`max-w-[44vw] shrink-0 truncate text-right text-sm font-black tracking-[-0.015em] tabular-nums sm:max-w-none ${getTransactionToneClass(
            type,
            iconMeta.semanticType,
          )}`}
          title={displayAmount}
        >
          {displayAmount}
        </p>

        <div className="col-start-2 col-span-2 flex items-center justify-end gap-1.5 md:col-span-1 md:col-start-auto">
          {!isTransactionsPage ? (
            <button
              onClick={() => router.push(receiptHref)}
              className="finance-focus grid size-9 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-active"
              aria-label={`View ${categoryLabel}`}
              title="View"
              type="button"
            >
              <Eye size={15} strokeWidth={2.3} />
            </button>
          ) : null}

          {canEdit ? (
            <button
              onClick={() => setEditOpen(true)}
              className="finance-focus grid size-9 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-active"
              aria-label={`Edit ${categoryLabel}`}
              title="Edit"
              type="button"
            >
              <Pencil size={15} strokeWidth={2.3} />
            </button>
          ) : null}

          {canDelete ? (
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="finance-focus grid size-9 place-items-center rounded-full text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={`Delete ${categoryLabel}`}
              title="Delete"
              type="button"
            >
              <Trash2 size={15} strokeWidth={2.3} />
            </button>
          ) : null}
        </div>
      </article>

      {canEdit ? (
        <TransactionModal
          open={editOpen}
          defaultType={type as "income" | "expense"}
          transaction={tx as ExistingTransaction}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
