"use client";

import { type FormEvent, useMemo, useState } from "react";
import { BookCheck, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type PostingAccount = {
  id: string;
  code: string;
  name: string;
};

type JournalLineState = {
  key: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
};

type CreateJournalEntryFormProps = {
  businessId: string;
  baseCurrency: string;
  accounts: PostingAccount[];
};

const SUPPORTED_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"];

function newLine(index: number): JournalLineState {
  return {
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    accountId: "",
    description: "",
    debit: "",
    credit: "",
  };
}

function todayKey() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function amountValue(value: string) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export default function CreateJournalEntryForm({
  businessId,
  baseCurrency,
  accounts,
}: CreateJournalEntryFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [entryDate, setEntryDate] = useState(todayKey);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState("1");
  const [lines, setLines] = useState<JournalLineState[]>([newLine(1), newLine(2)]);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () =>
      lines.reduce(
        (current, line) => ({
          debit: current.debit + amountValue(line.debit),
          credit: current.credit + amountValue(line.credit),
        }),
        { debit: 0, credit: 0 },
      ),
    [lines],
  );

  const balanced = totals.debit > 0 && Math.abs(totals.debit - totals.credit) < 0.000001;

  function updateLine(key: string, patch: Partial<JournalLineState>) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.debit && Number(patch.debit) > 0) next.credit = "";
        if (patch.credit && Number(patch.credit) > 0) next.debit = "";
        return next;
      }),
    );
  }

  function addLine() {
    setLines((current) =>
      current.length >= 20 ? current : [...current, newLine(current.length + 1)],
    );
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length <= 2 ? current : current.filter((line) => line.key !== key),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (description.trim().length < 2) {
      toast.error("Add a clear journal description.");
      return;
    }

    if (!balanced) {
      toast.error("Debit and credit totals must balance before posting.");
      return;
    }

    if (
      lines.some(
        (line) =>
          !line.accountId ||
          (amountValue(line.debit) <= 0 && amountValue(line.credit) <= 0),
      )
    ) {
      toast.error("Every journal line needs an account and one positive amount.");
      return;
    }

    const rate = Number(exchangeRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Enter a valid exchange rate greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc("post_business_journal_entry", {
        p_business_id: businessId,
        p_entry_date: entryDate,
        p_description: description.trim(),
        p_reference: reference.trim() || null,
        p_source_type: "manual",
        p_source_id: null,
        p_transaction_currency: currency,
        p_exchange_rate: currency === baseCurrency ? 1 : rate,
        p_lines: lines.map((line) => ({
          account_id: line.accountId,
          description: line.description.trim() || null,
          debit: amountValue(line.debit),
          credit: amountValue(line.credit),
        })),
      });

      if (error) {
        console.error("Journal posting failed", { code: error.code });
        toast.error("Journal could not be posted. Check the period, accounts, and totals.");
        return;
      }

      setDescription("");
      setReference("");
      setCurrency(baseCurrency);
      setExchangeRate("1");
      setLines([newLine(1), newLine(2)]);
      toast.success("Balanced journal entry posted.");
      router.refresh();
    } catch {
      toast.error("Journal could not be posted. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <BookCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-text-primary sm:text-lg">Post a journal entry</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            The database posts only when transaction and base-currency debits equal credits.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Entry date</span>
            <Input
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              disabled={saving}
              required
            />
          </label>
          <label className="space-y-2 md:col-span-1 xl:col-span-2">
            <span className="text-sm font-bold text-text-primary">Description</span>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: Owner capital deposited into bank"
              maxLength={500}
              disabled={saving}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Reference</span>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional"
              maxLength={120}
              disabled={saving}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Transaction currency</span>
            <select
              value={currency}
              onChange={(event) => {
                const nextCurrency = event.target.value;
                setCurrency(nextCurrency);
                if (nextCurrency === baseCurrency) setExchangeRate("1");
              }}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">
              1 {currency} in {baseCurrency}
            </span>
            <Input
              value={exchangeRate}
              onChange={(event) => setExchangeRate(event.target.value)}
              inputMode="decimal"
              placeholder="1"
              disabled={saving || currency === baseCurrency}
              required
            />
          </label>
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface-secondary">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-text-tertiary">
                <th className="px-4 py-3 font-black">Account</th>
                <th className="px-4 py-3 font-black">Line description</th>
                <th className="w-36 px-4 py-3 text-right font-black">Debit</th>
                <th className="w-36 px-4 py-3 text-right font-black">Credit</th>
                <th className="w-14 px-2 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className="border-t border-border/50">
                  <td className="px-4 py-2.5">
                    <select
                      value={line.accountId}
                      onChange={(event) => updateLine(line.key, { accountId: event.target.value })}
                      className="field-input min-h-10 w-full min-w-56"
                      disabled={saving}
                      required
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <Input
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                      placeholder="Optional"
                      maxLength={240}
                      disabled={saving}
                      className="min-h-10"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Input
                      value={line.debit}
                      onChange={(event) => updateLine(line.key, { debit: event.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      disabled={saving}
                      className="min-h-10 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Input
                      value={line.credit}
                      onChange={(event) => updateLine(line.key, { credit: event.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      disabled={saving}
                      className="min-h-10 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove journal line"
                      onClick={() => removeLine(line.key)}
                      disabled={saving || lines.length <= 2}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-black text-text-primary">
                <td colSpan={2} className="px-4 py-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addLine}
                    disabled={saving || lines.length >= 20}
                  >
                    <Plus className="size-4" aria-hidden="true" /> Add line
                  </Button>
                </td>
                <td className="px-4 py-4 text-right tabular-nums">
                  {totals.debit.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td className="px-4 py-4 text-right tabular-nums">
                  {totals.credit.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`text-sm font-bold ${balanced ? "text-success" : "text-text-secondary"}`}
            aria-live="polite"
          >
            {balanced
              ? `Balanced in ${currency}`
              : "Debit and credit totals must be equal and greater than zero."}
          </span>
          <Button
            type="submit"
            size="lg"
            loading={saving}
            loadingLabel="Posting journal..."
            disabled={saving || !balanced || accounts.length < 2}
          >
            <BookCheck className="size-4" aria-hidden="true" /> Post journal
          </Button>
        </div>
      </form>
    </section>
  );
}
