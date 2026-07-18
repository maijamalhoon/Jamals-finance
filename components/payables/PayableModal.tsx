"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { PAYABLE_QUICK_REASONS } from "@/lib/finance-options";
import { BASE_CURRENCY } from "@/lib/currency";
import { getUserMutationError } from "@/lib/user-errors";

const PAYABLE_ACTION_COLOR = "#9B6A13";

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
    if (loading) return;

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
      setError(
        getUserMutationError(saveError, "Payable could not be saved. Try again."),
      );
      toast.error("Failed to save payable");
      return;
    }

    toast.success(isEditing ? "Payable updated" : "Payable added");
    router.refresh();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem]`}
        style={
          {
            "--finance-action": PAYABLE_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title={isEditing ? "Edit Payable" : "Add Payable"} />

        <FinanceModalBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <FinanceFormField label="Person Name" htmlFor="payable-person-name">
              <Input
                id="payable-person-name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Who do you need to pay?"
              />
            </FinanceFormField>
            <FinanceFormField label="Item / Amount Name" htmlFor="payable-item-name">
              <Input
                id="payable-item-name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Phone, cash, loan, etc."
              />
            </FinanceFormField>
          </div>

          <FinanceFormField label="Reason" htmlFor="payable-reason">
            <Input
              id="payable-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why was this taken?"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYABLE_QUICK_REASONS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setReason(label)}
                  className="finance-focus inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-text-secondary hover:bg-hover hover:text-text-primary"
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </FinanceFormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FinanceFormField
              label={`Actual Value (${BASE_CURRENCY})`}
              htmlFor="payable-original-value"
            >
              <Input
                id="payable-original-value"
                type="number"
                value={originalValue}
                onChange={(e) => setOriginalValue(e.target.value)}
                placeholder="0"
                className="font-semibold"
              />
            </FinanceFormField>
            <FinanceFormField label="Due Date" htmlFor="payable-due-date">
              <DatePicker
                id="payable-due-date"
                value={dueDate}
                onChange={setDueDate}
                placeholder="DD/MM/YYYY"
                ariaLabel="Payable due date"
              />
            </FinanceFormField>
          </div>

          <FinanceFormField label="Notes" htmlFor="payable-notes">
            <Textarea
              id="payable-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agreement details, reminders, or partial payment notes"
              className="min-h-24 resize-none"
            />
          </FinanceFormField>

          {error && (
            <p className={financeErrorClass}>
              {error}
            </p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter className="grid-cols-[0.78fr_1.22fr]">
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
            loadingLabel="Saving payable…"
            className={financePrimaryButtonClass}
            style={{ background: PAYABLE_ACTION_COLOR }}
          >
            {isEditing ? "Update Payable" : "Save Payable"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
