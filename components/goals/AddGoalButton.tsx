"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import GoalModal, { type GoalAccount } from "./GoalModal";

interface AddGoalButtonProps {
  accounts?: GoalAccount[];
  label?: string;
  showIcon?: boolean;
}

export default function AddGoalButton({
  accounts,
  label = "New Goal",
  showIcon = true,
}: AddGoalButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="primary-action"
      >
        {showIcon ? <Target size={16} /> : null}
        {label}
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
