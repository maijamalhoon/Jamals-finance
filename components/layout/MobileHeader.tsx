"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  Menu,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { NAV_ITEMS, QUICK_ACTION_ITEMS } from "@/lib/navigation";
import TransactionModal from "@/components/dashboard/TransactionModal";

export default function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const actionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setActionOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        actionRef.current &&
        !actionRef.current.contains(event.target as Node)
      ) {
        setActionOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openTransaction(type: "income" | "expense") {
    setTxType(type);
    setActionOpen(false);
    setModalOpen(true);
  }

  return (
    <>
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0b1118]/96 px-3 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="finance-focus grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.055] text-slate-300"
            aria-label="Open navigation"
          >
            <Menu size={17} />
          </button>
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-300/20">
            <BarChart3 size={16} />
          </div>
          <span className="truncate text-sm font-semibold text-white">
            Jamal's Finance
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen((current) => !current)}
              className="finance-focus grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.1] bg-white/[0.07] text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
              aria-label="Open quick actions"
            >
              <Plus size={17} />
            </button>

            <AnimatePresence>
              {actionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="finance-glass-panel absolute right-0 top-11 z-50 w-64 overflow-hidden p-2"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="grid h-8 w-8 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-200">
                      <CircleDollarSign size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Quick entry
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Add a transaction
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 grid gap-2">
                    <button
                      onClick={() => openTransaction("income")}
                      className="finance-focus flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/12 px-3 py-3 text-left text-sm font-semibold text-emerald-100"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-300 text-slate-950">
                        <TrendingUp size={17} />
                      </span>
                      Add Income
                    </button>
                    <button
                      onClick={() => openTransaction("expense")}
                      className="finance-focus flex items-center gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/12 px-3 py-3 text-left text-sm font-semibold text-rose-100"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-300 text-slate-950">
                        <TrendingDown size={17} />
                      </span>
                      Add Expense
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            className="finance-focus finance-control relative flex h-9 w-9 items-center justify-center"
            aria-label="Open notifications"
          >
            <Bell size={14} className="text-slate-300" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/25">
            J
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(86vw,360px)] flex-col border-r border-white/[0.1] bg-[#0b1118] shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-300/20">
                  <BarChart3 size={17} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    Jamal's Finance
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Personal finance OS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="finance-focus grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.055] text-slate-300"
                aria-label="Close navigation"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Navigation
              </p>
              <nav className="space-y-1.5">
                {NAV_ITEMS.map(({ label, href, icon: Icon, tone }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`finance-focus flex items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
                        active
                          ? "border-cyan-300/20 bg-white/[0.075] text-white"
                          : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-white"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-lg ${
                          active ? tone : "bg-white/[0.045] text-slate-500"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>

              <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Quick Categories
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTION_ITEMS.map(({ label, href, icon: Icon, tone }) => (
                  <Link
                    key={label}
                    href={href}
                    className="finance-focus flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.045] px-3 py-3 text-sm text-slate-300"
                  >
                    <span
                      className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${tone}`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
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
