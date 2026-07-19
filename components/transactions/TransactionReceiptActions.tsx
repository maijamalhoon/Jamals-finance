"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import RefundModal, { type RefundExpense } from "./RefundModal";

const receiptIconProps = {
  size: 17,
  strokeWidth: 2.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export default function TransactionReceiptActions({
  receiptText,
  receiptId,
  refundExpense,
}: {
  receiptText: string;
  receiptId: string;
  refundExpense?: RefundExpense;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

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

  function handleDownload() {
    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `jamals-finance-receipt-${receiptId}.txt`;
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  }

  return (
    <>
      <div
        data-receipt-actions
        className="print:hidden flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      >
        {refundExpense && refundExpense.refundedAmount < refundExpense.amount ? (
          <Button
            type="button"
            variant="success"
            onClick={() => setRefundOpen(true)}
            className="receipt-action receipt-action-refund"
          >
            <RotateCcw {...receiptIconProps} />
            <span>Record refund</span>
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleCopy}
          variant="outline"
          loading={copying}
          loadingLabel="Copying..."
          className="receipt-action"
        >
          {copied ? (
            <Check {...receiptIconProps} />
          ) : (
            <Copy {...receiptIconProps} />
          )}
          <span>{copied ? "Copied" : "Copy receipt"}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          className="receipt-action"
        >
          <Download {...receiptIconProps} />
          <span>Download</span>
        </Button>
        <Button
          type="button"
          onClick={() => window.print()}
          className="receipt-action receipt-action-primary"
        >
          <Printer {...receiptIconProps} />
          <span>Print / Save PDF</span>
        </Button>
      </div>
      {refundExpense ? (
        <RefundModal
          open={refundOpen}
          expense={refundExpense}
          onClose={() => setRefundOpen(false)}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
