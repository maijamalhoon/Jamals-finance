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
import {
  listContainerVariants,
  listItemVariants,
  overlayVariants,
  panelVariants,
  pressableMotion,
} from "@/components/motion/animation-config";

type ActionKey = "income" | "expense" | "goal" | "transfer" | "investment";

const actions = [
  {
    key: "income",
    label: "Add Income",
    icon: TrendingUp,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconTone: "bg-emerald-300 text-slate-950",
  },
  {
    key: "expense",
    label: "Add Expense",
    icon: TrendingDown,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    iconTone: "bg-rose-300 text-slate-950",
  },
  {
    key: "goal",
    label: "Add Goal",
    icon: Target,
    tone: "border-lime-200 bg-lime-50 text-lime-700",
    iconTone: "bg-lime-300 text-slate-950",
  },
  {
    key: "transfer",
    label: "Transfer Money",
    icon: ArrowLeftRight,
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    iconTone: "bg-cyan-300 text-slate-950",
  },
  {
    key: "investment",
    label: "Add Investment",
    icon: BarChart2,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
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
                variants={overlayVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed inset-0 -z-10 cursor-default bg-background/80 lg:bg-transparent"
              />

              <motion.div
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="finance-panel w-[min(88vw,320px)] p-2"
              >
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-950">
                    Quick actions
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Add money movement, goals, and assets
                  </p>
                </div>
                <motion.div
                  className="grid gap-2"
                  variants={listContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {actions.map((action, index) => (
                    <motion.button
                      key={action.key}
                      type="button"
                      onClick={() => handleAction(action.key)}
                      variants={listItemVariants}
                      custom={index}
                      className={`finance-focus flex items-center justify-between rounded-[16px] border px-3 py-3 text-left text-sm font-semibold transition-all hover:bg-hover active:scale-[0.99] ${action.tone}`}
                    >
                      <span>{action.label}</span>
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-2xl ${action.iconTone}`}
                      >
                        <action.icon size={17} />
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          {...pressableMotion}
          onClick={() => setOpen((current) => !current)}
          className="finance-focus relative grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-[18px] bg-active text-background shadow-theme ring-1 ring-border transition hover:brightness-95"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="relative z-10"
          >
            {open ? <X size={23} /> : <Plus size={25} />}
          </motion.span>
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
