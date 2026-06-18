"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

export default function AddIncomeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="success-action"
      >
        <Plus size={16} />
        Add Income
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
