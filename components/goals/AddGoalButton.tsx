"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import GoalModal, { type GoalAccount } from "./GoalModal";

export default function AddGoalButton({ accounts }: { accounts: GoalAccount[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="primary-action"
      >
        <Target size={16} />
        New Goal
      </button>

      <GoalModal
        accounts={accounts}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
