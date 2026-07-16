"use client";

import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function TransactionReceiptActions({
  receiptText,
}: {
  receiptText: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  async function handleCopy() {
    if (copying) return;
    setCopying(true);

    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      toast.success("Receipt copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the receipt. Please try again.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="print:hidden flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Button
        type="button"
        onClick={handleCopy}
        variant="outline"
        loading={copying}
        loadingLabel="Copying…"
      >
        {copied ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy receipt"}
      </Button>

      <Button type="button" onClick={() => window.print()}>
        <Printer size={16} aria-hidden="true" />
        Print / Save PDF
      </Button>
    </div>
  );
}
