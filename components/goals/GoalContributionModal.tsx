"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { toast } from "sonner";

import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { getAppDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";
import type { GoalAccount } from "./GoalModal";

const NO_LINKED_ACCOUNT_ID = "__no_linked_goal_contribution_account__";
const GOAL_ACTION_COLOR = "#157462";

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
  const {
    currency,
    ratesReady,
    fromBaseCurrency,
    getRate,
    formatCurrency,
  } = useCurrency();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(getAppDateKey());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const remainingPkr = Math.max(
    Number(goal.target_amount) - Number(goal.current_amount),
    0,
  );
  const remainingDisplay = fromBaseCurrency(remainingPkr);

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
    if (currency !== "PKR" && !ratesReady) {
      setError("Exchange rates are unavailable. The contribution was not saved.");
      return;
    }

    const exchangeRateToPkr = getRate(currency, "PKR");
    if (exchangeRateToPkr === null) {
      setError("The exchange rate is invalid. The contribution was not saved.");
      return;
    }
    const canonicalAmount = parsedAmount * exchangeRateToPkr;
    if (!Number.isFinite(canonicalAmount) || canonicalAmount > remainingPkr) {
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
      "record_goal_contribution_currency",
      {
        p_goal_id: goal.id,
        p_account_id: accountId || null,
        p_amount_original: parsedAmount,
        p_currency: currency,
        p_exchange_rate_to_pkr: exchangeRateToPkr,
        p_contributed_at: date,
        p_note: note.trim() || null,
      },
    );
    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(
          saveError,
          "Contribution could not be recorded. Try again.",
        ),
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
      <DialogContent
        className={financeModalContentClass}
        style={
          {
            "--finance-action": GOAL_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title="Goal Contribution" />

        <FinanceModalBody>
          <FinanceFormField
            label={`Contribution (${currency})`}
            htmlFor="goal-contribution-amount"
          >
            <Input
              id="goal-contribution-amount"
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
              <p>
                Remaining goal amount: {remainingDisplay === null ? "—" : formatCurrency(remainingPkr)}
              </p>
              <p>Savings allocation only; linked account balance stays unchanged.</p>
            </div>
          </FinanceFormField>

          <FinanceFormField
            label="Linked Account (Optional)"
            htmlFor="goal-contribution-account"
          >
            <AccountSelect
              id="goal-contribution-account"
              value={accountId || NO_LINKED_ACCOUNT_ID}
              onValueChange={(nextAccountId) =>
                setAccountId(
                  nextAccountId === NO_LINKED_ACCOUNT_ID ? "" : nextAccountId,
                )
              }
              accounts={[
                {
                  id: NO_LINKED_ACCOUNT_ID,
                  name: "No linked account",
                  type: "optional",
                  balance: null,
                },
                ...accounts,
              ]}
              placeholder="No linked account"
              ariaLabel="Goal contribution account"
              scrollPicker
            />
          </FinanceFormField>

          <FinanceFormField
            label="Contribution Date"
            htmlFor="goal-contribution-date"
          >
            <DatePicker
              id="goal-contribution-date"
              value={date}
              onChange={setDate}
              placeholder="DD/MM/YYYY"
              ariaLabel="Goal contribution date"
            />
          </FinanceFormField>

          <FinanceFormField
            label="Note (Optional)"
            htmlFor="goal-contribution-note"
          >
            <Textarea
              id="goal-contribution-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Savings allocation note"
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
            loading={loading}
            loadingLabel="Saving contribution..."
            disabled={
              loading ||
              remainingPkr <= 0 ||
              (currency !== "PKR" && !ratesReady)
            }
            className={financePrimaryButtonClass}
            style={{ background: GOAL_ACTION_COLOR }}
          >
            Save Contribution
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
