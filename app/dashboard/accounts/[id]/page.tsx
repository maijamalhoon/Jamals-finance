import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Landmark,
  RotateCcw,
  TrendingUp,
} from "lucide-react";

import Money from "@/components/currency/Money";
import EmptyState from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  account_number: string | null;
  status: "active" | "archived";
  archived_at: string | null;
}

interface TransactionRow {
  id: string;
  type: "income" | "expense" | "investment" | "refund";
  amount: number;
  date: string;
  note: string | null;
  source_name: string | null;
  person_name: string | null;
  item_name: string | null;
  reference: string | null;
  categories: { name: string } | Array<{ name: string }> | null;
}

interface TransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  note: string | null;
  reference: string | null;
  from_account: { name: string } | Array<{ name: string }> | null;
  to_account: { name: string } | Array<{ name: string }> | null;
}

interface ActivityRow {
  id: string;
  date: string;
  title: string;
  detail: string;
  amount: number;
  tone: "income" | "expense" | "investment" | "refund" | "transfer-in" | "transfer-out";
  transactionId?: string;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function maskAccountNumber(value: string | null) {
  if (!value) return "No account number";
  const clean = value.replace(/\s+/g, "");
  return clean.length <= 4 ? clean : `**** ${clean.slice(-4)}`;
}

export default async function AccountHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [accountResult, transactionsResult, transfersResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, balance, account_number, status, archived_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, type, amount, date, note, reference, source_name, person_name, item_name, categories(name)")
      .eq("account_id", id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("account_transfers")
      .select(`
        id,
        from_account_id,
        to_account_id,
        amount,
        transfer_date,
        note,
        reference,
        from_account:from_account_id(name),
        to_account:to_account_id(name)
      `)
      .or(`from_account_id.eq.${id},to_account_id.eq.${id}`)
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!accountResult.data && !accountResult.error) notFound();

  if (accountResult.error) {
    console.error("Failed to load account history", { code: accountResult.error.code });
  }
  if (transactionsResult.error) {
    console.error("Failed to load account transactions", { code: transactionsResult.error.code });
  }
  if (transfersResult.error) {
    console.error("Failed to load account transfers", { code: transfersResult.error.code });
  }

  const account = accountResult.data as AccountRow | null;
  if (!account) notFound();

  const transactions = (transactionsResult.data ?? []) as unknown as TransactionRow[];
  const transfers = (transfersResult.data ?? []) as unknown as TransferRow[];
  const income = transactions
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const grossExpenses = transactions
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const refunds = transactions
    .filter((row) => row.type === "refund")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const netExpenses = grossExpenses - refunds;
  const investments = transactions
    .filter((row) => row.type === "investment")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const transferIn = transfers
    .filter((row) => row.to_account_id === account.id)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const transferOut = transfers
    .filter((row) => row.from_account_id === account.id)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const activity: ActivityRow[] = [
    ...transactions.map((row) => {
      const category = firstRelation(row.categories)?.name ?? "Uncategorized";
      return {
        id: `transaction-${row.id}`,
        date: row.date,
        title:
          row.type === "income"
            ? "Income"
            : row.type === "refund"
              ? "Expense refund"
            : row.type === "investment"
              ? "Investment contribution"
              : "Expense",
        detail:
          row.note?.trim() ||
          row.reference?.trim() ||
          row.item_name?.trim() ||
          row.source_name?.trim() ||
          row.person_name?.trim() ||
          category,
        amount: Number(row.amount),
        tone: row.type,
        transactionId: row.id,
      } satisfies ActivityRow;
    }),
    ...transfers.map((row) => {
      const incoming = row.to_account_id === account.id;
      const otherAccount = incoming
        ? firstRelation(row.from_account)?.name
        : firstRelation(row.to_account)?.name;
      return {
        id: `transfer-${row.id}`,
        date: row.transfer_date,
        title: incoming ? "Transfer received" : "Transfer sent",
        detail: row.note?.trim() || row.reference?.trim() || `${incoming ? "From" : "To"} ${otherAccount ?? "another account"}`,
        amount: Number(row.amount),
        tone: incoming ? "transfer-in" : "transfer-out",
      } satisfies ActivityRow;
    }),
  ].sort((left, right) => right.date.localeCompare(left.date));

  const dataPartial = Boolean(transactionsResult.error || transfersResult.error);

  return (
    <div className="space-y-5">
      <section className="page-heading finance-surface-glass overflow-hidden">
        <Link
          href="/dashboard/accounts"
          className="finance-focus mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to accounts
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="dashboard-list-card-kicker">
              <span className="dashboard-list-card-kicker-icon"><Landmark /></span>
              <span>{account.status === "archived" ? "Archived account" : "Account history"}</span>
            </div>
            <h2 className="page-title break-words">{account.name}</h2>
            <p className="page-subtitle">
              {maskAccountNumber(account.account_number)} · {activity.length} ledger entries
            </p>
          </div>
          <div className="finance-panel-soft min-w-[210px] p-4 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Current balance</p>
            <p className="finance-amount mt-1 text-2xl font-black text-text-primary"><Money amount={Number(account.balance)} /></p>
          </div>
        </div>
      </section>

      {dataPartial ? (
        <div role="status" className="finance-panel-soft border-warning/30 p-4 text-sm text-text-secondary">
          Some account activity could not be loaded. Totals shown below may be incomplete.
        </div>
      ) : null}

      <section aria-label="Account analytics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Income in", value: income, tone: "text-success", icon: ArrowDownLeft },
          { label: "Net expenses", value: netExpenses, tone: "text-danger", icon: ArrowUpRight },
          { label: "Refunds returned", value: refunds, tone: "text-info", icon: RotateCcw },
          { label: "Invested", value: investments, tone: "text-investment", icon: TrendingUp },
          { label: "Transfers in", value: transferIn, tone: "text-info", icon: ArrowLeftRight },
          { label: "Transfers out", value: transferOut, tone: "text-info", icon: ArrowLeftRight },
        ].map((metric) => (
          <div key={metric.label} className="finance-panel-soft min-w-0 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <metric.icon size={14} className={metric.tone} aria-hidden="true" />
              {metric.label}
            </div>
            <p className={`finance-amount mt-2 break-words text-lg font-black ${metric.tone}`}>
              <Money amount={metric.value} />
            </p>
          </div>
        ))}
      </section>

      <section className="finance-panel overflow-hidden" aria-labelledby="account-activity-heading">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 id="account-activity-heading" className="text-base font-bold text-text-primary">Full activity</h2>
          <p className="text-xs text-text-secondary">Income, expenses, investment contributions, and transfers.</p>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No account activity"
            description="Ledger entries for this account will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((row) => {
              const positive = row.tone === "income" || row.tone === "refund" || row.tone === "transfer-in";
              const neutral = row.tone === "investment";
              const content = (
                <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">{row.title}</p>
                    <p className="truncate text-xs text-text-secondary">
                      <time dateTime={row.date}>{formatDate(row.date)}</time> · {row.detail}
                    </p>
                  </div>
                  <p className={`finance-amount shrink-0 text-sm font-black ${
                    positive ? "text-success" : neutral ? "text-investment" : "text-danger"
                  }`}>
                    {positive ? "+" : "−"}<Money amount={row.amount} />
                  </p>
                </div>
              );
              return (
                <li key={row.id}>
                  {row.transactionId ? (
                    <Link className="finance-focus block hover:bg-hover" href={`/dashboard/transactions/${row.transactionId}`}>
                      {content}
                    </Link>
                  ) : content}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
