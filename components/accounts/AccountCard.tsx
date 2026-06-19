"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AccountModal, { ExistingAccount } from "./AccountModal";
import { formatPKR, getAccountType } from "@/lib/finance-options";

export default function AccountCard({
  account,
}: {
  account: ExistingAccount & { inflow?: number; outflow?: number };
}) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cfg = getAccountType(account.type);
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
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${cfg.tone}`}
        >
          <Icon size={19} />
        </div>

        <p className="mb-2 break-words pr-16 text-base font-semibold text-white">
          {account.name}
        </p>

        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${cfg.tone}`}
        >
          {cfg.label}
        </span>

        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <p className="mb-1 text-xs text-slate-500">Balance</p>
          <p className="break-words text-xl font-bold text-white">
            {formatPKR(account.balance)}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Approx. ${(Number(account.balance) / 281.2).toFixed(2)} USD
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.055] p-3">
            <p className="text-[11px] text-slate-500">Income In</p>
            <p className="mt-1 text-sm font-semibold text-emerald-200">
              {formatPKR(account.inflow ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-300/10 bg-rose-300/[0.055] p-3">
            <p className="text-[11px] text-slate-500">Expense Out</p>
            <p className="mt-1 text-sm font-semibold text-rose-200">
              {formatPKR(account.outflow ?? 0)}
            </p>
          </div>
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
