"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  Copy,
  Eye,
  FileText,
  Pencil,
  Printer,
  ReceiptText,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TransactionModal, {
  ExistingTransaction,
} from "@/components/dashboard/TransactionModal";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type TransactionType = "income" | "expense" | "transfer";

type Transaction = Omit<ExistingTransaction, "type"> & {
  type?: TransactionType | string | null;
  amount?: number | string | null;
  date?: string | null;
  note?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  categories: {
    name?: string | null;
    color?: string | null;
    parent?: { name?: string | null } | null;
  } | null;
  accounts: { name?: string | null } | null;
};

function getTypeMeta(type?: string | null): {
  label: string;
  icon: LucideIcon;
  accent: string;
  softClass: string;
  amountClass: string;
  prefix: string;
} {
  if (type === "income") {
    return {
      label: "Income",
      icon: TrendingUp,
      accent: "#16a34a",
      softClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
      amountClass: "text-emerald-600 dark:text-emerald-400",
      prefix: "+",
    };
  }

  if (type === "expense") {
    return {
      label: "Expense",
      icon: TrendingDown,
      accent: "#dc2626",
      softClass:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300",
      amountClass: "text-red-600 dark:text-red-400",
      prefix: "-",
    };
  }

  return {
    label: "Transfer",
    icon: ArrowLeftRight,
    accent: "#2563eb",
    softClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300",
    amountClass: "text-blue-600 dark:text-blue-400",
    prefix: "",
  };
}

function normalizeType(type?: string | null): TransactionType {
  if (type === "income" || type === "expense" || type === "transfer") {
    return type;
  }

  return "transfer";
}

