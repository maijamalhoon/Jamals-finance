"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import PayableModal from "./PayableModal";

export default function AddPayableButton() {
  const [open, setOpen] = useState(false);
  const label = "Add Payable";

  return (
    <>
      <PageHeadingActionPortal page="payables">
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="primary-action"
        >
          <Plus size={16} />
          <span className="sr-only">{label}</span>
        </button>
      </PageHeadingActionPortal>
      <PayableModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
