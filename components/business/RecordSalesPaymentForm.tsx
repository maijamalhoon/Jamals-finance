"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CircleDollarSign, ShieldCheck } from "@/components/icons/jalvoro/compat";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type OpenInvoiceOption = {
  id: string;
  code: string;
  customerName: string;
  currency: string;
  outstanding: number;
  invoiceDate: string;
};

type PaymentAccountOption = {
  id: string;
  code: string;
  name: string;
};

type RecordSalesPaymentFormProps = {
  businessId: string;
  invoices: OpenInvoiceOption[];
  paymentAccounts: PaymentAccountOption[];
};

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function requestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function RecordSalesPaymentForm({
  businessId,
  invoices,
  paymentAccounts,
}: RecordSalesPaymentFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const firstInvoice = invoices[0] ?? null;
  const idempotencyKey = useRef(requestKey());
  const [invoiceId, setInvoiceId] = useState(firstInvoice?.id ?? "");
  const [paymentDate, setPaymentDate] = useState(localDateString);
  const [amount, setAmount] = useState(firstInvoice ? String(firstInvoice.outstanding) : "");
  const [paymentAccountId, setPaymentAccountId] = useState(paymentAccounts[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId) ?? null;

  function handleInvoiceChange(nextInvoiceId: string) {
    setInvoiceId(nextInvoiceId);
    const invoice = invoices.find((item) => item.id === nextInvoiceId);
    setAmount(invoice ? String(invoice.outstanding) : "");
    if (invoice && paymentDate < invoice.invoiceDate) setPaymentDate(invoice.invoiceDate);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!selectedInvoice || !paymentAccountId) {
      toast.error("Select an open invoice and a cash or bank account.");
      return;
    }

    const parsedAmount = Number(amount);
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > selectedInvoice.outstanding
    ) {
      toast.error(`Payment must be between 0 and ${selectedInvoice.outstanding.toFixed(2)}.`);
      return;
    }

    if (!paymentDate || paymentDate < selectedInvoice.invoiceDate) {
      toast.error("Payment date cannot be before the invoice date.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("record_business_sales_payment", {
      p_business_id: businessId,
      p_invoice_id: selectedInvoice.id,
      p_payment_date: paymentDate,
      p_amount: parsedAmount,
      p_payment_account_id: paymentAccountId,
      p_reference: reference.trim() || null,
      p_idempotency_key: idempotencyKey.current,
    });
    setSaving(false);

    if (error) {
      console.error("Sales payment recording failed", { code: error.code });
      toast.error("Payment was not posted. Invoice and accounting balances remain unchanged.");
      return;
    }

    idempotencyKey.current = requestKey();
    setReference("");
    toast.success("Payment received and Accounts Receivable updated.");
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-success-soft text-success">
          <Banknote className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black text-text-primary sm:text-lg">Record customer payment</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Partial and final receipts post Cash or Bank against Accounts Receivable and cannot exceed
            the invoice balance.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Open invoice</span>
            <select
              value={invoiceId}
              onChange={(event) => handleInvoiceChange(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
              required
            >
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.code} · {invoice.customerName} · {invoice.currency} {invoice.outstanding.toFixed(2)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Payment date</span>
            <Input
              type="date"
              value={paymentDate}
              min={selectedInvoice?.invoiceDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Amount</span>
            <div className="relative">
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="pr-14"
                disabled={saving}
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-text-tertiary">
                {selectedInvoice?.currency ?? ""}
              </span>
            </div>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Deposit to</span>
            <select
              value={paymentAccountId}
              onChange={(event) => setPaymentAccountId(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
              required
            >
              {paymentAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-text-primary">Reference</span>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Receipt, bank reference, or cheque number"
              maxLength={160}
              disabled={saving}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            Outstanding balance, currency rounding, journal posting, and final AR closure are enforced
            by PostgreSQL.
          </span>
          <Button
            type="submit"
            loading={saving}
            loadingLabel="Posting payment..."
            disabled={!selectedInvoice || paymentAccounts.length === 0}
            className="sm:w-auto"
          >
            <CircleDollarSign aria-hidden="true" />
            Post payment
          </Button>
        </div>
      </form>
    </section>
  );
}
