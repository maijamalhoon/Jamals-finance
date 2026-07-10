"use client";

import { toast } from "sonner";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  CreditCard,
  Landmark,
  PiggyBank,
  Smartphone,
  Wallet,
} from "lucide-react";

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
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { BASE_CURRENCY } from "@/lib/currency";

export interface ExistingAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  account_number?: string | null;
  account_kind?: string | null;
  icon_key?: string | null;
  accent_color?: string | null;
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

const ICON_OPTIONS = [
  { value: "bank", label: "Bank", icon: Landmark },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "phone", label: "Phone", icon: Smartphone },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "business", label: "Business", icon: BriefcaseBusiness },
  { value: "savings", label: "Saving", icon: PiggyBank },
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "green", label: "Green", hex: "#059669" },
  { value: "orange", label: "Orange", hex: "#ea580c" },
  { value: "purple", label: "Purple", hex: "#7c3aed" },
  { value: "cyan", label: "Cyan", hex: "#0891b2" },
  { value: "rose", label: "Rose", hex: "#e11d48" },
  { value: "amber", label: "Amber", hex: "#d97706" },
  { value: "slate", label: "Slate", hex: "#475569" },
];

function getLegacyTypeFromIcon(iconKey: string) {
  if (iconKey === "cash") return "cash";
  if (iconKey === "wallet") return "other_wallet";
  if (iconKey === "phone") return "easypaisa";
  if (iconKey === "card") return "sadapay";
  if (iconKey === "business") return "freelance";
  return "bank";
}

function getIconFromLegacyType(type?: string | null) {
  if (type === "cash") return "cash";
  if (type === "jazzcash" || type === "easypaisa" || type === "nayapay") {
    return "phone";
  }
  if (type === "sadapay") return "card";
  if (type === "other_wallet") return "wallet";
  if (type === "freelance") return "business";
  return "bank";
}

function getAccentHex(colorValue: string) {
  return (
    COLOR_OPTIONS.find((color) => color.value === colorValue)?.hex ?? "#2563eb"
  );
}

function getCssVars(accent: string) {
  return {
    "--account-accent": accent,
  } as CSSProperties;
}

export default function AccountModal({
  open,
  onClose,
  onSuccess,
  account,
}: Props) {
  const supabase = createClient();
  const isEditing = !!account;

  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountKind, setAccountKind] = useState("savings");
  const [iconKey, setIconKey] = useState("bank");
  const [accentColor, setAccentColor] = useState("blue");
  const [balance, setBalance] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const accentHex = useMemo(() => getAccentHex(accentColor), [accentColor]);

  useEffect(() => {
    if (!open) return;

    if (account) {
      setName(account.name ?? "");
      setAccountNumber(account.account_number ?? "");
      setAccountKind(
        account.account_kind === "current" ? "current" : "savings",
      );
      setIconKey(account.icon_key ?? getIconFromLegacyType(account.type));
      setAccentColor(account.accent_color ?? "blue");
      setBalance(String(account.balance ?? 0));
    } else {
      setName("");
      setAccountNumber("");
      setAccountKind("savings");
      setIconKey("bank");
      setAccentColor("blue");
      setBalance("");
    }

    setError("");
  }, [open, account]);

  async function handleSave() {
    if (!name.trim()) {
      setError("Enter an account name.");
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

    const payload = {
      user_id: user.id,
      name: name.trim(),
      type: getLegacyTypeFromIcon(iconKey),
      account_number: accountNumber.trim() || null,
      account_kind: accountKind,
      icon_key: iconKey,
      accent_color: accentColor,
      balance: parseFloat(balance) || 0,
    };

    const { error: saveError } =
      isEditing ?
        await supabase.from("accounts").update(payload).eq("id", account!.id)
      : await supabase.from("accounts").insert(payload);

    setLoading(false);

    if (saveError) {
      console.error(saveError);
      setError("Failed to save. Try again.");
      toast.error("Failed to save account");
      return;
    }

    toast.success(isEditing ? "Account updated!" : "Account added!");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={financeModalContentClass}
        style={getCssVars(accentHex)}
      >
        <FinanceModalHeader
          title={isEditing ? "Edit Account" : "Add Account"}
          description="Enter account name, number, type, icon, color, and balance."
          icon={Wallet}
          tone="info"
        />

        <FinanceModalBody>
          <FinanceFormField label="Account Name" htmlFor="account-name">
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Habib Metro Bank"
            />
          </FinanceFormField>

          <FinanceFormField label="Account Number" htmlFor="account-number">
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 0123456789"
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

          <div>
            <span className="field-label">
              Icon
            </span>

            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = iconKey === value;

                return (
                  <Button
                    key={value}
                    type="button"
                    onClick={() => setIconKey(value)}
                    aria-pressed={active}
                    className="finance-focus flex h-auto min-h-[62px] flex-col items-center justify-center gap-1 rounded-[var(--oneui-input-radius)] border px-1.5 py-2 text-[11px] font-bold transition-all"
                    style={{
                      borderColor:
                        active ?
                          "color-mix(in srgb, var(--account-accent), transparent 45%)"
                        : "var(--border)",
                      background:
                        active ?
                          "color-mix(in srgb, var(--account-accent), transparent 88%)"
                        : "var(--surface-secondary)",
                      color:
                        active ?
                          "var(--account-accent)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <span
                      className="grid h-7 w-7 place-items-center rounded-full"
                      style={{
                        background:
                          active ?
                            "color-mix(in srgb, var(--account-accent), transparent 82%)"
                          : "var(--card)",
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="field-label mb-0">
                Color
              </span>
              <span className="text-[11px] font-semibold text-text-secondary">
                {
                  COLOR_OPTIONS.find((color) => color.value === accentColor)
                    ?.label
                }
              </span>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {COLOR_OPTIONS.map((color) => {
                const active = accentColor === color.value;

                return (
                  <Button
                    key={color.value}
                    type="button"
                    aria-label={color.label}
                    title={color.label}
                    onClick={() => setAccentColor(color.value)}
                    className="finance-focus grid h-9 w-full place-items-center rounded-full border p-0 transition-all"
                    style={{
                      borderColor: active ? color.hex : "var(--border)",
                      background:
                        active ?
                          `color-mix(in srgb, ${color.hex}, transparent 84%)`
                        : "var(--surface-secondary)",
                      boxShadow:
                        active ?
                          `0 0 0 3px color-mix(in srgb, ${color.hex}, transparent 82%)`
                        : "none",
                    }}
                    >
                      <span
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: color.hex }}
                      />
                  </Button>
                );
              })}
            </div>
          </div>

          <FinanceFormField
            label={
              isEditing ?
                `Current Balance (${BASE_CURRENCY})`
              : `Opening Balance (${BASE_CURRENCY})`}
            htmlFor="account-balance"
          >
            <Input
              id="account-balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="font-bold"
            />
          </FinanceFormField>

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
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="finance-focus primary-action min-h-[var(--oneui-control-height-lg)] w-full px-4 text-sm font-black text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--account-accent), color-mix(in srgb, var(--account-accent), #111827 18%))",
              boxShadow:
                "0 16px 34px color-mix(in srgb, var(--account-accent), transparent 78%)",
            }}
          >
            {loading ?
              "Saving..."
            : isEditing ?
              "Update Account"
            : "Add Account"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
