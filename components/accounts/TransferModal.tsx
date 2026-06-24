"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function formatPKR(value: number | string) {
  return `PKR ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

function accountLabel(account: Account) {
  return `${account.name} (${account.type}) - ${formatPKR(account.balance)}`;
}

export default function TransferModal({ open, onClose, onSuccess }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0],
  );
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
    setTransferDate(new Date().toISOString().split("T")[0]);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="finance-panel max-h-[calc(100dvh-1.5rem)] max-w-md gap-0 overflow-hidden p-0 text-text-primary">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-[12px] border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
              <ArrowLeftRight size={16} />
            </span>
            Transfer Money
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select different accounts, amount, date, and an optional note.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(100dvh-9rem)] space-y-3.5 overflow-y-auto px-5 py-4">
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
                <select
                  value={fromAccountId}
                  onChange={(event) => {
                    const nextFromId = event.target.value;
                    setFromAccountId(nextFromId);
                    if (toAccountId === nextFromId) {
                      setToAccountId(
                        accounts.find((account) => account.id !== nextFromId)
                          ?.id || "",
                      );
                    }
                  }}
                  className="field-input"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountLabel(account)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <span className="grid h-9 w-9 place-items-center rounded-[14px] border border-border bg-surface-secondary text-text-secondary">
                  <ArrowLeftRight size={16} />
                </span>
              </div>

              <div>
                <label className="field-label">To Account</label>
                <select
                  value={toAccountId}
                  onChange={(event) => setToAccountId(event.target.value)}
                  className="field-input"
                >
                  {toAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountLabel(account)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">Amount (PKR)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    className="field-input font-semibold"
                  />
                </div>
                <div>
                  <label className="field-label">Transfer Date</label>
                  <DatePicker
                    value={transferDate}
                    onChange={setTransferDate}
                    placeholder="Select transfer date"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Note (Optional)</label>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ATM cash withdrawal, bank deposit, wallet move..."
                  className="field-input"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-[16px] border border-red-500/15 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="finance-focus inline-flex min-h-11 items-center justify-center rounded-[16px] border border-border bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-hover active:scale-[0.985] disabled:opacity-50"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
