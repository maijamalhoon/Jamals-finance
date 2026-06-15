"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Landmark,
  Wallet,
  Briefcase,
  TrendingUp,
  LucideIcon,
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
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  cash: {
    label: "Cash Wallet",
    icon: Wallet,
    color: "text-green-400",
    bg: "bg-green-500/15",
  },
  freelance: {
    label: "Freelance",
    icon: Briefcase,
    color: "text-purple-400",
    bg: "bg-purple-500/15",
  },
  investment: {
    label: "Investment",
    icon: TrendingUp,
    color: "text-yellow-400",
    bg: "bg-yellow-500/15",
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
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 hover:border-gray-700/60 transition-colors group relative">
        {/* Edit / Delete */}
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditOpen(true)}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-indigo-600/20 flex items-center justify-center transition-colors"
          >
            <Pencil size={12} className="text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 flex items-center justify-center transition-colors"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>

        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center mb-4`}
        >
          <Icon size={19} className={cfg.color} />
        </div>

        {/* Name */}
        <p className="text-white font-semibold text-base mb-2">
          {account.name}
        </p>

        {/* Type Badge */}
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}
        >
          {cfg.label}
        </span>

        {/* Balance */}
        <div className="mt-4 pt-4 border-t border-gray-800/50">
          <p className="text-gray-500 text-xs mb-1">Balance</p>
          <p className="text-white text-xl font-bold">
            PKR {Number(account.balance).toLocaleString()}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            ≈ ${(Number(account.balance) / 281.2).toFixed(2)} USD
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
