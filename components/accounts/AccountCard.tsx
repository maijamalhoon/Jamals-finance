"use client";

import { type CSSProperties, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import AccountModal, { ExistingAccount } from "./AccountModal";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { getAccountAccentColor } from "@/lib/theme-colors";

type AccountWithTotals = ExistingAccount & {
  inflow?: number;
  outflow?: number;
};

const ICON_MAP = {
  bank: Landmark,
  wallet: Wallet,
  card: CreditCard,
  phone: Smartphone,
  cash: Banknote,
  business: BriefcaseBusiness,
  savings: PiggyBank,
};

function getIcon(iconKey?: string | null) {
  return ICON_MAP[(iconKey ?? "bank") as keyof typeof ICON_MAP] ?? Landmark;
}

function getAccountKindLabel(value?: string | null) {
  return value === "current" ? "Current Account" : "Savings Account";
}

function maskAccountNumber(value?: string | null) {
  if (!value) return "No account number";

  const clean = value.replace(/\s+/g, "");

  if (clean.length <= 4) return clean;

  return `**** ${clean.slice(-4)}`;
}

function getCardVars(accent: string) {
  return {
    "--account-accent": accent,
  } as CSSProperties;
}

type AccountCardProps = {
  account: AccountWithTotals;
};

export default function AccountCard({ account }: AccountCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const Icon = getIcon(account.icon_key);
  const accent = getAccountAccentColor(account.accent_color);

  async function handleDelete() {
    if (!confirm(`Delete "${account.name}"? This cannot be undone.`)) return;

    setDeleting(true);

    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", account.id);

    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <article
        className="account-card-shell finance-panel-interactive group relative flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[var(--oneui-card-radius)] border p-5"
        style={getCardVars(accent)}
      >
        <div
          aria-hidden="true"
          className="account-card-glow pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-3xl"
        />

        <div
          aria-hidden="true"
          className="account-card-line pointer-events-none absolute inset-x-6 top-0 h-px"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="account-accent-tile grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border">
            <Icon size={20} strokeWidth={2.2} />
          </div>

          <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="icon-button"
              aria-label="Edit account"
            >
              <Pencil size={13} />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="icon-button hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
              aria-label="Delete account"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="relative mt-5 min-w-0">
          <p className="line-clamp-2 break-words text-[15px] font-bold leading-6 text-text-primary">
            {account.name}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="account-accent-pill inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold">
              {getAccountKindLabel(account.account_kind)}
            </span>

            <span className="inline-flex min-w-0 max-w-full rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
              <span className="truncate">
                {maskAccountNumber(account.account_number)}
              </span>
            </span>
          </div>
        </div>

        <div className="finance-panel-soft relative mt-5 min-w-0 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            Balance
          </p>

          <p className="mt-1 break-words text-2xl font-black tracking-normal text-text-primary [overflow-wrap:anywhere]">
            {formatCurrency(Number(account.balance ?? 0))}
          </p>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <div className="finance-panel-soft min-w-0 border-success/30 bg-success/10 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
              <ArrowDownLeft size={13} className="text-success" />
              Income In
            </div>

            <p className="break-words text-sm font-black text-success [overflow-wrap:anywhere]">
              {formatCurrency(Number(account.inflow ?? 0))}
            </p>
          </div>

          <div className="finance-panel-soft min-w-0 border-danger/30 bg-danger/10 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
              <ArrowUpRight size={13} className="text-danger" />
              Expense Out
            </div>

            <p className="break-words text-sm font-black text-danger [overflow-wrap:anywhere]">
              {formatCurrency(Number(account.outflow ?? 0))}
            </p>
          </div>
        </div>
      </article>

      <AccountModal
        open={editOpen}
        account={account}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
