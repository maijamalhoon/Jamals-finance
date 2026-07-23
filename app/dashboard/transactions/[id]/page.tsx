import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Hash,
  NotebookText,
  ReceiptText,
  RotateCcw,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
  ChartNoAxesCombined,
  type LucideIcon,
} from "@/components/icons/jalvoro/compat";

import TransactionReceiptActions from "@/components/transactions/TransactionReceiptActions";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  type CurrencyRates,
  type SupportedCurrency,
} from "@/lib/currency";
import { getExchangeRateSnapshot } from "@/lib/exchange-rate";
import { createClient } from "@/lib/supabase/server";

type ReceiptType =
  | "income"
  | "expense"
  | "investment"
  | "goal"
  | "refund"
  | "transfer";

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
  accountId: string;
  categoryId: string;
  refundedAmount: number;
  refundOfText: string;
  referenceText: string;
  statusText: string;
  receiptText: string;
};

type ReceiptCategory = {
  name?: string | null;
  color?: string | null;
  parent?: { name?: string | null } | null;
};

type ReceiptTransactionRow = {
  id: string;
  type: string;
  amount: number | string | null;
  account_id: string | null;
  category_id: string | null;
  refund_of_transaction_id: string | null;
  reference: string | null;
  note: string | null;
  date: string | null;
  created_at: string | null;
  source_name: string | null;
  person_name: string | null;
  item_name: string | null;
  accounts: { name?: string | null } | null;
  categories: ReceiptCategory | null;
};

type ReceiptTransactionBaseRow = Omit<
  ReceiptTransactionRow,
  "accounts" | "categories"
>;

type ReceiptTransferRow = {
  id: string;
  amount: number | string | null;
  transfer_date: string | null;
  note: string | null;
  reference: string | null;
  created_at: string | null;
  from_account: { name?: string | null } | null;
  to_account: { name?: string | null } | null;
};

type MoneyFormatter = (amount: number) => string;

const TYPE_META: Record<
  ReceiptType,
  {
    label: string;
    icon: LucideIcon;
    amountPrefix: string;
    accent: string;
  }
