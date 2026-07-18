"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { BASE_CURRENCY } from "@/lib/currency";
import { getAutomaticAccountVisual } from "@/lib/account-identity";
import { getUserMutationError } from "@/lib/user-errors";

export interface ExistingAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  account_number?: string | null;
  account_kind?: string | null;
  icon_key?: string | null;
  accent_color?: string | null;
  status?: "active" | "archived";
  archived_at?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: ExistingAccount;
}

const ACCOUNT_KINDS = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
];

const ACCOUNT_ACTION_COLOR = "#2B5FB8";

export default function AccountModal({
  open,
  onClose,
  onSuccess,
  account,
}: Props) {
  const supabase = createClient();
  const isEditing = Boolean(account);

  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountKind, setAccountKind] = useState("savings");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (account) {
      setName(account.name ?? "");
      setAccountNumber(account.account_number ?? "");
      setAccountKind(
        account.account_kind === "current" ? "current" : "savings",
      );
      setBalance(String(account.balance ?? 0));
    } else {
      setName("");
      setAccountNumber("");
      setAccountKind("savings");
      setBalance("");
    }

    setError("");
  }, [account, open]);

  async function handleSave() {
    if (loading) return;

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Enter an account name.");
      return;
    }

    const openingBalance = balance.trim() === "" ? 0 : Number(balance);
    if (!isEditing && !Number.isFinite(openingBalance)) {
      setError("Enter a valid opening balance.");
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
      setError("Not logged in. Please sign in again.");
      toast.error("Please sign in again");
      return;
    }

    const visual = getAutomaticAccountVisual(cleanName, {
      iconKey: account?.icon_key,
      accentColor: account?.accent_color,
      type: account?.type,
    });

    const accountDetails = {
      user_id: user.id,
      name: cleanName,
      type: visual.legacyType,
      account_number: accountNumber.trim() || null,
      account_kind: accountKind,
      icon_key: visual.iconKey,
      accent_color: visual.accentColor,
    };

    const { error: saveError } = isEditing
      ? await supabase
          .from("accounts")
          .update(accountDetails)
          .eq("id", account!.id)
      : await supabase.from("accounts").insert({
          ...accountDetails,
          balance: openingBalance,
        });

    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(
          saveError,
          "Account could not be saved. Try again.",
        ),
      );
      toast.error("Failed to save account");
      return;
    }

    toast.success(isEditing ? "Account updated!" : "Account created!");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={financeModalContentClass}
        style={
          {
            "--finance-action": ACCOUNT_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title={isEditing ? "Edit Account" : "Account"} />

        <FinanceModalBody className="sm:space-y-4">
          <FinanceFormField label="Account Name" htmlFor="account-name">
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. UBL, Bank of America, JazzCash"
              autoComplete="off"
            />
          </FinanceFormField>

          <FinanceFormField
            label="Account Number (Optional)"
            htmlFor="account-number"
          >
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder="e.g. 0123456789"
              inputMode="numeric"
            />
          </FinanceFormField>

          <FinanceFormField label="Account Type" htmlFor="account-kind">
            <Select
              value={accountKind}
              onValueChange={(nextValue) => {
                if (typeof nextValue === "string") setAccountKind(nextValue);
              }}
            >
              <SelectTrigger id="account-kind" className="w-full">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={8} className="z-[90]">
                {ACCOUNT_KINDS.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>

          <FinanceFormField
            label={
              isEditing
                ? `Current Balance (${BASE_CURRENCY})`
                : `Opening Balance (${BASE_CURRENCY})`
            }
            htmlFor="account-balance"
          >
            <Input
              id="account-balance"
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              disabled={isEditing}
              placeholder="0"
              className="font-semibold tabular-nums disabled:cursor-not-allowed disabled:opacity-65"
            />
          </FinanceFormField>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            loading={loading}
            loadingLabel="Saving account…"
            className={financePrimaryButtonClass}
            style={{ background: ACCOUNT_ACTION_COLOR }}
          >
            {isEditing ? "Update Account" : "Create Account"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
