"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown } from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

interface AddExpenseButtonProps {
  label?: string;
  showIcon?: boolean;
}

export default function AddExpenseButton({
  label = "Add Expense",
  showIcon = true,
}: AddExpenseButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="danger-action"
      >
        {showIcon ? <TrendingDown size={16} /> : null}
        {label}
      </button>

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
