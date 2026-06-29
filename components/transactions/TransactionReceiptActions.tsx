"use client";

import { useState } from "react";
import { Copy, Printer } from "lucide-react";

export default function TransactionReceiptActions({
  receiptText,
}: {
  receiptText: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(receiptText);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1600);
  }

  return (
    <div className="print:hidden flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={handleCopy}
        className="finance-focus inline-flex h-11 items-center justify-center gap-2 rounded-[var(--oneui-control-radius)] border border-border bg-surface px-4 text-sm font-bold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:shadow-md"
      >
        <Copy size={16} />
        {copied ? "Copied" : "Copy receipt"}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="finance-focus inline-flex h-11 items-center justify-center gap-2 rounded-[var(--oneui-control-radius)] border border-active bg-active px-4 text-sm font-bold text-background shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <Printer size={16} />
        Print / Save PDF
      </button>
    </div>
  );
}
