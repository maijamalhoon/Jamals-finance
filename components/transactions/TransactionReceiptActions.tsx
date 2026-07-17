"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import RefundModal, { type RefundExpense } from "./RefundModal";

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
      <div className="print:hidden flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {refundExpense && refundExpense.refundedAmount < refundExpense.amount ? (
          <Button type="button" variant="success" onClick={() => setRefundOpen(true)}>
            <RotateCcw size={16} aria-hidden="true" />
            Record refund
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleCopy}
          variant="outline"
          loading={copying}
          loadingLabel="Copying..."
        >
          {copied ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy receipt"}
        </Button>
        <Button type="button" variant="outline" onClick={handleDownload}>
          <Download size={16} aria-hidden="true" />
          Download
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          Print / Save PDF
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
