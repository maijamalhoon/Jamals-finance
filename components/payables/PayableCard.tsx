"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CircleDollarSign,
  Pencil,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  formatPKR,
  getPayableStatus,
  PAYABLE_STATUS_META,
} from "@/lib/finance-options";
import PayableModal, { ExistingPayable } from "./PayableModal";
import PaymentModal from "./PaymentModal";

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

export default function PayableCard({
  payable,
  accounts,
}: {
  payable: Payable;
  accounts: Account[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayStatus = getPayableStatus(payable);
  const meta = PAYABLE_STATUS_META[displayStatus] ?? PAYABLE_STATUS_META.pending;
  const paid = Number(payable.paid_amount ?? 0);
  const total = Number(payable.original_value ?? 0);
  const remaining = Number(payable.remaining_amount ?? 0);
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const payments = payable.liability_payments ?? [];

  async function handleDelete() {
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
      <article className="finance-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.className}`}
              >
                {meta.label}
              </span>
              {payable.due_date && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-slate-400">
                  <CalendarClock size={12} />
                  Due {new Date(payable.due_date).toLocaleDateString()}
                </span>
              )}
            </div>

            <h3 className="mt-3 break-words text-lg font-bold text-text-primary">
              {payable.person_name}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {payable.reason}
              {payable.item_name ? ` - ${payable.item_name}` : ""}
            </p>
            {payable.notes && (
              <p className="mt-2 rounded-2xl border border-border bg-surface-secondary p-3 text-xs leading-5 text-slate-500">
                {payable.notes}
              </p>
            )}
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:min-w-[360px]">
            <div className="rounded-2xl border border-border bg-surface-secondary p-3">
              <p className="text-[11px] text-slate-500">Actual Value</p>
              <p className="mt-1 break-words text-sm font-bold text-text-primary">
                {formatPKR(total)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-secondary p-3">
              <p className="text-[11px] text-slate-500">Remaining</p>
              <p className="mt-1 break-words text-sm font-bold text-amber-200">
                {formatPKR(remaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Paid {formatPKR(paid)}</span>
            <span className="font-semibold text-slate-300">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="motion-progress-fill h-full rounded-full bg-card transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPaymentOpen(true)}
              disabled={remaining <= 0 || !accounts.length}
              className="success-action px-3 py-2 text-xs"
            >
              <CircleDollarSign size={14} />
              Record Payment
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="primary-action bg-surface-secondary px-3 py-2 text-xs text-text-primary shadow-none hover:bg-hover"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="danger-action px-3 py-2 text-xs"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Added {new Date(payable.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText size={14} className="text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">Payment History</p>
          </div>

          {payments.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface-secondary p-3 text-xs text-slate-500">
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-secondary p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatPKR(payment.amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {payment.accounts?.name ?? "Account removed"} -{" "}
                      {new Date(payment.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                  {payment.note && (
                    <p className="max-w-md text-xs leading-5 text-slate-400">
                      {payment.note}
                    </p>
                  )}
                </div>
              ))}
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
