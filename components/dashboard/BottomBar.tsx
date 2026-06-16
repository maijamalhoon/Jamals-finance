"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

export default function BottomBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");

  function openAs(type: "income" | "expense") {
    setTxType(type);
    setOpen(true);
  }

  function handleSuccess() {
    setOpen(false);
    router.refresh(); // Re-fetches all server component data on the page
  }

  return (
    <>
      <div className="h-16 border-t border-white/[0.08] bg-[#0d121f]/92 backdrop-blur flex items-center justify-center gap-6 flex-shrink-0">
        <button
          onClick={() => openAs("income")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm font-medium hover:bg-green-500/20 transition-colors"
        >
          <ArrowDownLeft size={15} />
          Add Income
        </button>

        <button
          onClick={() => openAs("income")}
          className="w-12 h-12 rounded-lg bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center transition-colors shadow-lg shadow-indigo-950/35"
          aria-label="Add transaction"
        >
          <Plus size={22} className="text-white" />
        </button>

        <button
          onClick={() => openAs("expense")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          Add Expense
          <ArrowUpRight size={15} />
        </button>
      </div>

      <TransactionModal
        open={open}
        defaultType={txType}
        onClose={() => setOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
