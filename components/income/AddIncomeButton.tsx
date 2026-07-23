"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp } from "@/components/icons/jalvoro/compat";
import TransactionModal from "@/components/dashboard/TransactionModal";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";

interface AddIncomeButtonProps {
  label?: string;
  showIcon?: boolean;
  icon?: "income" | "plus";
}

export default function AddIncomeButton({
  label = "Add Income",
  showIcon = true,
  icon = "income",
}: AddIncomeButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ActionIcon = icon === "plus" ? Plus : TrendingUp;

  return (
    <>
      <PageHeadingActionPortal page="income">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="success-action"
        >
          {showIcon ? <ActionIcon size={16} /> : null}
          <span className="sr-only">{label}</span>
        </button>
      </PageHeadingActionPortal>

      <TransactionModal
        open={open}
        defaultType="income"
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
