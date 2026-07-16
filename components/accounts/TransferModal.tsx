"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { getAppDateKey } from "@/lib/dates";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AccountSelect from "@/components/accounts/AccountSelect";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { BASE_CURRENCY } from "@/lib/currency";

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
  const [swapAnnouncement, setSwapAnnouncement] = useState("");
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
    setSwapAnnouncement("");
    loadAccounts();
  }, [open, supabase]);

  function handleSwapAccounts() {
    if (!fromAccountId || !toAccountId || loading || saving) return;

    const previousFromId = fromAccountId;
    const previousToId = toAccountId;
    const previousFrom = accounts.find((account) => account.id === previousFromId);
    const previousTo = accounts.find((account) => account.id === previousToId);

    setFromAccountId(previousToId);
    setToAccountId(previousFromId);
    setError("");
    setSwapAnnouncement(
      `${previousTo?.name ?? "Destination account"} is now the source and ${previousFrom?.name ?? "source account"} is now the destination.`,
    );
  }

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
            <div className="rounded-[18px] border border-payables/25 bg-payables-soft p-4 text-sm text-payables">
              Add at least two accounts before recording a transfer.
            </div>
          ) : (
            <>
              <div className="rounded-[var(--oneui-card-radius)] border border-border bg-surface-secondary/70 p-3 sm:p-4">
                <FinanceFormField label="From Account" htmlFor="transfer-from-account">
                  <AccountSelect
                    id="transfer-from-account"
                    value={fromAccountId}
                    onValueChange={(nextFromId) => {
                      setFromAccountId(nextFromId);
                      setSwapAnnouncement("");
                      if (toAccountId === nextFromId) {
                        setToAccountId(
                          accounts.find((account) => account.id !== nextFromId)
                            ?.id || "",
                        );
                      }
                    }}
                    accounts={accounts}
                    placeholder="Select source account"
                    ariaLabel="From account"
                  />
                </FinanceFormField>

                <div className="flex items-center gap-3 py-2">
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleSwapAccounts}
                    disabled={!fromAccountId || !toAccountId || loading || saving}
                    aria-label="Swap source and destination accounts"
                    title="Swap accounts"
                    className="group size-11 shrink-0 rounded-full border-info/30 bg-info/10 text-info shadow-sm hover:border-info/50 hover:bg-info/15 hover:text-info"
                  >
                    <ArrowDownUp
                      size={17}
                      className="transition-transform duration-300 group-hover:rotate-180 group-active:scale-90 motion-reduce:transition-none"
                    />
                  </Button>
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>

                <FinanceFormField label="To Account" htmlFor="transfer-to-account">
                  <AccountSelect
                    id="transfer-to-account"
                    value={toAccountId}
                    onValueChange={(nextToId) => {
                      setToAccountId(nextToId);
                      setSwapAnnouncement("");
                    }}
                    accounts={toAccounts}
                    placeholder="Select destination account"
                    ariaLabel="To account"
                  />
                </FinanceFormField>
                <p className="sr-only" aria-live="polite">
                  {swapAnnouncement}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FinanceFormField
                  label={`Amount (${BASE_CURRENCY})`}
                  htmlFor="transfer-amount"
                >
                  <Input
                    id="transfer-amount"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    className="font-semibold"
                  />
                </FinanceFormField>
                <FinanceFormField label="Transfer Date" htmlFor="transfer-date">
                  <DatePicker
                    id="transfer-date"
                    value={transferDate}
                    onChange={setTransferDate}
                    placeholder="Select transfer date"
                    ariaLabel="Transfer date"
                  />
                </FinanceFormField>
              </div>

              <FinanceFormField label="Note (Optional)" htmlFor="transfer-note">
                <Input
                  id="transfer-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ATM cash withdrawal, bank deposit, wallet move..."
                />
              </FinanceFormField>
            </>
          )}

          {error && (
            <p className={financeErrorClass}>
              {error}
            </p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={financeCancelButtonClass}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || accounts.length < 2}
            className="primary-action py-3"
          >
            {saving ? "Saving..." : "Save Transfer"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
