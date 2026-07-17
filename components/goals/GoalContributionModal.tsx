"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
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
import { BASE_CURRENCY } from "@/lib/currency";
import { getAppDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";
import type { GoalAccount } from "./GoalModal";

export default function GoalContributionModal({
  open,
  onClose,
  onSuccess,
  goal,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal: {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    account_id?: string | null;
  };
  accounts: GoalAccount[];
}) {
  const supabase = createClient();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(getAppDateKey());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const remaining = Math.max(
    Number(goal.target_amount) - Number(goal.current_amount),
    0,
  );

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setAccountId(goal.account_id || "");
    setDate(getAppDateKey());
    setNote("");
    setError("");
  }, [goal.account_id, open]);

  async function handleSave() {
    if (loading) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a contribution amount greater than 0.");
      return;
    }
    if (parsedAmount > remaining) {
      setError("Contribution cannot be greater than the remaining goal amount.");
      return;
    }
    if (!date) {
      setError("Choose a contribution date.");
      return;
    }

    setLoading(true);
    setError("");
    const { error: saveError } = await supabase.rpc(
      "record_goal_contribution",
      {
        p_goal_id: goal.id,
        p_account_id: accountId || null,
        p_amount: parsedAmount,
        p_contributed_at: date,
        p_note: note.trim() || null,
      },
    );
    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(saveError, "Contribution could not be recorded. Try again."),
      );
      toast.error("Failed to record contribution");
      return;
    }

    toast.success("Goal contribution recorded.");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={financeModalContentClass}>
        <FinanceModalHeader
          title="Add Goal Contribution"
          description={`Allocate progress to ${goal.name}.`}
          icon={CircleDollarSign}
          tone="success"
        />

        <FinanceModalBody>
          <div className="finance-panel-soft p-3 text-xs leading-5 text-text-secondary">
            This records a savings allocation only. It does not count as an expense or change the linked account balance.
          </div>

          <FinanceFormField
            label={`Contribution (${BASE_CURRENCY})`}
            htmlFor="goal-contribution-amount"
          >
            <Input
              id="goal-contribution-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="font-semibold"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Remaining goal amount: {remaining.toLocaleString("en-PK")}
            </p>
          </FinanceFormField>

          <FinanceFormField label="Linked Account (Optional)" htmlFor="goal-contribution-account">
            <select
              id="goal-contribution-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"
            >
              <option value="">No linked account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FinanceFormField>

          <FinanceFormField label="Contribution Date" htmlFor="goal-contribution-date">
            <DatePicker
              id="goal-contribution-date"
              value={date}
              onChange={setDate}
              placeholder="DD/MM/YYYY"
              ariaLabel="Goal contribution date"
            />
          </FinanceFormField>

          <FinanceFormField label="Note (Optional)" htmlFor="goal-contribution-note">
            <Input
              id="goal-contribution-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Savings allocation note"
            />
          </FinanceFormField>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
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
            loading={loading}
            loadingLabel="Saving contribution..."
            disabled={loading || remaining <= 0}
          >
            Save Contribution
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
