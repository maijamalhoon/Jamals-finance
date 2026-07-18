"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { getGoalPresentation } from "./goal-icons";
import { BASE_CURRENCY } from "@/lib/currency";
import { getUserMutationError } from "@/lib/user-errors";

export interface GoalAccount {
  id: string;
  name: string;
  type: string;
}

export interface ExistingGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  account_id?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: ExistingGoal;
  accounts?: GoalAccount[];
}

const NO_GOAL_ACCOUNTS: GoalAccount[] = [];
const GOAL_ACTION_COLOR = "#157462";

export default function GoalModal({
  open,
  onClose,
  onSuccess,
  goal,
  accounts,
}: Props) {
  const supabase = createClient();
  const isEditing = Boolean(goal);
  const suppliedAccounts = accounts ?? NO_GOAL_ACCOUNTS;

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [accountId, setAccountId] = useState("");
  const [availableAccounts, setAvailableAccounts] =
    useState<GoalAccount[]>(suppliedAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const autoPresentation = getGoalPresentation({ name });

  useEffect(() => {
    if (!open) return;

    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setCurrentAmount(String(goal.current_amount));
      setDeadline(goal.deadline || "");
      setAccountId(goal.account_id || "");
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDeadline("");
      setAccountId("");
    }

    setError("");
  }, [goal, open]);

  useEffect(() => {
    setAvailableAccounts(suppliedAccounts);
    if (!open || suppliedAccounts.length > 0) return;

    let active = true;
    void createClient()
      .from("accounts")
      .select("id, name, type")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        if (active && data) setAvailableAccounts(data as GoalAccount[]);
      });

    return () => {
      active = false;
    };
  }, [open, suppliedAccounts]);

  async function handleSave() {
    if (loading) return;

    const parsedTarget = Number(targetAmount);
    const parsedCurrent = Number(currentAmount);

    if (!name.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError("Goal name and target amount are required.");
      return;
    }

    if (
      !isEditing &&
      (!Number.isFinite(parsedCurrent) ||
        parsedCurrent < 0 ||
        parsedCurrent > parsedTarget)
    ) {
      setError("Saved amount must be between 0 and the target amount.");
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("Your session has expired. Sign in and try again.");
      return;
    }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      target_amount: parsedTarget,
      deadline: deadline || null,
      icon: autoPresentation.entry.value,
      account_id: accountId || null,
    };

    const { error: saveError } = isEditing
      ? await supabase.from("goals").update(payload).eq("id", goal!.id)
      : await supabase.from("goals").insert({
          ...payload,
          current_amount: parsedCurrent || 0,
        });

    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(saveError, "Goal could not be saved. Try again."),
      );
      toast.error("Failed to save goal");
      return;
    }

    toast.success(isEditing ? "Goal updated!" : "Goal created!");
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
        <FinanceModalHeader title={isEditing ? "Edit Goal" : "Goal"} />

        <FinanceModalBody>
          <FinanceFormField label="Goal Name" htmlFor="goal-name">
            <Input
              id="goal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. New house, car, emergency fund"
            />
          </FinanceFormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FinanceFormField
              label={`Target Amount (${BASE_CURRENCY})`}
              htmlFor="goal-target-amount"
            >
              <Input
                id="goal-target-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                placeholder="5000000"
                className="font-semibold tabular-nums"
              />
            </FinanceFormField>

            <FinanceFormField
              label={`Saved Amount (${BASE_CURRENCY})`}
              htmlFor="goal-current-amount"
            >
              <Input
                id="goal-current-amount"
                type="number"
                inputMode="decimal"
                min="0"
                max={targetAmount || undefined}
                step="any"
                value={currentAmount}
                onChange={(event) => setCurrentAmount(event.target.value)}
                placeholder="0"
                className="font-semibold tabular-nums"
                disabled={isEditing}
              />
            </FinanceFormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FinanceFormField label="Account" htmlFor="goal-account">
              <select
                id="goal-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"
              >
                <option value="">No linked account</option>
                {availableAccounts.map((availableAccount) => (
                  <option key={availableAccount.id} value={availableAccount.id}>
                    {availableAccount.name}
                  </option>
                ))}
              </select>
            </FinanceFormField>

            <FinanceFormField label="Deadline" htmlFor="goal-deadline">
              <DatePicker
                id="goal-deadline"
                value={deadline}
                onChange={setDeadline}
                placeholder="DD/MM/YYYY"
                ariaLabel="Goal deadline"
              />
            </FinanceFormField>
          </div>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            loading={loading}
            loadingLabel="Saving goal…"
            className={financePrimaryButtonClass}
            style={{ background: GOAL_ACTION_COLOR }}
          >
            {isEditing ? "Update Goal" : "Create Goal"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
