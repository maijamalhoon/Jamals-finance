"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  Target,
  Settings,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

const NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { label: "Goals", href: "/dashboard/goals", icon: Target },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [fabOpen, setFabOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");

  function openTx(type: "income" | "expense") {
    setTxType(type);
    setFabOpen(false);
    setModalOpen(true);
  }

  return (
    <>
      {/* FAB action menu */}
      {fabOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setFabOpen(false)}
          />
          <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
            <button
              onClick={() => openTx("income")}
              className="flex items-center gap-3 px-5 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-green-950/30 transition-colors"
            >
              <TrendingUp size={16} />
              Add Income
            </button>
            <button
              onClick={() => openTx("expense")}
              className="flex items-center gap-3 px-5 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-950/30 transition-colors"
            >
              <TrendingDown size={16} />
              Add Expense
            </button>
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <div className="lg:hidden h-16 bg-[#0d121f]/95 border-t border-white/[0.08] flex items-center justify-around px-2 flex-shrink-0 relative z-30 backdrop-blur">
        {NAV.slice(0, 2).map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              pathname === href ? "text-indigo-400" : (
                "text-slate-500 hover:text-slate-300"
              )
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* Center FAB */}
        <button
          onClick={() => setFabOpen((p) => !p)}
          className="w-12 h-12 rounded-lg bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/35 transition-all"
          aria-label={fabOpen ? "Close quick actions" : "Open quick actions"}
        >
          {fabOpen ?
            <X size={20} className="text-white" />
          : <Plus size={22} className="text-white" />}
        </button>

        {NAV.slice(2).map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              pathname === href ? "text-indigo-400" : (
                "text-slate-500 hover:text-slate-300"
              )
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <TransactionModal
        open={modalOpen}
        defaultType={txType}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
