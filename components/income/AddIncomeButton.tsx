"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="success-action"
      >
        {showIcon ? <TrendingUp size={16} /> : null}
        {label}
      </button>

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
