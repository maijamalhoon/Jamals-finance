"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/date-picker";
import { getAppDateKey } from "@/lib/dates";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AccountSelect from "@/components/accounts/AccountSelect";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransferModal({ open, onClose, onSuccess }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(getAppDateKey());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toAccounts = accounts.filter((account) => account.id !== fromAccountId);

  useEffect(() => {
    if (!open) return;

    async function loadAccounts() {
      setLoading(true);
      const { data } = await supabase
        .from("accounts")
        .select("id, name, type, balance")
        .order("name");

      const rows = (data ?? []) as Account[];
      setAccounts(rows);
      setFromAccountId(rows[0]?.id || "");
      setToAccountId(
        rows.find((account) => account.id !== rows[0]?.id)?.id || "",
      );
      setLoading(false);
    }

    setAmount("");
    setNote("");
    setTransferDate(getAppDateKey());
    setError("");
    loadAccounts();
  }, [open, supabase]);

  async function handleSave() {
    const parsedAmount = Number(amount);

    if (!fromAccountId || !toAccountId) {
      setError("Select both accounts.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("From and to account must be different.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a transfer amount greater than 0.");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("Please sign in again.");
      return;
    }

    const { error: saveError } = await supabase
      .from("account_transfers")
      .insert({
        user_id: user.id,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: parsedAmount,
        transfer_date: transferDate,
        note: note.trim() || null,
      });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      toast.error("Failed to record transfer");
      return;
    }

    toast.success("Transfer recorded");
    router.refresh();
    onSuccess?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={financeModalContentClass}>
        <FinanceModalHeader
          title="Transfer Money"
          description="Select different accounts, amount, date, and an optional note."
          icon={ArrowLeftRight}
          tone="info"
        />

        <FinanceModalBody>
          {loading ? (
            <div className="finance-skeleton h-40" />
          ) : accounts.length < 2 ? (
            <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
              Add at least two accounts before recording a transfer.
            </div>
          ) : (
            <>
              <div>
                <label className="field-label">From Account</label>
                <AccountSelect
                  value={fromAccountId}
                  onValueChange={(nextFromId) => {
                    setFromAccountId(nextFromId);
                    if (toAccountId === nextFromId) {
                      setToAccountId(
                        accounts.find((account) => account.id !== nextFromId)
                          ?.id || "",
                      );
                    }
                  }}
                  accounts={accounts}
                  placeholder="Select source account"
                />
              </div>

              <div className="flex justify-center">
                <span className="grid h-9 w-9 place-items-center rounded-[14px] border border-border bg-surface-secondary text-text-secondary">
                  <ArrowLeftRight size={16} />
                </span>
              </div>

              <div>
                <label className="field-label">To Account</label>
                <AccountSelect
                  value={toAccountId}
                  onValueChange={setToAccountId}
                  accounts={toAccounts}
                  placeholder="Select destination account"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="transfer-amount">
                    Amount (PKR)
                  </label>
                  <input
                    id="transfer-amount"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    className="field-input font-semibold"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="transfer-date">
                    Transfer Date
                  </label>
                  <DatePicker
                    id="transfer-date"
                    value={transferDate}
                    onChange={setTransferDate}
                    placeholder="Select transfer date"
                    ariaLabel="Transfer date"
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="transfer-note">
                  Note (Optional)
                </label>
                <input
                  id="transfer-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ATM cash withdrawal, bank deposit, wallet move..."
                  className="field-input"
                />
              </div>
            </>
          )}

          {error && (
            <p className={financeErrorClass}>
              {error}
            </p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={financeCancelButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || accounts.length < 2}
            className="primary-action py-3"
          >
            {saving ? "Saving..." : "Save Transfer"}
          </button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
