"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { PAYABLE_QUICK_REASONS } from "@/lib/finance-options";
import { HandCoins } from "lucide-react";

export interface ExistingPayable {
  id: string;
  person_name: string;
  item_name: string | null;
  reason: string;
  original_value: number;
  due_date: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payable?: ExistingPayable;
}

export default function PayableModal({ open, onClose, payable }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isEditing = !!payable;

  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
  const [reason, setReason] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPersonName(payable?.person_name ?? "");
    setItemName(payable?.item_name ?? "");
    setReason(payable?.reason ?? "");
    setOriginalValue(payable ? String(payable.original_value) : "");
    setDueDate(payable?.due_date ?? "");
    setNotes(payable?.notes ?? "");
    setError("");
  }, [open, payable]);

  async function handleSave() {
    const value = Number(originalValue);
    if (!personName.trim() || !reason.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Person, reason, and value greater than 0 are required.");
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

    const payload = {
      user_id: user.id,
      person_name: personName.trim(),
      item_name: itemName.trim() || null,
      reason: reason.trim(),
      original_value: value,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    };

    const { error: saveError } =
      isEditing ?
        await supabase.from("liabilities").update(payload).eq("id", payable.id)
      : await supabase.from("liabilities").insert(payload);

    setLoading(false);

    if (saveError) {
      setError(saveError.message);
      toast.error("Failed to save payable");
      return;
    }

    toast.success(isEditing ? "Payable updated" : "Payable added");
    router.refresh();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${financeModalContentClass} sm:max-w-lg`}>
        <FinanceModalHeader
          title={isEditing ? "Edit Payable" : "Add Payable"}
          description="Save payable person, amount, reason, due date, and notes."
          icon={HandCoins}
          tone="warning"
        />

        <FinanceModalBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Person Name</label>
              <input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Who do you need to pay?"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Item / Amount Name</label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Phone, cash, loan, etc."
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why was this taken?"
              className="field-input"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYABLE_QUICK_REASONS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setReason(label)}
                  className="finance-focus inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-text-secondary hover:bg-hover hover:text-text-primary"
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Actual Value (PKR)</label>
              <input
                type="number"
                value={originalValue}
                onChange={(e) => setOriginalValue(e.target.value)}
                placeholder="0"
                className="field-input font-semibold"
              />
            </div>
            <div>
              <label className="field-label">Due Date</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agreement details, reminders, or partial payment notes"
              className="field-input min-h-24 resize-none"
            />
          </div>

          {error && (
            <p className={financeErrorClass}>
              {error}
            </p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter className="grid-cols-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="primary-action w-full py-3"
          >
            {loading ? "Saving..." : isEditing ? "Update Payable" : "Save Payable"}
          </button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
