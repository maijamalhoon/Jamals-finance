"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TransactionModal, {
  ExistingTransaction,
} from "@/components/dashboard/TransactionModal";

interface Transaction extends ExistingTransaction {
  categories: { name: string; color: string } | null;
  accounts: { name: string } | null;
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const router = useRouter();
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const catColor = tx.categories?.color || "#6366f1";
  const catInitial = tx.categories?.name?.charAt(0) || "T";

  async function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("transactions").delete().eq("id", tx.id);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3 py-3.5 border-b border-gray-800/40 last:border-0 group">
        {/* Category Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: catColor + "22", color: catColor }}
        >
          {catInitial}
        </div>

        {/* Description + Account */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {tx.note || tx.categories?.name || "Transaction"}
          </p>
          <p className="text-gray-500 text-xs">{tx.accounts?.name || "—"}</p>
        </div>

        {/* Category Name */}
        <p className="text-gray-400 text-xs w-32 truncate hidden md:block">
          {tx.categories?.name || "—"}
        </p>

        {/* Type Badge */}
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
            tx.type === "income" ?
              "bg-green-500/10 text-green-400"
            : "bg-red-500/10 text-red-400"
          }`}
        >
          {tx.type === "income" ? "Income" : "Expense"}
        </span>

        {/* Amount */}
        <p
          className={`text-sm font-semibold w-32 text-right flex-shrink-0 ${
            tx.type === "income" ? "text-green-400" : "text-red-400"
          }`}
        >
          PKR {Number(tx.amount).toLocaleString()}
        </p>

        {/* Date */}
        <p className="text-gray-500 text-xs w-24 text-right flex-shrink-0">
          {new Date(tx.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Edit / Delete — visible on row hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>

      {/* Edit Modal */}
      <TransactionModal
        open={editOpen}
        defaultType={tx.type}
        transaction={tx}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
