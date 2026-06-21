"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart2,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import TransferModal from "@/components/accounts/TransferModal";
import TransactionModal from "@/components/dashboard/TransactionModal";
import GoalModal from "@/components/goals/GoalModal";
import InvestmentModal from "@/components/investments/InvestmentModal";

type ActionKey = "income" | "expense" | "goal" | "transfer" | "investment";

const actions = [
  {
    key: "income",
    label: "Add Income",
    icon: TrendingUp,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100/60",
    iconTone: "bg-emerald-300 text-slate-950",
  },
  {
    key: "expense",
    label: "Add Expense",
    icon: TrendingDown,
    tone: "border-rose-200 bg-rose-50 text-rose-700 shadow-rose-100/60",
    iconTone: "bg-rose-300 text-slate-950",
  },
  {
    key: "goal",
    label: "Add Goal",
    icon: Target,
    tone: "border-lime-200 bg-lime-50 text-lime-700 shadow-lime-100/60",
    iconTone: "bg-lime-300 text-slate-950",
  },
  {
    key: "transfer",
    label: "Transfer Money",
    icon: ArrowLeftRight,
    tone: "border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100/60",
    iconTone: "bg-cyan-300 text-slate-950",
  },
  {
    key: "investment",
    label: "Add Investment",
    icon: BarChart2,
    tone: "border-amber-200 bg-amber-50 text-amber-700 shadow-amber-100/60",
    iconTone: "bg-amber-300 text-slate-950",
  },
] satisfies Array<{
  key: ActionKey;
  label: string;
  icon: React.ElementType;
  tone: string;
  iconTone: string;
}>;

export default function FloatingActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");

  function handleAction(key: ActionKey) {
    setOpen(false);

    if (key === "income" || key === "expense") {
      setTxType(key);
      setTransactionOpen(true);
      return;
    }

    if (key === "goal") {
      setGoalOpen(true);
      return;
    }

    if (key === "transfer") {
      setTransferOpen(true);
      return;
    }

    setInvestmentOpen(true);
  }

  function refreshAfterSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 sm:right-6 lg:bottom-8 lg:right-8">
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                type="button"
                aria-label="Close quick actions"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 -z-10 cursor-default bg-black/30 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-0"
              />

              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="finance-glass-panel w-[min(88vw,320px)] p-2"
              >
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-950">
                    Quick actions
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Add money movement, goals, and assets
                  </p>
                </div>
                <div className="grid gap-2">
                  {actions.map((action, index) => (
                    <motion.button
                      key={action.key}
                      type="button"
                      onClick={() => handleAction(action.key)}
                      initial={{ opacity: 0, x: 18, scale: 0.94 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 18, scale: 0.94 }}
                      transition={{
                        delay: index * 0.035,
                        type: "spring",
                        stiffness: 320,
                        damping: 26,
                      }}
                      className={`finance-focus flex items-center justify-between rounded-[20px] border px-3 py-3 text-left text-sm font-semibold shadow-lg transition-all hover:-translate-x-1 hover:bg-white ${action.tone}`}
                    >
                      <span>{action.label}</span>
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-2xl ${action.iconTone}`}
                      >
                        <action.icon size={17} />
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen((current) => !current)}
          className="finance-focus relative grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-[22px] bg-blue-600 text-white shadow-[0_18px_42px_rgba(37,99,235,0.28)] ring-1 ring-blue-200 transition hover:bg-blue-700"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="relative z-10"
          >
            {open ? <X size={23} /> : <Plus size={25} />}
          </motion.span>
          {!open && (
            <motion.span
              animate={{ scale: [1, 1.75], opacity: [0.22, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="absolute inset-0 rounded-[24px] bg-cyan-200"
            />
          )}
        </motion.button>
      </div>

      <TransactionModal
        open={transactionOpen}
        defaultType={txType}
        onClose={() => setTransactionOpen(false)}
        onSuccess={() => {
          setTransactionOpen(false);
          refreshAfterSuccess();
        }}
      />
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={refreshAfterSuccess}
      />
      <GoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        onSuccess={refreshAfterSuccess}
      />
      <InvestmentModal
        open={investmentOpen}
        onClose={() => setInvestmentOpen(false)}
        onSuccess={refreshAfterSuccess}
      />
    </>
  );
}
