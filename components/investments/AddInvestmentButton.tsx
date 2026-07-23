"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Plus } from "@/components/icons/jalvoro/compat";

import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";

import InvestmentModal, { type ExistingInvestment } from "./InvestmentModal";

interface AddInvestmentButtonProps {
  label?: string;
  showIcon?: boolean;
  icon?: "investment" | "plus";
  investments?: ExistingInvestment[];
}

export default function AddInvestmentButton({
  label = "Add Investment",
  showIcon = true,
  icon = "investment",
}: AddInvestmentButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ActionIcon = icon === "plus" ? Plus : BriefcaseBusiness;

  return (
    <>
      <PageHeadingActionPortal page="investments">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="investment-action w-auto"
        >
          {showIcon ? <ActionIcon size={16} /> : null}
          <span className="sr-only">{label}</span>
        </button>
      </PageHeadingActionPortal>

      <InvestmentModal
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
