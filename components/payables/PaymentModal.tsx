"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { getAppDateKey } from "@/lib/dates";
import { BASE_CURRENCY } from "@/lib/currency";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { CircleDollarSign } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Payable {
  id: string;
  person_name: string;
  item_name: string | null;
  reason: string;
  remaining_amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payable: Payable;
  accounts: Account[];
}

export default function PaymentModal({ open, onClose, payable, accounts }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [paidAt, setPaidAt] = useState(getAppDateKey());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ensureDebtCategory(userId: string) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("type", "expense")
      .ilike("name", "Debt repayment")
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing.id as string;

    const { data: created, error: createError } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: "Debt repayment",
        type: "expense",
        color: "#fb7185",
      })
      .select("id")
      .single();

    if (createError) throw createError;
    return created.id as string;
  }

  async function handleSave() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !accountId) {
      setError("Enter a payment amount and select the account used.");
      return;
    }

    if (parsedAmount > Number(payable.remaining_amount)) {
      setError(
        `Payment cannot be more than ${formatCurrency(payable.remaining_amount)}.`,
      );
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Please sign in again.");
      return;
    }

    try {
      const categoryId = await ensureDebtCategory(user.id);
      const transactionNote =
        note.trim() ||
        `Payment returned to ${payable.person_name} for ${payable.reason}`;

      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          amount: parsedAmount,
          category_id: categoryId,
          account_id: accountId,
          date: paidAt,
          note: transactionNote,
          person_name: payable.person_name,
          item_name: payable.item_name,
        })
        .select("id")
        .single();

      if (txError) throw txError;

      const { error: paymentError } = await supabase
        .from("liability_payments")
        .insert({
          liability_id: payable.id,
          user_id: user.id,
          account_id: accountId,
          transaction_id: transaction.id,
          amount: parsedAmount,
          paid_at: paidAt,
          note: note.trim() || null,
        });

      if (paymentError) throw paymentError;

      toast.success("Payment recorded");
      setAmount("");
      setNote("");
      router.refresh();
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to record payment.";
      setError(message);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${financeModalContentClass} sm:max-w-md`}>
        <FinanceModalHeader
          title="Record Payment"
          description="Record a repayment against this payable."
          icon={CircleDollarSign}
          tone="success"
        />

        <FinanceModalBody>
          <div className="finance-panel-soft min-w-0 p-3">
            <p className="text-sm font-semibold text-text-primary">{payable.person_name}</p>
            <p className="mt-1 text-xs text-text-secondary">{payable.reason}</p>
            <p className="mt-2 break-words text-xs text-text-secondary [overflow-wrap:anywhere]">
              Remaining:{" "}
              <span className="font-semibold text-warning">
                {formatCurrency(payable.remaining_amount)}
              </span>
            </p>
          </div>

          <FinanceFormField
            label={`Payment Amount (${BASE_CURRENCY})`}
            htmlFor="payment-amount"
          >
            <Input
              id="payment-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="font-semibold"
            />
          </FinanceFormField>

          <div>
            <label className="field-label">Paid From Account</label>
            <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setAccountId(account.id)}
                  aria-pressed={accountId === account.id}
                  className={`finance-focus rounded-[18px] border px-3 py-2.5 text-left transition-colors ${
                    accountId === account.id
                      ? "border-border bg-card text-text-primary"
                      : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  <span className="block break-words text-sm font-semibold [overflow-wrap:anywhere]">
                    {account.name}
                  </span>
                  <span
                    className={`block text-[11px] ${
                      accountId === account.id ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {account.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <FinanceFormField label="Payment Date" htmlFor="payment-paid-at">
            <DatePicker
              id="payment-paid-at"
              value={paidAt}
              onChange={setPaidAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Payment date"
            />
          </FinanceFormField>

          <FinanceFormField label="Payment Note" htmlFor="payment-note">
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Receipt, method, or short note"
            />
          </FinanceFormField>

          {error && (
            <p className={financeErrorClass}>
              {error}
            </p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !accounts.length}
            className="primary-action w-full py-3"
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
