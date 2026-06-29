import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  Clock3,
  CreditCard,
  Hash,
  NotebookText,
  ReceiptText,
  Tag,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPKR } from "@/lib/finance-options";
import TransactionReceiptActions from "@/components/transactions/TransactionReceiptActions";

type ReceiptType = "income" | "expense" | "transfer";

type ReceiptData = {
  id: string;
  type: ReceiptType;
  typeLabel: string;
  title: string;
  amount: number;
  amountText: string;
  dateText: string;
  createdText: string;
  accountText: string;
  categoryText: string;
  noteText: string;
  sourceText: string;
  personText: string;
  itemText: string;
  transferFromText: string;
  transferToText: string;
  accent: string;
  receiptText: string;
};

const TYPE_META: Record<
  ReceiptType,
  {
    label: string;
    accent: string;
    icon: typeof TrendingUp;
    amountPrefix: string;
  }
> = {
  income: {
    label: "Income",
    accent: "#16a34a",
    icon: TrendingUp,
    amountPrefix: "+",
  },
  expense: {
    label: "Expense",
    accent: "#dc2626",
    icon: TrendingDown,
    amountPrefix: "-",
  },
  transfer: {
    label: "Transfer",
    accent: "#2563eb",
    icon: ArrowLeftRight,
    amountPrefix: "",
  },
};

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "No date";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
  });
}

function getCategoryText(category: any) {
  const parentName = category?.parent?.name;
  const categoryName = category?.name;

  if (parentName && categoryName) return `${parentName} / ${categoryName}`;

  return categoryName || "Uncategorized";
}

