"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
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
      <PageHeadingActionPortal page="goals">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="primary-action"
        >
          {showIcon ? <Target size={16} /> : null}
          <span className="sr-only">{label}</span>
        </button>
      </PageHeadingActionPortal>

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
