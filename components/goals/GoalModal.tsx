"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
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
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { GOAL_ICONS } from "./goal-icons";
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
  icon: string;
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

export default function GoalModal({ open, onClose, onSuccess, goal, accounts }: Props) {
  const supabase = createClient();
  const isEditing = !!goal;
  const suppliedAccounts = accounts ?? NO_GOAL_ACCOUNTS;

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState("target");
  const [accountId, setAccountId] = useState("");
  const [availableAccounts, setAvailableAccounts] = useState<GoalAccount[]>(suppliedAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setCurrentAmount(String(goal.current_amount));
      setDeadline(goal.deadline || "");
      setIcon(goal.icon || "target");
      setAccountId(goal.account_id || "");
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDeadline("");
      setIcon("target");
      setAccountId("");
    }
    setError("");
  }, [open, goal]);

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
      setError("Starting progress must be between 0 and the target amount.");
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
      icon,
      account_id: accountId || null,
    };

    const { error: e } = isEditing
      ? await supabase.from("goals").update(payload).eq("id", goal!.id)
      : await supabase.from("goals").insert({
          ...payload,
          current_amount: parsedCurrent || 0,
        });

    setLoading(false);

    if (e) {
      setError(getUserMutationError(e, "Goal could not be saved. Try again."));
      toast.error("Failed to save goal");
      return;
    }
    toast.success(isEditing ? "Goal updated!" : "Goal created!");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={financeModalContentClass}>
        <FinanceModalHeader
          title={isEditing ? "Edit Goal" : "Add Goal"}
          description="Set the target, optional linked account, and deadline."
          icon={Target}
          tone="info"
        />

        <FinanceModalBody>
          <div>
            <label className="field-label mb-2">Icon</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {GOAL_ICONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  onClick={() => setIcon(value)}
                  title={label}
                  aria-pressed={icon === value}
                  className={`finance-focus flex h-auto min-h-[58px] flex-col items-center justify-center gap-1 rounded-[14px] border p-2 transition-all ${
                    icon === value
                      ? "border-active bg-active/10 text-active shadow-theme"
                      : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  <Icon size={16} />
                  <span className="max-w-full truncate text-[10px]">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <FinanceFormField label="Goal Name" htmlFor="goal-name">
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New House, Emergency Fund"
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
                min="0.01"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="5000000"
                className="font-semibold"
              />
            </FinanceFormField>

            <FinanceFormField
              label={`Saved So Far (${BASE_CURRENCY})`}
              htmlFor="goal-current-amount"
            >
              <Input
                id="goal-current-amount"
                type="number"
                min="0"
                max={targetAmount || undefined}
                step="any"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="font-semibold"
                disabled={isEditing}
              />
              {isEditing ? (
                <p className="mt-1.5 text-xs text-text-secondary">
                  Use contributions to change saved progress.
                </p>
              ) : null}
            </FinanceFormField>
          </div>

          <FinanceFormField label="Linked Account (Optional)" htmlFor="goal-account">
            <select
              id="goal-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"
            >
              <option value="">No linked account</option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FinanceFormField>

          <FinanceFormField label="Deadline (Optional)" htmlFor="goal-deadline">
            <DatePicker
              id="goal-deadline"
              value={deadline}
              onChange={setDeadline}
              placeholder="DD/MM/YYYY"
              ariaLabel="Goal deadline"
            />
          </FinanceFormField>

          {error && <p className={financeErrorClass}>{error}</p>}
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
            disabled={loading}
            loading={loading}
            loadingLabel="Saving goal…"
            className="primary-action py-3"
          >
            {isEditing ? "Update Goal" : "Create Goal"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
