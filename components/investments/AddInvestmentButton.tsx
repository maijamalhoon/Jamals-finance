"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import InvestmentModal from "./InvestmentModal";

interface AddInvestmentButtonProps {
  label?: string;
  showIcon?: boolean;
}

export default function AddInvestmentButton({
  label = "Add Investment",
  showIcon = true,
}: AddInvestmentButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeadingActionPortal page="investments">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="investment-action w-full sm:w-auto"
        >
          {showIcon ? <BriefcaseBusiness size={16} /> : null}
          {label}
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
