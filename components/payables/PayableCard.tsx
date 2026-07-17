"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  ReceiptText,
  Trash2,
} from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getPayableStatus,
  PAYABLE_STATUS_META,
} from "@/lib/finance-options";
import PayableModal, { ExistingPayable } from "./PayableModal";
import PaymentModal from "./PaymentModal";
import { useCurrency } from "@/components/currency/CurrencyProvider";

interface Payment {
  id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  accounts: { name: string; type: string } | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

export interface Payable extends ExistingPayable {
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
  liability_payments?: Payment[];
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending:
    "border-warning/30 bg-warning/10 text-warning",
  partial: "border-info/30 bg-info/10 text-info",
  overdue: "border-danger/30 bg-danger/10 text-danger",
  completed:
    "border-success/30 bg-success/10 text-success",
};

const STATUS_PROGRESS_COLOR: Record<string, string> = {
  pending: "var(--warning)",
  partial: "var(--info)",
  overdue: "var(--danger)",
  completed: "var(--success)",
};

export default function PayableCard({
  payable,
  accounts,
}: {
  payable: Payable;
  accounts: Account[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayStatus = getPayableStatus(payable);
  const meta = PAYABLE_STATUS_META[displayStatus] ?? PAYABLE_STATUS_META.pending;
  const paid = Number(payable.paid_amount ?? 0);
  const total = Number(payable.original_value ?? 0);
  const remaining = Number(payable.remaining_amount ?? 0);
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const payments = payable.liability_payments ?? [];
  const statusClass = STATUS_BADGE_CLASS[displayStatus] ?? STATUS_BADGE_CLASS.pending;
  const progressColor =
    STATUS_PROGRESS_COLOR[displayStatus] ?? STATUS_PROGRESS_COLOR.pending;

  async function handleDelete() {
    if (deleting) return;
    if (!confirm(`Delete payable for ${payable.person_name}?`)) return;
    setDeleting(true);
    const { error } = await supabase
      .from("liabilities")
      .delete()
      .eq("id", payable.id);

    if (error) {
      toast.error("Failed to delete payable");
      setDeleting(false);
      return;
    }

    toast.success("Payable deleted");
    router.refresh();
  }

  return (
    <>
      <article className="finance-panel finance-hover-lift min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
              >
                {meta.label}
              </span>
              {payable.due_date && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-xs text-text-secondary">
                  <CalendarClock size={12} />
                  Due {new Date(payable.due_date).toLocaleDateString()}
                </span>
              )}
            </div>

            <h3 className="mt-3 break-words text-lg font-bold text-text-primary sm:text-xl">
              {payable.person_name}
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {payable.reason}
              {payable.item_name ? ` - ${payable.item_name}` : ""}
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">
              Paid{" "}
              <span className="text-success">
                <CountedAmount amount={formatCurrency(paid)} />
              </span>
            </p>
            {payable.notes && (
              <p className="finance-panel-soft mt-3 p-3 text-xs leading-5 text-text-secondary">
                {payable.notes}
              </p>
            )}
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 lg:min-w-[360px]">
            <div className="finance-panel-soft min-w-0 p-3">
              <p className="text-[11px] font-medium text-text-secondary">Actual Value</p>
              <p className="mt-1 break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
                <CountedAmount amount={formatCurrency(total)} />
              </p>
            </div>
            <div className="finance-panel-soft min-w-0 p-3">
              <p className="text-[11px] font-medium text-text-secondary">Remaining</p>
              <p className="mt-1 break-words text-sm font-bold text-warning [overflow-wrap:anywhere]">
                <CountedAmount amount={formatCurrency(remaining)} />
              </p>
            </div>
            <div className="finance-panel-soft col-span-2 min-w-0 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-text-secondary">Progress</span>
                <span className="font-semibold text-text-primary">
                  <CountedAmount amount={`${Math.round(progress)}%`} />
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="motion-progress-fill h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPaymentOpen(true)}
              disabled={remaining <= 0 || !accounts.length}
              className="success-action min-h-11 rounded-full px-3 py-2 text-xs"
            >
              <CircleDollarSign size={14} />
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="primary-action min-h-11 rounded-full bg-surface-secondary px-3 py-2 text-xs text-text-primary shadow-none hover:bg-hover"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-busy={deleting || undefined}
              className="danger-action min-h-11 rounded-full px-3 py-2 text-xs hover:border-danger/35 hover:bg-danger/10"
            >
              {deleting ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" size={14} aria-hidden="true" />
              ) : (
                <Trash2 size={14} aria-hidden="true" />
              )}
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            Added {new Date(payable.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="mt-5 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="finance-focus flex w-full items-center justify-between gap-3 rounded-[var(--oneui-tile-radius)] px-1 py-2 text-left transition-colors hover:bg-hover sm:px-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ReceiptText size={14} className="text-text-secondary" />
              <span className="text-sm font-semibold text-text-primary">
                Payment History
              </span>
              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-text-secondary">
                {payments.length}
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`text-text-secondary transition-transform ${historyOpen ? "rotate-180" : ""}`}
            />
          </button>

          {historyOpen && (
            <div className="mt-2">
              {payments.length === 0 ? (
                <p className="rounded-[var(--oneui-tile-radius)] border border-dashed border-border bg-surface-secondary/70 p-3 text-xs text-text-secondary">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="finance-panel-soft flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {payment.accounts?.name ?? "Account removed"} -{" "}
                          {new Date(payment.paid_at).toLocaleDateString()}
                        </p>
                      </div>
                      {payment.note && (
                        <p className="max-w-md text-xs leading-5 text-text-secondary">
                          {payment.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      <PayableModal
        open={editOpen}
        payable={payable}
        onClose={() => setEditOpen(false)}
      />
      <PaymentModal
        open={paymentOpen}
        payable={payable}
        accounts={accounts}
        onClose={() => setPaymentOpen(false)}
      />
    </>
  );
}
