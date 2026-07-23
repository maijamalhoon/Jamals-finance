"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingDown } from "@/components/icons/jalvoro/compat";
import TransactionModal from "@/components/dashboard/TransactionModal";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";

interface AddExpenseButtonProps {
  label?: string;
  showIcon?: boolean;
  icon?: "expense" | "plus";
}

export default function AddExpenseButton({
  label = "Add Expense",
  showIcon = true,
  icon = "expense",
}: AddExpenseButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ActionIcon = icon === "plus" ? Plus : TrendingDown;

  return (
    <>
      <PageHeadingActionPortal page="expenses">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="danger-action"
        >
          {showIcon ? <ActionIcon size={16} /> : null}
          <span className="sr-only">{label}</span>
        </button>
      </PageHeadingActionPortal>

      <TransactionModal
        open={open}
        defaultType="expense"
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
