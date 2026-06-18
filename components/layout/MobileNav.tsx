"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

const NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { label: "Accounts", href: "/dashboard/accounts", icon: WalletCards },
  { label: "Goals", href: "/dashboard/goals", icon: Target },
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

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <>
      {fabOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
            onClick={() => setFabOpen(false)}
          />
          <div className="fixed bottom-[5.25rem] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-3 lg:hidden">
            <button
              onClick={() => openTx("income")}
              className="success-action min-w-44 shadow-lg shadow-emerald-950/25"
            >
              <TrendingUp size={16} />
              Add Income
            </button>
            <button
              onClick={() => openTx("expense")}
              className="danger-action min-w-44 shadow-lg shadow-rose-950/25"
            >
              <TrendingDown size={16} />
              Add Expense
            </button>
          </div>
        </>
      )}

      <div className="relative z-30 flex h-[68px] flex-shrink-0 items-center justify-around border-t border-white/[0.08] bg-[#111720]/94 px-2 shadow-[0_-12px_36px_rgba(0,0,0,0.22)] backdrop-blur-2xl lg:hidden">
        {NAV.slice(0, 2).map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`finance-focus flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-colors ${
              isActive(href)
                ? "bg-white/[0.055] text-cyan-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        <button
          onClick={() => setFabOpen((p) => !p)}
          className="finance-focus flex h-[52px] w-[52px] items-center justify-center rounded-[24px] bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/35 transition-all hover:bg-cyan-200"
          aria-label={fabOpen ? "Close quick actions" : "Open quick actions"}
        >
          {fabOpen ? <X size={20} /> : <Plus size={22} />}
        </button>

        {NAV.slice(2).map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`finance-focus flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-colors ${
              isActive(href)
                ? "bg-white/[0.055] text-cyan-300"
                : "text-slate-500 hover:text-slate-300"
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
