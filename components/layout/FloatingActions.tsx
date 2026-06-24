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
} from "@/components/motion/animation-config";

type ActionKey = "income" | "expense" | "goal" | "transfer" | "investment";

const actions = [
  {
    key: "income",
    label: "Add Income",
    icon: TrendingUp,
    tone:
      "border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-700 hover:border-emerald-500/25 hover:bg-emerald-500/[0.12] dark:text-emerald-200",
    iconTone:
      "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  },
  {
    key: "expense",
    label: "Add Expense",
    icon: TrendingDown,
    tone:
      "border-rose-500/15 bg-rose-500/[0.08] text-rose-700 hover:border-rose-500/25 hover:bg-rose-500/[0.12] dark:text-rose-200",
    iconTone:
      "border-rose-500/20 bg-rose-500/15 text-rose-700 dark:text-rose-200",
  },
  {
    key: "goal",
    label: "Add Goal",
    icon: Target,
    tone:
      "border-violet-500/15 bg-violet-500/[0.08] text-violet-700 hover:border-violet-500/25 hover:bg-violet-500/[0.12] dark:text-violet-200",
    iconTone:
      "border-violet-500/20 bg-violet-500/15 text-violet-700 dark:text-violet-200",
  },
  {
    key: "transfer",
    label: "Transfer Money",
    icon: ArrowLeftRight,
    tone:
      "border-cyan-500/15 bg-cyan-500/[0.08] text-cyan-700 hover:border-cyan-500/25 hover:bg-cyan-500/[0.12] dark:text-cyan-200",
    iconTone:
      "border-cyan-500/20 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
  },
  {
    key: "investment",
    label: "Add Investment",
    icon: BarChart2,
    tone:
      "border-amber-500/15 bg-amber-500/[0.08] text-amber-700 hover:border-amber-500/25 hover:bg-amber-500/[0.12] dark:text-amber-200",
    iconTone:
      "border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-200",
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
                role="group"
                aria-label="Quick finance actions"
                className="finance-panel w-[min(88vw,292px)] p-2"
              >
                <div className="px-2.5 pb-2 pt-1">
                  <p className="text-[13px] font-semibold text-text-primary">
                    Quick actions
                  </p>
                </div>
                <motion.div
                  className="grid gap-1.5"
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
                      className={`finance-focus group flex min-h-11 items-center gap-2.5 rounded-[14px] border px-2.5 py-2 text-left text-sm font-semibold shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] active:translate-y-0 active:scale-[0.985] ${action.tone}`}
                    >
                      <span
                        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[12px] border transition-transform duration-200 group-hover:scale-105 ${action.iconTone}`}
                      >
                        <action.icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {action.label}
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
          whileHover={{ y: -2, scale: 1.045 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
          onClick={() => setOpen((current) => !current)}
          className={`finance-focus relative grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-[20px] bg-active text-background shadow-[0_18px_38px_color-mix(in_srgb,var(--active),transparent_70%)] ring-1 ring-active/25 transition-all duration-200 hover:shadow-[0_20px_44px_color-mix(in_srgb,var(--active),transparent_62%)] ${
            open ? "brightness-105" : "hover:brightness-105"
          }`}
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.32),transparent_34%)]" />
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative z-10"
          >
            <Plus size={25} strokeWidth={2.45} />
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
