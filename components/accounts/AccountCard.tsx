"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Landmark,
  LucideIcon,
  Pencil,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AccountModal, { ExistingAccount } from "./AccountModal";

const CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  bank: {
    label: "Bank Account",
    icon: Landmark,
    color: "text-sky-300",
    bg: "bg-sky-500/15",
  },
  cash: {
    label: "Cash Wallet",
    icon: Wallet,
    color: "text-green-300",
    bg: "bg-green-500/15",
  },
  freelance: {
    label: "Freelance",
    icon: Briefcase,
    color: "text-violet-300",
    bg: "bg-violet-500/15",
  },
  investment: {
    label: "Investment",
    icon: TrendingUp,
    color: "text-amber-300",
    bg: "bg-amber-500/15",
  },
};

export default function AccountCard({ account }: { account: ExistingAccount }) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cfg = CONFIG[account.type] || CONFIG.bank;
  const Icon = cfg.icon;

  async function handleDelete() {
    if (!confirm(`Delete "${account.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await supabase.from("accounts").delete().eq("id", account.id);
    router.refresh();
  }

  return (
    <>
      <div className="finance-panel card-hover group relative p-5 hover:border-white/[0.14]">
        <div className="absolute right-4 top-4 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={() => setEditOpen(true)}
            className="icon-button"
            aria-label="Edit account"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="icon-button hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Delete account"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${cfg.bg}`}
        >
          <Icon size={19} className={cfg.color} />
        </div>

        <p className="mb-2 break-words pr-16 text-base font-semibold text-white">
          {account.name}
        </p>

        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
        >
          {cfg.label}
        </span>

        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <p className="mb-1 text-xs text-slate-500">Balance</p>
          <p className="break-words text-xl font-bold text-white">
            PKR {Number(account.balance).toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Approx. ${(Number(account.balance) / 281.2).toFixed(2)} USD
          </p>
        </div>
      </div>

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