> = {
  income: {
    label: "Income",
    icon: TrendingUp,
    amountPrefix: "+",
    accent: "var(--income)",
  },
  expense: {
    label: "Expense",
    icon: TrendingDown,
    amountPrefix: "-",
    accent: "var(--expense)",
  },
  investment: {
    label: "Investment contribution",
    icon: ChartNoAxesCombined,
    amountPrefix: "-",
    accent: "var(--investment)",
  },
  goal: {
    label: "Goal contribution",
    icon: Target,
    amountPrefix: "",
    accent: "var(--goals)",
  },
  refund: {
    label: "Expense refund",
    icon: RotateCcw,
    amountPrefix: "+",
    accent: "var(--transfer)",
  },
  transfer: {
    label: "Transfer",
    icon: ArrowLeftRight,
    amountPrefix: "",
    accent: "var(--transfer)",
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

function getCategoryText(category: ReceiptCategory | null) {
  const parentName = category?.parent?.name;
  const categoryName = category?.name;

  if (parentName && categoryName) return `${parentName} / ${categoryName}`;
  return categoryName || "Uncategorized";
}

function buildReceiptText(receipt: Omit<ReceiptData, "receiptText">) {
  return [
    "Jamal's Finance - Transaction Receipt",
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
    receipt.refundOfText
      ? `Original Expense ID: ${receipt.refundOfText}`
      : null,
    receipt.referenceText ? `Reference: ${receipt.referenceText}` : null,
    `Status: ${receipt.statusText}`,
    `Receipt ID: ${receipt.id}`,
    receipt.createdText ? `Created: ${receipt.createdText}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeReceiptType(type: string): Exclude<ReceiptType, "transfer"> {
  if (type === "income") return "income";
  if (type === "investment") return "investment";
  if (type === "goal") return "goal";
  if (type === "refund") return "refund";
  return "expense";
}

function mapTransactionReceipt(
  transaction: ReceiptTransactionRow,
  money: MoneyFormatter,
): ReceiptData {
  const type = normalizeReceiptType(transaction.type);
  const meta = TYPE_META[type];
  const amount = Number(transaction.amount ?? 0);
  const title =
    type === "goal"
      ? transaction.item_name || transaction.note || meta.label
      : transaction.note ||
        transaction.source_name ||
        transaction.person_name ||
        transaction.item_name ||
        transaction.categories?.name ||
        meta.label;

  const baseReceipt: Omit<ReceiptData, "receiptText"> = {
    id: transaction.id,
    type,
    typeLabel: meta.label,
    title,
    amount,
    amountText: `${meta.amountPrefix}${money(amount)}`,
    dateText: formatDate(transaction.date),
    createdText: formatDate(transaction.created_at, true),
    accountText: transaction.accounts?.name || "No linked account",
    categoryText:
      type === "goal" && !transaction.categories
        ? "Savings goal"
        : getCategoryText(transaction.categories),
    noteText: transaction.note || "",
    sourceText: transaction.source_name || "",
    personText: transaction.person_name || "",
    itemText: transaction.item_name || "",
    transferFromText: "",
    transferToText: "",
    accountId: transaction.account_id || "",
    categoryId: transaction.category_id || "",
    refundedAmount: 0,
    refundOfText: transaction.refund_of_transaction_id || "",
    referenceText: transaction.reference || "",
    statusText: "Recorded",
  };

  return {
    ...baseReceipt,
    receiptText: buildReceiptText(baseReceipt),
  };
}

function mapTransferReceipt(
  transfer: ReceiptTransferRow,
  money: MoneyFormatter,
): ReceiptData {
  const meta = TYPE_META.transfer;
  const amount = Number(transfer.amount ?? 0);
  const baseReceipt: Omit<ReceiptData, "receiptText"> = {
    id: transfer.id,
    type: "transfer",
    typeLabel: meta.label,
    title: transfer.note || "Internal transfer",
    amount,
    amountText: money(amount),
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
    accountId: "",
    categoryId: "",
    refundedAmount: 0,
    refundOfText: "",
    referenceText: transfer.reference || "",
    statusText: "Recorded",
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
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="finance-panel-soft min-w-0 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
        <Icon size={15} strokeWidth={2.3} />
        {label}
      </div>
      <p className="break-words text-sm font-bold text-text-primary sm:text-base">
        {value}
      </p>
    </div>
  );
}

function createMoneyFormatter({
  currency,
  rates,
  usableRates,
}: {
  currency: SupportedCurrency;
  rates: CurrencyRates;
  usableRates: boolean;
}): MoneyFormatter {
  if (currency !== BASE_CURRENCY && !usableRates) return () => "—";

  return (amount) =>
    formatMoney(amount, {
      currency,
      fromCurrency: BASE_CURRENCY,
      rates,
    });
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

  if (!user) redirect("/login");

  const [profileResult, rateSnapshot] = await Promise.all([
    supabase
      .from("profiles")
      .select("preferred_currency")
      .eq("id", user.id)
      .maybeSingle(),
    getExchangeRateSnapshot(),
  ]);
  const currency = isSupportedCurrency(profileResult.data?.preferred_currency)
    ? profileResult.data.preferred_currency
    : BASE_CURRENCY;
  const usableRates =
    !rateSnapshot.source.startsWith("Built-in emergency") &&
    Number.isFinite(Date.parse(rateSnapshot.updatedAt)) &&
    Date.parse(rateSnapshot.updatedAt) > 0;
  const money = createMoneyFormatter({
    currency,
    rates: rateSnapshot.rates,
    usableRates,
  });

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select(
      "id, type, amount, account_id, category_id, refund_of_transaction_id, reference, note, date, created_at, source_name, person_name, item_name",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (transactionError) {
    console.error("Failed to load transaction receipt", {
      code: transactionError.code,
    });
    throw new Error("Transaction receipt could not be loaded.");
  }

  let account: ReceiptTransactionRow["accounts"] = null;
  let category: ReceiptCategory | null = null;

  if (transaction?.account_id) {
    const { data: accountRow, error: accountError } = await supabase
      .from("accounts")
      .select("name")
      .eq("id", transaction.account_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) {
      console.error("Failed to load receipt account label", {
        code: accountError.code,
      });
    } else {
      account = accountRow;
    }
  }

  if (transaction?.category_id) {
    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select("name,color,parent_id")
      .eq("id", transaction.category_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (categoryError) {
      console.error("Failed to load receipt category label", {
        code: categoryError.code,
      });
    } else if (categoryRow) {
      category = {
        name: categoryRow.name,
        color: categoryRow.color,
        parent: null,
      };

      if (categoryRow.parent_id) {
        const { data: parentRow, error: parentError } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryRow.parent_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (parentError) {
          console.error("Failed to load receipt parent category label", {
            code: parentError.code,
          });
        } else {
          category.parent = parentRow;
        }
      }
    }
  }

  let receipt: ReceiptData | null = transaction
    ? mapTransactionReceipt(
        {
          ...(transaction as ReceiptTransactionBaseRow),
          accounts: account,
          categories: category,
        },
        money,
      )
    : null;

  if (receipt?.type === "expense") {
    const { data: refunds, error: refundsError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("refund_of_transaction_id", receipt.id)
      .eq("user_id", user.id)
      .eq("type", "refund");

    if (refundsError) {
      console.error("Failed to load expense refunds", {
        code: refundsError.code,
      });
    } else {
      receipt.refundedAmount = (refunds ?? []).reduce(
        (sum, refund) => sum + Number(refund.amount ?? 0),
        0,
      );
    }
  }

  if (!receipt) {
    const { data: transfer, error: transferError } = await supabase
      .from("account_transfers")
      .select(
        "id, amount, transfer_date, note, reference, created_at, from_account:from_account_id(name), to_account:to_account_id(name)",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (transferError) {
      console.error("Failed to load transfer receipt", {
        code: transferError.code,
      });
      throw new Error("Transaction receipt could not be loaded.");
    }

    receipt = transfer
      ? mapTransferReceipt(transfer as unknown as ReceiptTransferRow, money)
      : null;
  }

  if (!receipt) notFound();

  const meta = TYPE_META[receipt.type];
  const TypeIcon = meta.icon;

  return (
    <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 pb-24 print:max-w-none">
      <div className="flex min-w-0 flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/transactions"
          className="finance-focus inline-flex min-h-11 w-fit items-center gap-2 rounded-[var(--oneui-control-radius)] border border-border bg-surface px-4 py-2.5 text-sm font-bold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:shadow-md"
        >
          <ArrowLeft size={17} strokeWidth={2.3} />
          Back to transactions
        </Link>

        <TransactionReceiptActions
          receiptText={receipt.receiptText}
          receiptId={receipt.id}
          refundExpense={
            receipt.type === "expense" &&
            receipt.accountId &&
            receipt.categoryId
              ? {
                  id: receipt.id,
                  title: receipt.title,
                  amount: receipt.amount,
                  refundedAmount: receipt.refundedAmount,
                  accountId: receipt.accountId,
                  categoryId: receipt.categoryId,
                }
              : undefined
          }
        />
      </div>

      <section
        className="finance-reference-card relative min-w-0 overflow-hidden print:border-none print:shadow-none"
        data-transaction-receipt
        data-receipt-tone={receipt.type}
        style={{ "--receipt-accent": meta.accent } as React.CSSProperties}
      >
        <div className="relative border-b border-border p-5 sm:p-7">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span
                className="grid size-14 shrink-0 place-items-center"
                style={{ color: meta.accent }}
              >
                <TypeIcon
                  size={28}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-secondary">
                  Transaction Receipt
                </p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                  {receipt.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-text-secondary">
                  Jamal&apos;s Finance • {receipt.typeLabel}
                </p>
              </div>
            </div>

            <span
              className="w-fit shrink-0 rounded-full border px-4 py-2 text-sm font-black"
              style={{
                color: meta.accent,
                borderColor: `color-mix(in srgb, ${meta.accent}, transparent 68%)`,
                backgroundColor: `color-mix(in srgb, ${meta.accent}, transparent 90%)`,
              }}
            >
              {receipt.typeLabel}
            </span>
          </div>
        </div>

        <div className="relative grid min-w-0 gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0 space-y-4">
            <div
              className="min-w-0 rounded-[var(--oneui-card-radius)] border p-5 sm:p-6"
              style={{
                borderColor: `color-mix(in srgb, ${meta.accent}, transparent 70%)`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${meta.accent}, transparent 91%), var(--card))`,
              }}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-text-secondary">
                Amount
              </p>
              <p
                className="mt-3 break-words text-3xl font-black tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-5xl"
                style={{ color: meta.accent }}
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

              {receipt.type === "transfer" ? (
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
              ) : (
                <>
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
              )}

              <DetailLine
                icon={NotebookText}
                label="Note"
                value={receipt.noteText || "No note"}
              />
              <DetailLine icon={Hash} label="Receipt ID" value={receipt.id} />
              <DetailLine
                icon={Hash}
                label="Reference"
                value={receipt.referenceText}
              />
              <DetailLine
                icon={CheckCircle2}
                label="Status"
                value={receipt.statusText}
              />

              {receipt.type === "expense" && receipt.refundedAmount > 0 ? (
                <DetailLine
                  icon={RotateCcw}
                  label="Refunded So Far"
                  value={money(receipt.refundedAmount)}
                />
              ) : null}

              <DetailLine
                icon={RotateCcw}
                label="Original Expense ID"
                value={receipt.refundOfText}
              />
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