function buildReceiptText(receipt: Omit<ReceiptData, "receiptText">) {
  return [
    "Jamal Finance - Transaction Receipt",
    "",
    `Type: ${receipt.typeLabel}`,
    `Amount: ${receipt.amountText}`,
    `Date: ${receipt.dateText}`,
    receipt.accountText ? `Account: ${receipt.accountText}` : null,
    receipt.categoryText ? `Category: ${receipt.categoryText}` : null,
    receipt.transferFromText ? `From: ${receipt.transferFromText}` : null,
    receipt.transferToText ? `To: ${receipt.transferToText}` : null,
    receipt.noteText ? `Note: ${receipt.noteText}` : null,
    receipt.sourceText ? `Source: ${receipt.sourceText}` : null,
    receipt.personText ? `Person: ${receipt.personText}` : null,
    receipt.itemText ? `Item: ${receipt.itemText}` : null,
    `Transaction ID: ${receipt.id}`,
    receipt.createdText ? `Created: ${receipt.createdText}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function mapTransactionReceipt(transaction: any): ReceiptData {
  const type: ReceiptType =
    transaction.type === "income" ? "income" : "expense";
  const meta = TYPE_META[type];

  const baseReceipt: Omit<ReceiptData, "receiptText"> = {
    id: transaction.id,
    type,
    typeLabel: meta.label,
    title:
      transaction.note ||
      transaction.source_name ||
      transaction.person_name ||
      transaction.item_name ||
      transaction.categories?.name ||
      meta.label,
    amount: Number(transaction.amount ?? 0),
    amountText: `${meta.amountPrefix}${formatPKR(transaction.amount)}`,
    dateText: formatDate(transaction.date),
    createdText: formatDate(transaction.created_at, true),
    accountText: transaction.accounts?.name || "No account",
    categoryText: getCategoryText(transaction.categories),
    noteText: transaction.note || "",
    sourceText: transaction.source_name || "",
    personText: transaction.person_name || "",
    itemText: transaction.item_name || "",
    transferFromText: "",
    transferToText: "",
    accent: meta.accent,
  };

  return {
    ...baseReceipt,
    receiptText: buildReceiptText(baseReceipt),
  };
}

function mapTransferReceipt(transfer: any): ReceiptData {
  const meta = TYPE_META.transfer;

  const baseReceipt: Omit<ReceiptData, "receiptText"> = {
    id: transfer.id,
    type: "transfer" as const,
    typeLabel: meta.label,
    title: transfer.note || "Internal transfer",
    amount: Number(transfer.amount ?? 0),
    amountText: formatPKR(transfer.amount),
    dateText: formatDate(transfer.transfer_date),
    createdText: formatDate(transfer.created_at, true),
    accountText: "Internal transfer",
    categoryText: "Transfer",
    noteText: transfer.note || "",
    sourceText: "",
    personText: "",
    itemText: "",
    transferFromText: transfer.from_account?.name || "From account",
    transferToText: transfer.to_account?.name || "To account",
    accent: meta.accent,
  };

  return {
    ...baseReceipt,
    receiptText: buildReceiptText(baseReceipt),
  };
}

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="finance-panel-soft min-w-0 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
        <Icon size={15} />
        {label}
      </div>

      <p className="break-words text-sm font-bold text-text-primary sm:text-base">
        {value}
      </p>
    </div>
  );
}

export default async function TransactionReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: transaction } = await supabase
    .from("transactions")
    .select(
      `
      id,
      user_id,
      type,
      amount,
      note,
      date,
      created_at,
      source_name,
      person_name,
      item_name,
      accounts (
        name
      ),
      categories (
        name,
        color,
        parent:parent_id (
          name
        )
      )
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  let receipt: ReceiptData | null =
    transaction ? mapTransactionReceipt(transaction) : null;

  if (!receipt) {
    const { data: transfer } = await supabase
      .from("account_transfers")
      .select(
        `
        id,
        user_id,
        amount,
        transfer_date,
        note,
        created_at,
        from_account:from_account_id (
          name
        ),
        to_account:to_account_id (
          name
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    receipt = transfer ? mapTransferReceipt(transfer) : null;
  }

  if (!receipt) {
    notFound();
  }

  const TypeIcon = TYPE_META[receipt.type].icon;

  const receiptVars = {
    "--receipt-accent": receipt.accent,
  } as CSSProperties;

  return (
    <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 pb-24 print:max-w-none">
      <div className="print:hidden flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/transactions"
          className="finance-focus inline-flex w-fit items-center gap-2 rounded-[var(--oneui-control-radius)] border border-border bg-surface px-4 py-2.5 text-sm font-bold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:shadow-md"
        >
          <ArrowLeft size={17} />
          Back to transactions
        </Link>

        <TransactionReceiptActions receiptText={receipt.receiptText} />
      </div>

      <section
        className="finance-reference-card relative min-w-0 overflow-hidden print:border-none print:shadow-none"
        style={receiptVars}
      >
        <div className="relative border-b border-border p-5 sm:p-7">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl border"
                style={{
                  color: "var(--receipt-accent)",
                  borderColor:
                    "color-mix(in srgb, var(--receipt-accent), transparent 70%)",
                  backgroundColor:
                    "color-mix(in srgb, var(--receipt-accent), transparent 88%)",
                }}
              >
                <TypeIcon size={24} strokeWidth={2.4} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-secondary">
                  Transaction Receipt
                </p>

                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                  {receipt.title}
                </h1>

                <p className="mt-2 text-sm font-semibold text-text-secondary">
                  Jamal Finance • {receipt.typeLabel}
                </p>
              </div>
            </div>

            <div
              className="w-fit shrink-0 rounded-full border px-4 py-2 text-sm font-black"
              style={{
                color: "var(--receipt-accent)",
                borderColor:
                  "color-mix(in srgb, var(--receipt-accent), transparent 68%)",
                backgroundColor:
                  "color-mix(in srgb, var(--receipt-accent), transparent 90%)",
              }}
            >
              {receipt.typeLabel}
            </div>
          </div>
        </div>

        <div className="relative grid min-w-0 gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0 space-y-4">
            <div
              className="min-w-0 rounded-[var(--oneui-card-radius)] border p-5 sm:p-6"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--receipt-accent), transparent 70%)",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--receipt-accent), transparent 91%), var(--card))",
              }}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-text-secondary">
                Amount
              </p>

              <p
                className="mt-3 break-words text-3xl font-black tracking-tight [overflow-wrap:anywhere] sm:text-5xl"
                style={{ color: "var(--receipt-accent)" }}
              >
                {receipt.amountText}
              </p>

              <p className="mt-2 text-sm font-semibold text-text-secondary">
                {receipt.dateText}
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <DetailLine
                icon={CalendarDays}
                label="Transaction Date"
                value={receipt.dateText}
              />

              <DetailLine
                icon={Clock3}
                label="Created"
                value={receipt.createdText}
              />

              {receipt.type === "transfer" ?
                <>
                  <DetailLine
                    icon={Wallet}
                    label="From Account"
                    value={receipt.transferFromText}
                  />

                  <DetailLine
                    icon={CreditCard}
                    label="To Account"
                    value={receipt.transferToText}
                  />
                </>
              : <>
                  <DetailLine
                    icon={Wallet}
                    label="Account"
                    value={receipt.accountText}
                  />

                  <DetailLine
                    icon={Tag}
                    label="Category"
                    value={receipt.categoryText}
                  />
                </>
              }

              <DetailLine
                icon={NotebookText}
                label="Note"
                value={receipt.noteText || "No note"}
              />

              <DetailLine icon={Hash} label="Receipt ID" value={receipt.id} />
            </div>
          </div>

          <aside className="finance-panel-soft min-w-0 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-text-secondary">
              Extra Details
            </p>

            <div className="mt-4 space-y-3">
              <DetailLine
                icon={ReceiptText}
                label="Type"
                value={receipt.typeLabel}
              />

              <DetailLine
                icon={UserRound}
                label="Source"
                value={receipt.sourceText}
              />

              <DetailLine
                icon={UserRound}
                label="Person"
                value={receipt.personText}
              />

              <DetailLine
                icon={ReceiptText}
                label="Item"
                value={receipt.itemText}
              />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
