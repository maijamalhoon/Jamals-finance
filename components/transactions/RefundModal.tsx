"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { BASE_CURRENCY } from "@/lib/currency";
import { getAppDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";

export interface RefundExpense {
  id: string;
  title: string;
  amount: number;
  refundedAmount: number;
  accountId: string;
  categoryId: string;
}

export default function RefundModal({
  open,
  onClose,
  onSuccess,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: RefundExpense;
}) {
  const supabase = createClient();
  const remaining = Math.max(expense.amount - expense.refundedAmount, 0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppDateKey());
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(String(remaining));
    setDate(getAppDateKey());
    setNote("");
    setReference("");
    setError("");
  }, [open, remaining]);

  async function handleSave() {
    if (loading) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a refund amount greater than 0.");
      return;
    }
    if (parsedAmount > remaining) {
      setError("Refunds cannot exceed the amount still available for refund.");
      return;
    }
    if (!date) {
      setError("Choose the date the refund was received.");
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
      setError("Your session has expired. Sign in and try again.");
      return;
    }

    const { error: saveError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "refund",
      amount: parsedAmount,
      account_id: expense.accountId,
      category_id: expense.categoryId,
      date,
      note: note.trim() || `Refund for ${expense.title}`,
      reference: reference.trim() || null,
      refund_of_transaction_id: expense.id,
    });
    setLoading(false);

    if (saveError) {
      setError(getUserMutationError(saveError, "Refund could not be recorded. Try again."));
      toast.error("Failed to record refund");
      return;
    }

    toast.success("Expense refund recorded");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={financeModalContentClass}>
        <FinanceModalHeader
          title="Record Expense Refund"
          description={`Link money returned for ${expense.title} to its original expense.`}
          icon={RotateCcw}
          tone="success"
        />
        <FinanceModalBody>
          <div className="finance-panel-soft p-3 text-xs leading-5 text-text-secondary">
            A refund restores the account balance and reduces expense totals. It is not counted as income.
          </div>
          <FinanceFormField label={`Refund Amount (${BASE_CURRENCY})`} htmlFor="refund-amount">
            <Input
              id="refund-amount"
              type="number"
              min="0.01"
              max={remaining}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="font-semibold"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Available to refund: {remaining.toLocaleString("en-PK")}
            </p>
          </FinanceFormField>
          <FinanceFormField label="Refund Received Date" htmlFor="refund-date">
            <DatePicker
              id="refund-date"
              value={date}
              onChange={setDate}
              placeholder="DD/MM/YYYY"
              ariaLabel="Refund received date"
            />
          </FinanceFormField>
          <FinanceFormField label="Note (Optional)" htmlFor="refund-note">
            <Input
              id="refund-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Merchant or refund reference"
            />
          </FinanceFormField>
          <FinanceFormField label="Reference (Optional)" htmlFor="refund-reference">
            <Input
              id="refund-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Merchant refund or confirmation number"
            />
          </FinanceFormField>
          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>
        <FinanceModalFooter>
          <Button type="button" onClick={onClose} disabled={loading} className={financeCancelButtonClass}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={loading}
            loadingLabel="Saving refund..."
            disabled={loading || remaining <= 0}
          >
            Save Refund
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
