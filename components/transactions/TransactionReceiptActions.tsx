"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Printer, RotateCcw } from "@/components/icons/jalvoro/compat";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createReceiptPdfBlob, downloadBlob } from "@/lib/client-download";
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
    try {
      const blob = createReceiptPdfBlob(receiptText);
      downloadBlob(blob, `jamals-finance-receipt-${receiptId}.pdf`);
      toast.success("Receipt PDF downloaded");
    } catch {
      toast.error("Could not download the receipt. Please try again.");
    }
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
          <span>Download PDF</span>
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
