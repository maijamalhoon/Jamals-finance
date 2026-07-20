"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import PayableModal from "./PayableModal";

export default function AddPayableButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeadingActionPortal page="payables">
        <button type="button" onClick={() => setOpen(true)} className="primary-action">
          <Plus size={16} />
          Add Payable
        </button>
      </PageHeadingActionPortal>
      <PayableModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
