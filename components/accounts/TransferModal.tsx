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

function AccountChoice({
  account,
  active,
  onSelect,
}: {
  account: Account;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`finance-focus rounded-[20px] border px-3 py-3 text-left transition-colors ${
        active
          ? "border-border bg-card text-text-primary"
          : "border-border bg-surface-secondary text-slate-400 hover:bg-hover hover:text-text-primary"
      }`}
    >
      <span className="block truncate text-sm font-semibold">
        {account.name}
      </span>
      <span
        className={
          active ? "text-[11px] text-slate-600" : "text-[11px] text-slate-500"
        }
      >
        {account.type} - {formatPKR(account.balance)}
      </span>
    </button>
  );
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
      <DialogContent className="finance-panel max-w-2xl gap-0 p-0 text-text-primary">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ArrowLeftRight size={18} />
            Account Transfer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {loading ? (
            <div className="finance-skeleton h-36" />
          ) : accounts.length < 2 ? (
            <div className="rounded-[24px] border border-amber-300/15 bg-amber-300/[0.08] p-4 text-sm text-amber-100">
              Add at least two accounts before recording a transfer.
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
                <div>
                  <label className="field-label">From Account</label>
                  <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                    {accounts.map((account) => (
                      <AccountChoice
                        key={account.id}
                        account={account}
                        active={fromAccountId === account.id}
                        onSelect={() => {
                          setFromAccountId(account.id);
                          if (toAccountId === account.id) setToAccountId("");
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="hidden h-full items-center justify-center lg:flex">
                  <div className="grid h-11 w-11 place-items-center rounded-[20px] border border-border bg-surface-secondary text-text-primary">
                    <ArrowLeftRight size={18} />
                  </div>
                </div>

                <div>
                  <label className="field-label">To Account</label>
                  <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                    {accounts
                      .filter((account) => account.id !== fromAccountId)
                      .map((account) => (
                        <AccountChoice
                          key={account.id}
                          account={account}
                          active={toAccountId === account.id}
                          onSelect={() => setToAccountId(account.id)}
                        />
                      ))}
                  </div>
                </div>
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
                <label className="field-label">Note</label>
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
            <p className="rounded-[18px] border border-red-400/15 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || accounts.length < 2}
            className="primary-action w-full py-3"
          >
            {saving ? "Recording..." : "Record Transfer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
