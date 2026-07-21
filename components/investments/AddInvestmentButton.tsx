"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, BriefcaseBusiness } from "lucide-react";

import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import { useLiveInvestmentRows } from "@/components/investments/useLiveInvestmentRows";

import InvestmentModal, { type ExistingInvestment } from "./InvestmentModal";
import InvestmentWithdrawModal from "./InvestmentWithdrawModal";

interface AddInvestmentButtonProps {
  label?: string;
  showIcon?: boolean;
  investments?: ExistingInvestment[];
}

export default function AddInvestmentButton({
  label = "Add Investment",
  showIcon = true,
  investments = [],
}: AddInvestmentButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const liveInvestments = useLiveInvestmentRows(investments);

  return (
    <>
      <PageHeadingActionPortal page="investments">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={label}
            onClick={() => setOpen(true)}
            className="investment-action w-auto"
          >
            {showIcon ? <BriefcaseBusiness size={16} /> : null}
            <span className="sr-only">{label}</span>
          </button>

          {liveInvestments.length > 0 ? (
            <button
              type="button"
              aria-label="Withdraw investment"
              onClick={() => setWithdrawOpen(true)}
              className="investment-action w-auto"
            >
              <ArrowDownToLine size={16} />
              <span className="sr-only">Withdraw investment</span>
            </button>
          ) : null}
        </div>
      </PageHeadingActionPortal>

      <InvestmentModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />

      <InvestmentWithdrawModal
        open={withdrawOpen}
        investments={liveInvestments}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={() => {
          setWithdrawOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
