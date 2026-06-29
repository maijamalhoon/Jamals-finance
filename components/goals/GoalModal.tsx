"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { GOAL_ICONS } from "./goal-icons";

export interface ExistingGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: ExistingGoal;
}

export default function GoalModal({ open, onClose, onSuccess, goal }: Props) {
  const supabase = createClient();
  const isEditing = !!goal;

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState("target");
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
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDeadline("");
      setIcon("target");
    }
    setError("");
  }, [open, goal]);

  async function handleSave() {
    if (!name.trim() || !targetAmount) {
      setError("Goal name and target amount are required.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user!.id,
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
      icon,
    };

    const { error: e } = isEditing
      ? await supabase.from("goals").update(payload).eq("id", goal!.id)
      : await supabase.from("goals").insert(payload);

    setLoading(false);

    if (e) {
      setError("Failed to save. Try again.");
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
          description="Enter goal name, target amount, saved amount, and deadline."
          icon={Target}
          tone="info"
        />

        <FinanceModalBody>
          <div>
            <label className="field-label mb-2">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIcon(value)}
                  title={label}
                  className={`finance-focus flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[14px] border p-2 transition-all ${
                    icon === value
                      ? "border-active bg-active/10 text-active shadow-theme"
                      : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  <Icon size={16} />
                  <span className="max-w-full truncate text-[9px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Goal Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New House, Emergency Fund"
              className="field-input"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Target Amount (PKR)</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="5000000"
                className="field-input font-semibold"
              />
            </div>

            <div>
              <label className="field-label">Saved So Far (PKR)</label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="field-input font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Deadline (Optional)</label>
            <DatePicker
              value={deadline}
              onChange={setDeadline}
              placeholder="Select deadline"
            />
          </div>

          {error && <p className={financeErrorClass}>{error}</p>}
        </FinanceModalBody>

        <FinanceModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="primary-action py-3"
          >
            {loading ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
          </button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
