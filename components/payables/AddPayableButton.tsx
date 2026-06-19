"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import PayableModal from "./PayableModal";

export default function AddPayableButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="primary-action">
        <Plus size={16} />
        Add Payable
      </button>
      <PayableModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
