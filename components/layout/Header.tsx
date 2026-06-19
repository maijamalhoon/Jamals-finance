"use client";

import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  CircleDollarSign,
  Search,
  Settings,
  LogOut,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import TransferModal from "@/components/accounts/TransferModal";
import TransactionModal from "@/components/dashboard/TransactionModal";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(query.trim())}`,
    );
    setQuery("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function openTransaction(type: "income" | "expense") {
    setTxType(type);
    setActionOpen(false);
    setModalOpen(true);
  }

  function openTransfer() {
    setActionOpen(false);
    setTransferOpen(true);
  }

  return (
    <>
      <div className="relative z-40 flex h-[68px] flex-shrink-0 items-center justify-between border-b border-white/[0.10] bg-[#171a21]/86 px-6 shadow-[0_14px_44px_rgba(0,0,0,0.20)] backdrop-blur-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-white">
              {getGreeting()}, Jamal
            </h1>
          </div>
          <p className="text-xs text-slate-400">Command center is ready</p>
        </div>

        <div
          className="absolute left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2"
          ref={actionRef}
        >
          <button
            onClick={() => {
              setActionOpen((p) => !p);
              setBellOpen(false);
              setProfileOpen(false);
            }}
            className="finance-focus grid h-12 w-12 place-items-center rounded-[22px] border border-white/[0.14] bg-white text-[#111318] shadow-[0_16px_42px_rgba(0,0,0,0.28)] transition duration-200 ease-out hover:bg-slate-100"
            aria-label="Open quick actions"
          >
            <Plus size={21} strokeWidth={2.4} />
          </button>

          <AnimatePresence>
            {actionOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="finance-glass-panel absolute left-1/2 top-14 z-[120] w-72 -translate-x-1/2 overflow-hidden p-2"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="grid h-8 w-8 place-items-center rounded-[15px] bg-white/[0.08] text-white/80">
                    <CircleDollarSign size={15} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Quick entry
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Transactions and account transfers
                    </p>
                  </div>
                </div>
                <div className="mt-1 grid gap-2">
                  <button
                    onClick={() => openTransaction("income")}
                    className="finance-focus flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/12 px-3 py-3 text-left text-sm font-semibold text-emerald-100 transition duration-200 ease-out hover:bg-emerald-400/18"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-300 text-slate-950">
                      <TrendingUp size={17} />
                    </span>
                    Add Income
                  </button>
                  <button
                    onClick={() => openTransaction("expense")}
                    className="finance-focus flex items-center gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/12 px-3 py-3 text-left text-sm font-semibold text-rose-100 transition duration-200 ease-out hover:bg-rose-400/18"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-300 text-slate-950">
                      <TrendingDown size={17} />
                    </span>
                    Add Expense
                  </button>
                  <button
                    onClick={openTransfer}
                    className="finance-focus flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/12 px-3 py-3 text-left text-sm font-semibold text-cyan-100 transition duration-200 ease-out hover:bg-cyan-400/18"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
                      <ArrowLeftRight size={17} />
                    </span>
                    Transfer Money
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <form
            onSubmit={handleSearch}
            className="finance-control finance-focus flex w-72 items-center gap-2 px-3 py-2"
          >
            <Search size={13} className="flex-shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-slate-500"
            />
          </form>

          <div className="finance-control flex items-center gap-2 px-3 py-2 text-xs text-slate-300">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <ChevronDown size={12} className="text-slate-500" />
          </div>

          <div className="relative" ref={bellRef}>
            <button
              onClick={() => {
                setBellOpen((p) => !p);
                setProfileOpen(false);
              }}
              className="finance-control finance-focus relative flex h-9 w-9 items-center justify-center"
              aria-label="Open notifications"
            >
              <Bell size={15} className="text-slate-300" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#171a21] bg-emerald-300" />
            </button>

            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="finance-panel absolute right-0 top-11 z-[120] w-72 overflow-hidden"
              >
                <div className="border-b border-white/[0.08] p-4">
                  <p className="text-sm font-semibold text-white">
                    Notifications
                  </p>
                </div>
                <div className="p-4 py-8 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-sm text-slate-400">No new notifications</p>
                  <p className="mt-1 text-xs text-slate-600">
                    You're all caught up
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen((p) => !p);
                setBellOpen(false);
              }}
              className="finance-focus flex h-10 w-10 items-center justify-center rounded-[18px] bg-white text-sm font-bold text-[#111318] shadow-lg shadow-black/20 transition hover:bg-slate-100"
              aria-label="Open profile menu"
            >
              J
            </button>

            {profileOpen && (
              <div className="finance-panel absolute right-0 top-11 z-[120] w-52 overflow-hidden">
                <div className="border-b border-white/[0.08] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] bg-white text-sm font-bold text-[#111318]">
                      J
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">Jamal</p>
                      <p className="truncate text-xs text-slate-500">
                        jamal@example.com
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      router.push("/dashboard/settings");
                      setProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Settings size={15} />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
