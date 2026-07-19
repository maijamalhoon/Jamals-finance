"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BASE_CURRENCY } from "@/lib/currency";
import { getAppDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";

const PAYABLE_ACTION_COLOR = "#9B6A13";

interface Account {
  id: string;
  name: string;
  type: string;
  balance?: number | string | null;
  icon_key?: string | null;
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

  async function handleSave() {
    if (loading) return;

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
      const { error: paymentError } = await supabase.rpc(
        "record_liability_payment",
        {
          p_liability_id: payable.id,
          p_account_id: accountId,
          p_amount: parsedAmount,
          p_paid_at: paidAt,
          p_note: note.trim() || null,
        },
      );

      if (paymentError) throw paymentError;

      toast.success("Payment recorded");
      setAmount("");
      setNote("");
      router.refresh();
      onClose();
    } catch (saveError) {
      setError(
        getUserMutationError(
          saveError,
          "Payment could not be recorded. Check the amount and try again.",
        ),
      );
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={financeModalContentClass}
        style={
          {
            "--finance-action": PAYABLE_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title="Record Payment" />

        <FinanceModalBody>
          <FinanceFormField
            label={`Payment Amount (${BASE_CURRENCY})`}
            htmlFor="payment-amount"
          >
            <Input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="font-semibold tabular-nums"
            />
            <div className="mt-1.5 space-y-0.5 text-xs leading-4 text-text-secondary">
              <p className="truncate font-semibold text-text-primary">
                {payable.person_name}
                {payable.reason ? ` · ${payable.reason}` : ""}
              </p>
              <p>
                Remaining payable: {formatCurrency(payable.remaining_amount)}
              </p>
            </div>
          </FinanceFormField>

          <FinanceFormField label="Paid From Account" htmlFor="payment-account">
            <AccountSelect
              id="payment-account"
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              placeholder="Select account"
              emptyText="No accounts found"
              ariaLabel="Payment account"
              scrollPicker
            />
          </FinanceFormField>

          <FinanceFormField label="Payment Date" htmlFor="payment-paid-at">
            <DatePicker
              id="payment-paid-at"
              value={paidAt}
              onChange={setPaidAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Payment date"
            />
          </FinanceFormField>

          <FinanceFormField label="Note (Optional)" htmlFor="payment-note">
            <Textarea
              id="payment-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Receipt, method, or short note"
              rows={2}
              className="resize-none"
            />
          </FinanceFormField>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !accounts.length}
            loading={loading}
            loadingLabel="Recording payment…"
            className={financePrimaryButtonClass}
            style={{ background: PAYABLE_ACTION_COLOR }}
          >
            Record Payment
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
