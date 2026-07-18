"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp } from "lucide-react";
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
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { BASE_CURRENCY, formatMoney } from "@/lib/currency";
import { getUserMutationError } from "@/lib/user-errors";
import {
  getAvailableTransferBalance,
  getMaximumTransferInput,
  getTransferAmountIssue,
} from "@/lib/transfer-amount";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon_key?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TRANSFER_ACTION_COLOR = "#A35D2D";

export default function TransferModal({ open, onClose, onSuccess }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(getAppDateKey());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [swapAnnouncement, setSwapAnnouncement] = useState("");

  const toAccounts = useMemo(
    () => accounts.filter((account) => account.id !== fromAccountId),
    [accounts, fromAccountId],
  );
  const fromAccount = useMemo(
    () => accounts.find((account) => account.id === fromAccountId),
    [accounts, fromAccountId],
  );
  const availableBalance = getAvailableTransferBalance(fromAccount?.balance);
  const amountIssue = getTransferAmountIssue(amount, availableBalance);
  const amountError =
    amountTouched && amountIssue === "missing"
      ? "Enter a transfer amount."
      : amountTouched && amountIssue === "invalid"
        ? "Enter a transfer amount greater than 0."
        : amountTouched && amountIssue === "exceeds-balance"
          ? `Amount exceeds the available balance of ${formatMoney(
              availableBalance,
              {
                currency: BASE_CURRENCY,
                maximumFractionDigits: 2,
              },
            )}.`
          : null;

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadAccounts() {
      setLoading(true);
      const { data } = await supabase
        .from("accounts")
        .select("id, name, type, balance, icon_key")
        .eq("status", "active")
        .order("name");

      if (!active) return;

      const rows = (data ?? []) as Account[];
      setAccounts(rows);
      setFromAccountId(rows[0]?.id || "");
      setToAccountId(
        rows.find((account) => account.id !== rows[0]?.id)?.id || "",
      );
      setLoading(false);
    }

    setAmount("");
    setTransferDate(getAppDateKey());
    setError("");
    setAmountTouched(false);
    setSwapAnnouncement("");
    void loadAccounts();

    return () => {
      active = false;
    };
  }, [open, supabase]);

  function handleSwapAccounts() {
    if (!fromAccountId || !toAccountId || loading || saving) return;

    const previousFromId = fromAccountId;
    const previousToId = toAccountId;
    const previousFrom = accounts.find(
      (account) => account.id === previousFromId,
    );
    const previousTo = accounts.find(
      (account) => account.id === previousToId,
    );

    setFromAccountId(previousToId);
    setToAccountId(previousFromId);
    setError("");
    setSwapAnnouncement(
      `${previousTo?.name ?? "Destination account"} is now the source and ${
        previousFrom?.name ?? "source account"
      } is now the destination.`,
    );
  }

  function handleUseMaximum() {
    if (!fromAccountId || availableBalance <= 0 || loading || saving) return;

    setAmount(getMaximumTransferInput(availableBalance));
    setAmountTouched(true);
    setError("");
  }

  async function handleSave() {
    if (saving || loading) return;

    if (!fromAccountId || !toAccountId) {
      setError("Select both accounts.");
      return;
    }

    if (fromAccountId === toAccountId) {
      setError("From and to account must be different.");
      return;
    }

    setAmountTouched(true);
    if (amountIssue) {
      setError("");
      return;
    }

    const parsedAmount = Number(amount);
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
        note: null,
        reference: null,
      });

    setSaving(false);

    if (saveError) {
      setError(
        getUserMutationError(
          saveError,
          "Transfer could not be recorded. Try again.",
        ),
      );
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
      <DialogContent
        className={financeModalContentClass}
        style={
          {
            "--finance-action": TRANSFER_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title="Transfer" />

        <FinanceModalBody>
          {loading ? (
            <div className="finance-skeleton h-40" />
          ) : accounts.length < 2 ? (
            <div className="rounded-[16px] border border-payables/25 bg-payables-soft p-4 text-sm text-payables">
              Add at least two accounts before recording a transfer.
            </div>
          ) : (
            <>
              <div className="rounded-[var(--oneui-card-radius)] border border-border bg-surface-secondary/65 p-3">
                <FinanceFormField
                  label="From Account"
                  htmlFor="transfer-from-account"
                >
                  <AccountSelect
                    id="transfer-from-account"
                    value={fromAccountId}
                    onValueChange={(nextFromId) => {
                      setFromAccountId(nextFromId);
                      setAmountTouched(Boolean(amount));
                      setError("");
                      setSwapAnnouncement("");
                      if (toAccountId === nextFromId) {
                        setToAccountId(
                          accounts.find(
                            (account) => account.id !== nextFromId,
                          )?.id || "",
                        );
                      }
                    }}
                    accounts={accounts}
                    placeholder="Select source account"
                    ariaLabel="From account"
                  />
                </FinanceFormField>

                <div className="flex items-center gap-3 py-1.5">
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  <button
                    type="button"
                    onClick={handleSwapAccounts}
                    disabled={
                      !fromAccountId || !toAccountId || loading || saving
                    }
                    aria-label="Swap source and destination accounts"
                    title="Swap accounts"
                    className="finance-focus group grid size-9 shrink-0 place-items-center border-0 bg-transparent p-0 transition-[opacity,transform] hover:opacity-65 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ color: TRANSFER_ACTION_COLOR }}
                  >
                    <ArrowDownUp
                      size={20}
                      strokeWidth={1.8}
                      className="transition-transform duration-300 group-hover:rotate-180 motion-reduce:transition-none"
                    />
                  </button>
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>

                <FinanceFormField
                  label="To Account"
                  htmlFor="transfer-to-account"
                >
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
                  error={
                    amountError ? (
                      <span id="transfer-amount-error">{amountError}</span>
                    ) : undefined
                  }
                  hint={
                    <span id="transfer-amount-balance">
                      {fromAccount
                        ? `Available: ${formatMoney(availableBalance, {
                            currency: BASE_CURRENCY,
                            maximumFractionDigits: 2,
                          })}`
                        : "Select a source account."}
                    </span>
                  }
                >
                  <div className="relative">
                    <Input
                      id="transfer-amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={availableBalance || undefined}
                      step="any"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setAmountTouched(true);
                        setError("");
                      }}
                      onBlur={() => setAmountTouched(true)}
                      placeholder="0"
                      aria-invalid={Boolean(amountError) || undefined}
                      aria-describedby={
                        amountError
                          ? "transfer-amount-error"
                          : "transfer-amount-balance"
                      }
                      className="pr-14 font-semibold tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={handleUseMaximum}
                      disabled={
                        !fromAccountId ||
                        availableBalance <= 0 ||
                        loading ||
                        saving
                      }
                      className="finance-focus absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent px-1.5 py-1 text-[11px] font-extrabold tracking-[0.02em] transition-[opacity,transform] hover:opacity-65 active:scale-95 disabled:cursor-not-allowed disabled:text-text-tertiary disabled:opacity-45"
                      style={{ color: TRANSFER_ACTION_COLOR }}
                      aria-label="Use the full available account balance"
                      title="Use full available balance"
                    >
                      Max
                    </button>
                  </div>
                </FinanceFormField>

                <FinanceFormField label="Date" htmlFor="transfer-date">
                  <DatePicker
                    id="transfer-date"
                    value={transferDate}
                    onChange={setTransferDate}
                    placeholder="Select transfer date"
                    ariaLabel="Transfer date"
                  />
                </FinanceFormField>
              </div>
            </>
          )}

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              saving || loading || accounts.length < 2 || Boolean(amountIssue)
            }
            loading={saving}
            loadingLabel="Saving transfer…"
            className={financePrimaryButtonClass}
            style={{ background: TRANSFER_ACTION_COLOR }}
          >
            Transfer
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
