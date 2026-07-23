"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target } from "@/components/icons/jalvoro/compat";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import GoalModal, { type GoalAccount } from "./GoalModal";

interface AddGoalButtonProps {
  accounts?: GoalAccount[];
  label?: string;
  showIcon?: boolean;
  icon?: "goal" | "plus";
}

export default function AddGoalButton({
  accounts,
  label = "New Goal",
  showIcon = true,
  icon = "goal",
}: AddGoalButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ActionIcon = icon === "plus" ? Plus : Target;

  return (
    <>
      <PageHeadingActionPortal page="goals">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="primary-action"
        >
          {showIcon ? <ActionIcon size={16} /> : null}
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
