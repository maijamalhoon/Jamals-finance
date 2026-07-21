"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { getEditableMoneyValue } from "@/lib/currency-input";
import { getAppDateKey } from "@/lib/dates";
import { getUserMutationError } from "@/lib/user-errors";

const PAYABLE_ACTION_COLOR = "#9B6A13";

interface PayableAccount {
  id: string;
  name: string;
  type: string;
  balance: number | string | null;
  icon_key?: string | null;
}

export interface ExistingPayable {
  id: string;
  person_name: string;
  item_name: string | null;
  reason: string;
  original_value: number;
  original_value_input?: number | string | null;
  currency?: string | null;
  exchange_rate_to_pkr?: number | string | null;
  due_date: string | null;
  notes: string | null;
  account_id?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payable?: ExistingPayable;
}

function formatInputValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toFixed(8).replace(/\.?0+$/, "");
}

export default function PayableModal({ open, onClose, payable }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isEditing = !!payable;
  const { currency, rates, ratesReady } = useCurrency();

  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
  const [reason, setReason] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dueDate, setDueDate] = useState(getAppDateKey());
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<PayableAccount[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const editablePrincipal = payable
      ? getEditableMoneyValue({
          amountPkr: payable.original_value,
          originalAmount: payable.original_value_input,
          originalCurrency: payable.currency,
          displayCurrency: currency,
          rates,
        })
      : null;

    setPersonName(payable?.person_name ?? "");
    setItemName(payable?.item_name ?? "");
    setReason(payable?.reason ?? "");
    setOriginalValue(payable ? formatInputValue(editablePrincipal) : "");
    setAccountId(payable?.account_id ?? "");
    setDueDate(payable?.due_date ?? getAppDateKey());
    setNotes(payable?.notes ?? "");
    setError("");
  }, [currency, open, payable, rates]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadAccounts() {
      setLoadingOptions(true);
      const { data, error: accountsError } = await supabase
        .from("accounts")
        .select("id, name, type, balance, icon_key")
        .eq("status", "active")
        .order("name");

      if (cancelled) return;
      setLoadingOptions(false);

      if (accountsError) {
        setAccounts([]);
        setAccountId("");
        setError("Accounts could not be loaded. Check your connection and try again.");
        return;
      }

      const nextAccounts = (data ?? []) as PayableAccount[];
      setAccounts(nextAccounts);
      setAccountId((current) => {
        const preferred = payable?.account_id || current;
        return nextAccounts.some((account) => account.id === preferred)
          ? preferred
          : nextAccounts[0]?.id ?? "";
      });
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [open, payable?.account_id, supabase]);

  async function handleSave() {
    if (loading) return;

    if (loadingOptions) {
      setError("Please wait while accounts load.");
      return;
    }

    const value = Number(originalValue);
    if (
      !personName.trim() ||
      !reason.trim() ||
      !accountId ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError("Amount, name, purpose, and account are required.");
      return;
    }
    if (currency !== "PKR" && !ratesReady) {
      setError("Exchange rates are unavailable. The payable was not saved.");
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
      account_id: accountId,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    };

    const { error: saveError } = isEditing
      ? await supabase.from("liabilities").update(payload).eq("id", payable.id)
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
        className={financeModalContentClass}
        style={
          {
            "--finance-action": PAYABLE_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title={isEditing ? "Edit Payable" : "Add Payable"} />

        <FinanceModalBody>
          <FinanceFormField
            label={`Amount (${currency})`}
            htmlFor="payable-original-value"
          >
            <Input
              id="payable-original-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={originalValue}
              onChange={(event) => setOriginalValue(event.target.value)}
              placeholder="0"
              className="font-semibold tabular-nums"
            />
          </FinanceFormField>

          <FinanceFormField label="Name" htmlFor="payable-person-name">
            <Input
              id="payable-person-name"
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              placeholder="Who do you need to pay?"
              autoComplete="off"
            />
          </FinanceFormField>

          <FinanceFormField label="Purpose" htmlFor="payable-reason">
            <Input
              id="payable-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What is this payable for?"
            />
          </FinanceFormField>

          <FinanceFormField label="Account" htmlFor="payable-account">
            <AccountSelect
              id="payable-account"
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              emptyText="No accounts found"
              ariaLabel="Payable account"
              scrollPicker
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

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              loading ||
              loadingOptions ||
              (currency !== "PKR" && !ratesReady)
            }
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
