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
import { formatPKR } from "@/lib/finance-options";

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

const COLOR_MAP = {
  blue: "#2563eb",
  green: "#059669",
  orange: "#ea580c",
  purple: "#7c3aed",
  cyan: "#0891b2",
  rose: "#e11d48",
  amber: "#d97706",
  slate: "#475569",
};

function getIcon(iconKey?: string | null) {
  return ICON_MAP[(iconKey ?? "bank") as keyof typeof ICON_MAP] ?? Landmark;
}

function getColor(color?: string | null) {
  return COLOR_MAP[(color ?? "blue") as keyof typeof COLOR_MAP] ?? "#2563eb";
}

function getAccountKindLabel(value?: string | null) {
  return value === "current" ? "Current Account" : "Savings Account";
}

function maskAccountNumber(value?: string | null) {
  if (!value) return "No account number";

  const clean = value.replace(/\s+/g, "");

  if (clean.length <= 4) return clean;

  return `•••• ${clean.slice(-4)}`;
}

function getCardVars(accent: string) {
  return {
    "--account-accent": accent,
  } as CSSProperties;
}

type AccountCardProps = {
  account: AccountWithTotals;
  index?: number;
};

export default function AccountCard({ account }: AccountCardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const Icon = getIcon(account.icon_key);
  const accent = getColor(account.accent_color);

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
        className="group relative min-h-[320px] overflow-hidden rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-1"
        style={{
          ...getCardVars(accent),
          borderColor: "var(--border)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--account-accent), transparent 93%), var(--card))",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-3xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--account-accent), transparent 82%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--account-accent), transparent 45%), transparent)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-[18px] border"
            style={{
              color: "var(--account-accent)",
              borderColor:
                "color-mix(in srgb, var(--account-accent), transparent 72%)",
              backgroundColor:
                "color-mix(in srgb, var(--account-accent), transparent 88%)",
            }}
          >
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
              className="icon-button hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400"
              aria-label="Delete account"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="relative mt-5">
          <p className="line-clamp-2 break-words text-[15px] font-bold leading-6 text-text-primary">
            {account.name}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={{
                color: "var(--account-accent)",
                borderColor:
                  "color-mix(in srgb, var(--account-accent), transparent 72%)",
                backgroundColor:
                  "color-mix(in srgb, var(--account-accent), transparent 90%)",
              }}
            >
              {getAccountKindLabel(account.account_kind)}
            </span>

            <span className="inline-flex rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
              {maskAccountNumber(account.account_number)}
            </span>
          </div>
        </div>

        <div
          className="relative mt-5 rounded-[22px] border p-4"
          style={{
            borderColor: "color-mix(in srgb, var(--border), transparent 15%)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface-secondary), var(--card) 22%), var(--card))",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            Balance
          </p>

          <p className="mt-1 break-words text-2xl font-black tracking-tight text-text-primary">
            {formatPKR(account.balance)}
          </p>

          <p className="mt-1 text-xs font-medium text-text-secondary">
            Approx. ${(Number(account.balance) / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <div
            className="rounded-[20px] border p-3"
            style={{
              borderColor: "color-mix(in srgb, #10b981, transparent 68%)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, #10b981, transparent 90%), var(--card))",
            }}
          >
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
              <ArrowDownLeft size={13} className="text-emerald-500" />
              Income In
            </div>

            <p className="break-words text-sm font-black text-emerald-600">
              {formatPKR(account.inflow ?? 0)}
            </p>
          </div>

          <div
            className="rounded-[20px] border p-3"
            style={{
              borderColor: "color-mix(in srgb, #ef4444, transparent 68%)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, #ef4444, transparent 91%), var(--card))",
            }}
          >
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
              <ArrowUpRight size={13} className="text-rose-500" />
              Expense Out
            </div>

            <p className="break-words text-sm font-black text-rose-600">
              {formatPKR(account.outflow ?? 0)}
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