function formatDate(date?: string | null, long = false) {
  if (!date) return "No date";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    weekday: long ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCategoryLabel(tx: Transaction) {
  const parentName = tx.categories?.parent?.name;
  const categoryName = tx.categories?.name;

  if (parentName && categoryName) return `${parentName} / ${categoryName}`;

  return categoryName || "Uncategorized";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const type = normalizeType(tx.type);
  const meta = getTypeMeta(type);
  const TypeIcon = meta.icon;
  const canEdit = type === "income" || type === "expense";

  const categoryLabel = getCategoryLabel(tx);
  const title = tx.note || tx.categories?.name || meta.label;
  const accountName = tx.accounts?.name || "No account";
  const displayAmount = `${meta.prefix}${formatCurrency(Number(tx.amount ?? 0))}`;

  const smallDetail = useMemo(() => {
    const details = [
      type === "income" && tx.source_name ? `Source: ${tx.source_name}` : null,
      tx.person_name ? `Person: ${tx.person_name}` : null,
      tx.item_name ? `Item: ${tx.item_name}` : null,
    ].filter(Boolean);

    return details.join(" • ");
  }, [tx.item_name, tx.person_name, tx.source_name, type]);

  useEffect(() => {
    if (!receiptOpen) return;

    const oldBodyOverflow = document.body.style.overflow;
    const oldHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldHtmlOverflow;
    };
  }, [receiptOpen]);

  function openReceipt() {
    if (typeof document !== "undefined") {
      const activeElement = document.activeElement;

      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
    }

    setReceiptOpen(true);
  }

  async function handleDelete() {
    if (!tx.id) return;

    if (!confirm("Delete this transaction? This cannot be undone.")) return;

    setDeleting(true);

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", tx.id);

    setDeleting(false);

    if (!error) router.refresh();
  }

  function copyReceipt() {
    const text = [
      `Type: ${meta.label}`,
      `Amount: ${displayAmount}`,
      `Date: ${formatDate(tx.date, true)}`,
      `Account: ${accountName}`,
      `Category: ${categoryLabel}`,
      `Note: ${tx.note || "No note"}`,
      tx.source_name ? `Source: ${tx.source_name}` : null,
      tx.person_name ? `Person: ${tx.person_name}` : null,
      tx.item_name ? `Item: ${tx.item_name}` : null,
      `Transaction ID: ${tx.id || "N/A"}`,
    ]
      .filter(Boolean)
      .join("\n");

    void navigator.clipboard.writeText(text);
  }

  function printReceipt() {
    const rows = [
      ["Type", meta.label],
      ["Amount", displayAmount],
      ["Date", formatDate(tx.date, true)],
      ["Account", accountName],
      ["Category", categoryLabel],
      ["Note", tx.note || "No note"],
      ["Source", tx.source_name || ""],
      ["Person", tx.person_name || ""],
      ["Item", tx.item_name || ""],
      ["Transaction ID", tx.id || "N/A"],
    ].filter(([, value]) => Boolean(value));

    const receiptWindow = window.open("", "_blank", "width=720,height=820");

    if (!receiptWindow) {
      window.print();
      return;
    }

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Transaction Receipt</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              background: #f8fafc;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .receipt {
              width: min(560px, calc(100vw - 32px));
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              padding: 28px;
              box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
            }

            .top {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding-bottom: 18px;
              margin-bottom: 18px;
              border-bottom: 1px solid #e2e8f0;
            }

            .brand {
              font-size: 12px;
              color: #64748b;
              font-weight: 800;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            h1 {
              margin: 6px 0 0;
              font-size: 24px;
            }

            .badge {
              height: fit-content;
              border-radius: 999px;
              padding: 8px 12px;
              font-size: 13px;
              font-weight: 800;
              color: ${meta.accent};
              background: color-mix(in srgb, ${meta.accent}, transparent 91%);
              border: 1px solid color-mix(in srgb, ${meta.accent}, transparent 72%);
            }

            .amount {
              margin: 18px 0;
              border-radius: 20px;
              padding: 20px;
              background: color-mix(in srgb, ${meta.accent}, transparent 93%);
              border: 1px solid color-mix(in srgb, ${meta.accent}, transparent 78%);
            }

            .amount span {
              display: block;
              color: #64748b;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .amount strong {
              display: block;
              margin-top: 6px;
              color: ${meta.accent};
              font-size: 32px;
              line-height: 1;
            }

            .row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 13px 0;
              border-bottom: 1px solid #eef2f7;
            }

            .row:last-child {
              border-bottom: 0;
            }

            .row span {
              color: #64748b;
              font-size: 13px;
              font-weight: 800;
            }

            .row strong {
              color: #0f172a;
              font-size: 13px;
              text-align: right;
              overflow-wrap: anywhere;
            }

            .footer {
              margin-top: 20px;
              color: #94a3b8;
              font-size: 12px;
              text-align: center;
            }

            @media print {
              body {
                background: white;
              }

              .receipt {
                box-shadow: none;
                width: 100%;
              }
            }
          </style>
        </head>

        <body>
          <main class="receipt">
            <section class="top">
              <div>
                <div class="brand">Jamal Finance</div>
                <h1>Transaction Receipt</h1>
              </div>

              <div class="badge">${escapeHtml(meta.label)}</div>
            </section>

            <section class="amount">
              <span>Amount</span>
              <strong>${escapeHtml(displayAmount)}</strong>
            </section>

            ${rows
              .map(
                ([label, value]) => `
                  <div class="row">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>
                `,
              )
              .join("")}

            <div class="footer">Generated from Jamal Finance</div>
          </main>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onMouseDown={(event) => event.preventDefault()}
        onClick={openReceipt}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openReceipt();
          }
        }}
        className="group grid cursor-pointer grid-cols-[auto,1fr] gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-hover hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 md:flex md:items-center"
      >
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105 ${meta.softClass}`}
        >
          <TypeIcon size={18} strokeWidth={2.4} />
        </div>

        <div className="min-w-0 md:flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-text-primary">
                {title}
              </p>

              <p className="mt-0.5 truncate text-xs font-medium text-text-secondary">
                {accountName}
              </p>

              {smallDetail ?
                <p className="mt-1 truncate text-[11px] text-text-secondary">
                  {smallDetail}
                </p>
              : null}
            </div>

            <p
              className={`shrink-0 text-right text-sm font-black md:hidden ${meta.amountClass}`}
            >
              {displayAmount}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
            <TypePill meta={meta} TypeIcon={TypeIcon} />

            <span className="rounded-full bg-hover px-2 py-1 text-[11px] font-medium text-text-secondary">
              {type === "income" && tx.source_name ?
                tx.source_name
              : categoryLabel}
            </span>

            <span className="text-[11px] font-medium text-text-secondary">
              {formatDate(tx.date)}
            </span>
          </div>
        </div>

        <p className="hidden w-32 truncate text-xs font-medium text-text-secondary md:block">
          {type === "income" && tx.source_name ? tx.source_name : categoryLabel}
        </p>

        <div className="hidden w-24 shrink-0 justify-center md:flex">
          <TypePill meta={meta} TypeIcon={TypeIcon} />
        </div>

        <p
          className={`hidden w-32 shrink-0 text-right text-sm font-black md:block ${meta.amountClass}`}
        >
          {displayAmount}
        </p>

        <p className="hidden w-24 shrink-0 text-right text-xs font-medium text-text-secondary md:block">
          {formatDate(tx.date)}
        </p>

        <div className="col-span-2 flex items-center justify-end gap-1.5 md:col-span-1 md:w-24 md:shrink-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              openReceipt();
            }}
            className="finance-focus grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:text-brand hover:shadow-md"
            aria-label="View receipt"
            title="View receipt"
            type="button"
          >
            <Eye size={14} />
          </button>

          {canEdit ?
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                setEditOpen(true);
              }}
              className="finance-focus grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
              aria-label="Edit transaction"
              title="Edit"
              type="button"
            >
              <Pencil size={14} />
            </button>
          : null}

          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              void handleDelete();
            }}
            disabled={deleting}
            className="finance-focus grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Delete transaction"
            title="Delete"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {receiptOpen ?
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-background/96 backdrop-blur-md dark:bg-background/96"
          onClick={() => setReceiptOpen(false)}
        >
          <div className="flex h-dvh w-full items-center justify-center p-3 sm:p-6">
            <div
              className="flex max-h-[calc(100dvh-24px)] w-full max-w-[920px] flex-col overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_28px_90px_rgba(15,23,42,0.20)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.48)] sm:max-h-[calc(100dvh-48px)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="shrink-0 border-b border-border p-5 sm:p-6"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${meta.accent}, transparent 88%), transparent 74%)`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${meta.softClass}`}
                    >
                      <ReceiptText size={22} strokeWidth={2.4} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
                        Transaction Preview
                      </p>

                      <h3 className="mt-1 truncate text-xl font-black text-text-primary sm:text-2xl">
                        {title}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-text-secondary sm:text-sm">
                        {formatDate(tx.date, true)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setReceiptOpen(false)}
                    className="finance-focus grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                    aria-label="Close receipt"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1.1fr,0.9fr]">
                  <div className="rounded-3xl border border-border bg-surface/88 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                      Amount
                    </p>

                    <p
                      className={`mt-2 text-4xl font-black ${meta.amountClass}`}
                    >
                      {displayAmount}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface/88 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                      Type
                    </p>

                    <div className="mt-3">
                      <TypePill meta={meta} TypeIcon={TypeIcon} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReceiptLine
                    icon={CalendarDays}
                    label="Date"
                    value={formatDate(tx.date, true)}
                  />

                  <ReceiptLine
                    icon={Wallet}
                    label="Account"
                    value={accountName}
                  />

                  <ReceiptLine
                    icon={FileText}
                    label="Category"
                    value={categoryLabel}
                  />

                  <ReceiptLine
                    icon={TypeIcon}
                    label="Type"
                    value={meta.label}
                  />

                  {tx.note ?
                    <ReceiptLine
                      icon={ReceiptText}
                      label="Note"
                      value={tx.note}
                    />
                  : null}

                  {tx.source_name ?
                    <ReceiptLine
                      icon={FileText}
                      label="Source"
                      value={tx.source_name}
                    />
                  : null}

                  {tx.person_name ?
                    <ReceiptLine
                      icon={FileText}
                      label="Person"
                      value={tx.person_name}
                    />
                  : null}

                  {tx.item_name ?
                    <ReceiptLine
                      icon={FileText}
                      label="Item"
                      value={tx.item_name}
                    />
                  : null}
                </div>
              </div>

              <div className="shrink-0 border-t border-border bg-background/45 p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={copyReceipt}
                    className="finance-focus inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold text-text-primary transition-all hover:-translate-y-0.5 hover:bg-hover"
                  >
                    <Copy size={16} />
                    Copy
                  </button>

                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={printReceipt}
                    className="finance-focus inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Printer size={16} />
                    Print / Save PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      : null}

      {canEdit ?
        <TransactionModal
          open={editOpen}
          defaultType={type}
          transaction={tx as ExistingTransaction}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      : null}
    </>
  );
}

function TypePill({
  meta,
  TypeIcon,
}: {
  meta: {
    label: string;
    softClass: string;
  };
  TypeIcon: LucideIcon;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.softClass}`}
    >
      <TypeIcon size={12} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}

function ReceiptLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/50 p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hover text-text-secondary">
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-text-primary">
          {value}
        </p>
      </div>
    </div>
  );
}
