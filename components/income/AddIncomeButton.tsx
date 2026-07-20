"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";

interface AddIncomeButtonProps {
  label?: string;
  showIcon?: boolean;
}

export default function AddIncomeButton({
  label = "Add Income",
  showIcon = true,
}: AddIncomeButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeadingActionPortal page="income">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="success-action"
        >
          {showIcon ? <TrendingUp size={16} /> : null}
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
