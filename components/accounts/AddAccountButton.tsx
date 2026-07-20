"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import AccountModal from "./AccountModal";

interface AddAccountButtonProps {
  label?: string;
  showIcon?: boolean;
}

export default function AddAccountButton({
  label = "Add Account",
  showIcon = true,
}: AddAccountButtonProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeadingActionPortal page="accounts">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="primary-action"
        >
          {showIcon ? <Plus size={16} /> : null}
          {label}
        </button>
      </PageHeadingActionPortal>

      <AccountModal
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
