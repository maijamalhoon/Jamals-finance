import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarRange,
  CircleDollarSign,
  Scale,
  ShieldCheck,
} from "lucide-react";

import CreateJournalEntryForm from "@/components/business/CreateJournalEntryForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Accounting",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  business_type: string;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_balance: "debit" | "credit";
  allow_manual_posting: boolean;
  is_active: boolean;
};

type TrialBalanceRow = {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  total_debit: number | string;
  total_credit: number | string;
  balance: number | string;
};

type JournalRow = {
  id: string;
  journal_number: number;
  entry_date: string;
  description: string;
  reference: string | null;
  transaction_currency: string;
  exchange_rate: number | string;
  total_debit_base: number | string;
  status: string;
};

type FiscalPeriodRow = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: string;
};

const ACCOUNT_TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"] as const;

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default async function BusinessAccountingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/accounting`)}`);
  }

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, business_type")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const canManageAccounting =
    ["owner", "admin", "accountant"].includes(membershipResult.data.role) ||
    membershipResult.data.permissions?.includes("*") ||
    membershipResult.data.permissions?.includes("accounting.manage");

  const [settingsResult, periodsResult, accountsResult, trialBalanceResult, journalsResult] =
    await Promise.all([
      supabase
        .from("business_accounting_settings")
        .select("accounting_basis, rounding_scale, next_journal_number")
        .eq("business_id", business.id)
        .maybeSingle(),
      supabase
        .from("business_fiscal_periods")
        .select("id, name, starts_on, ends_on, status")
        .eq("business_id", business.id)
        .order("starts_on", { ascending: false }),
      supabase
        .from("business_chart_of_accounts")
        .select(
          "id, code, name, account_type, normal_balance, allow_manual_posting, is_active",
        )
        .eq("business_id", business.id)
        .order("code", { ascending: true }),
      supabase
        .from("business_trial_balance")
        .select(
          "account_id, code, name, account_type, normal_balance, total_debit, total_credit, balance",
        )
        .eq("business_id", business.id)
        .order("code", { ascending: true }),
      supabase
        .from("business_journal_entries")
        .select(
          "id, journal_number, entry_date, description, reference, transaction_currency, exchange_rate, total_debit_base, status",
        )
        .eq("business_id", business.id)
        .eq("status", "posted")
        .order("entry_date", { ascending: false })
        .order("journal_number", { ascending: false })
        .limit(30),
    ]);

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const trialBalance = (trialBalanceResult.data ?? []) as TrialBalanceRow[];
  const journals = (journalsResult.data ?? []) as JournalRow[];
  const periods = (periodsResult.data ?? []) as FiscalPeriodRow[];
  const openPeriod = periods.find((period) => period.status === "open") ?? null;
  const settings = settingsResult.data;
  const postingAccounts = accounts
    .filter((account) => account.is_active && account.allow_manual_posting)
    .map(({ id, code, name }) => ({ id, code, name }));
  const totalDebit = trialBalance.reduce((sum, row) => sum + Number(row.total_debit), 0);
  const totalCredit = trialBalance.reduce((sum, row) => sum + Number(row.total_credit), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.000001;

  const loadError =
    settingsResult.error ||
    periodsResult.error ||
    accountsResult.error ||
    trialBalanceResult.error ||
    journalsResult.error;

  if (loadError) {
    console.error("Business accounting workspace load failed", { code: loadError.code });
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/business/${business.slug}`}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {business.name}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Double-entry controls active
          </span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {formatLabel(business.business_type)} accounting
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Accounting workspace
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Chart of accounts, fiscal periods, journals, currency conversion, and trial balance use
            one tenant-scoped accounting source of truth.
          </p>
        </header>

        {loadError ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Some accounting information could not be loaded. No records were changed.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Base currency</p>
            <strong className="mt-1 block text-xl font-black text-text-primary">
              {business.base_currency}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <BookOpenCheck className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Chart accounts</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {accounts.length}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CalendarRange className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Open fiscal period</p>
            <strong className="mt-1 block truncate text-base font-black text-text-primary">
              {openPeriod?.name ?? "Not configured"}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Scale className={`size-5 ${balanced ? "text-success" : "text-danger"}`} aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Trial balance</p>
            <strong className={`mt-1 block text-base font-black ${balanced ? "text-success" : "text-danger"}`}>
              {balanced ? "Balanced" : "Review required"}
            </strong>
          </article>
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:px-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>
              Basis: <strong className="text-text-primary">{formatLabel(settings?.accounting_basis ?? "accrual")}</strong>
            </span>
            <span>
              Precision: <strong className="text-text-primary">{settings?.rounding_scale ?? 2} decimals</strong>
            </span>
            <span>
              Next journal: <strong className="text-text-primary">#{settings?.next_journal_number ?? 1}</strong>
            </span>
            {openPeriod ? (
              <span>
                Period: <strong className="text-text-primary">{formatDate(openPeriod.starts_on)} – {formatDate(openPeriod.ends_on)}</strong>
              </span>
            ) : null}
          </div>
        </section>

        {canManageAccounting ? (
          <div className="mt-8">
            <CreateJournalEntryForm
              businessId={business.id}
              baseCurrency={business.base_currency}
              accounts={postingAccounts}
            />
          </div>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5 text-sm text-text-secondary">
            Your role has read-only accounting access. Owners, admins, and accountants can post journals.
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Financial control</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Trial balance</h2>
            </div>
            <div className="text-right text-xs text-text-secondary">
              <span className="block">Debit {formatMoney(totalDebit, business.base_currency)}</span>
              <span className="mt-1 block">Credit {formatMoney(totalCredit, business.base_currency)}</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-secondary text-xs uppercase tracking-[0.08em] text-text-tertiary">
                <tr>
                  <th className="px-4 py-3 font-black">Code</th>
                  <th className="px-4 py-3 font-black">Account</th>
                  <th className="px-4 py-3 font-black">Type</th>
                  <th className="px-4 py-3 text-right font-black">Debit</th>
                  <th className="px-4 py-3 text-right font-black">Credit</th>
                  <th className="px-4 py-3 text-right font-black">Normal balance</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row) => (
                  <tr key={row.account_id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono font-bold text-text-primary">{row.code}</td>
                    <td className="px-4 py-3 font-semibold text-text-primary">{row.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatLabel(row.account_type)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                      {formatMoney(row.total_debit, business.base_currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                      {formatMoney(row.total_credit, business.base_currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-text-primary">
                      {formatMoney(row.balance, business.base_currency)}
                    </td>
                  </tr>
                ))}
                {trialBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                      The trial balance will appear after the accounting foundation is initialized.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Ledger structure</p>
          <h2 className="mt-1 text-xl font-black text-text-primary">Chart of accounts</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {ACCOUNT_TYPE_ORDER.map((accountType) => {
              const rows = accounts.filter((account) => account.account_type === accountType);
              if (rows.length === 0) return null;
              return (
                <article
                  key={accountType}
                  className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-text-primary">{formatLabel(accountType)}</h3>
                    <span className="text-sm font-black tabular-nums text-text-secondary">{rows.length}</span>
                  </div>
                  <div className="mt-4 divide-y divide-border/60">
                    {rows.map((account) => (
                      <div key={account.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="w-14 shrink-0 font-mono text-xs font-black text-primary">
                          {account.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                          {account.name}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {account.allow_manual_posting ? "Posting" : "Control"}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 pb-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Audit trail</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Posted journals</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">{journals.length}</span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-secondary text-xs uppercase tracking-[0.08em] text-text-tertiary">
                <tr>
                  <th className="px-4 py-3 font-black">Journal</th>
                  <th className="px-4 py-3 font-black">Date</th>
                  <th className="px-4 py-3 font-black">Description</th>
                  <th className="px-4 py-3 font-black">Reference</th>
                  <th className="px-4 py-3 text-right font-black">Amount</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((journal) => (
                  <tr key={journal.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono font-black text-primary">
                      #{journal.journal_number}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(journal.entry_date)}</td>
                    <td className="max-w-sm truncate px-4 py-3 font-semibold text-text-primary">
                      {journal.description}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{journal.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-black tabular-nums text-text-primary">
                      {formatMoney(journal.total_debit_base, business.base_currency)}
                    </td>
                  </tr>
                ))}
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                      No journals have been posted yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
