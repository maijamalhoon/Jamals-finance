import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  ContactRound,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
} from "@/components/icons/jalvoro/compat";

import CreateSalesInvoiceForm from "@/components/business/CreateSalesInvoiceForm";
import RecordSalesPaymentForm from "@/components/business/RecordSalesPaymentForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Sales",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  business_type: string;
  workspace_mode: "advanced_company" | "simple_shop";
  timezone: string;
};

type ContactRow = {
  id: string;
  display_name: string;
  currency: string;
  payment_terms_days: number;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  system_key: string | null;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  invoice_code: string;
  invoice_date: string;
  due_date: string;
  status: "issued" | "partially_paid" | "paid";
  currency: string;
  exchange_rate: number | string;
  subtotal_transaction: number | string;
  discount_transaction: number | string;
  tax_transaction: number | string;
  total_transaction: number | string;
  paid_transaction: number | string;
  returned_transaction: number | string;
  total_base: number | string;
  paid_base: number | string;
  returned_base: number | string;
  journal_entry_id: string | null;
  issued_at: string | null;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function invoicePresentation(invoice: InvoiceRow, today: string) {
  const total = Number(invoice.total_transaction);
  const paid = Number(invoice.paid_transaction);
  const returned = Number(invoice.returned_transaction);
  const balance = Math.max(0, total - paid - returned);
  const overdue = balance > 0 && invoice.due_date < today;
  if (overdue) return { label: "Overdue", className: "bg-danger-soft text-danger", balance };
  if (balance === 0 && returned > 0) {
    return {
      label: paid > 0 ? "Settled after return" : "Returned",
      className: "bg-success-soft text-success",
      balance,
    };
  }
  if (balance === 0) return { label: "Paid", className: "bg-success-soft text-success", balance };
  if (paid > 0 || returned > 0) {
    return { label: "Partially settled", className: "bg-warning-soft text-warning", balance };
  }
  return { label: "Issued", className: "bg-primary-soft text-primary", balance };
}

export default async function BusinessSalesPage({
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
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/sales`)}`);
  }

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, business_type, workspace_mode, timezone")
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

  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const canManageSales =
    ["owner", "admin", "accountant", "manager", "sales"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("sales.manage");
  const canCollectPayments =
    canManageSales || role === "cashier" || permissions.includes("sales.collect");

  const [settingsResult, contactsResult, revenueResult, paymentAccountsResult, invoicesResult] =
    await Promise.all([
      supabase
        .from("business_accounting_settings")
        .select("accounting_basis, rounding_scale")
        .eq("business_id", business.id)
        .maybeSingle(),
      supabase
        .from("business_contacts")
        .select("id, display_name, currency, payment_terms_days")
        .eq("business_id", business.id)
        .eq("status", "active")
        .in("contact_type", ["customer", "both"])
        .order("display_name", { ascending: true }),
      supabase
        .from("business_chart_of_accounts")
        .select("id, code, name, system_key")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .in("system_key", ["sales_revenue", "service_revenue"])
        .order("code", { ascending: true }),
      supabase
        .from("business_chart_of_accounts")
        .select("id, code, name, system_key")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .in("system_key", ["cash", "bank"])
        .order("code", { ascending: true }),
      supabase
        .from("business_sales_invoices")
        .select(
          "id, customer_id, invoice_code, invoice_date, due_date, status, currency, exchange_rate, subtotal_transaction, discount_transaction, tax_transaction, total_transaction, paid_transaction, returned_transaction, total_base, paid_base, returned_base, journal_entry_id, issued_at",
        )
        .eq("business_id", business.id)
        .order("invoice_date", { ascending: false })
        .order("invoice_number", { ascending: false })
        .limit(100),
    ]);

  const settings = settingsResult.data;
  const contacts = (contactsResult.data ?? []) as ContactRow[];
  const revenueAccounts = (revenueResult.data ?? []) as AccountRow[];
  const paymentAccounts = (paymentAccountsResult.data ?? []) as AccountRow[];
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
  const contactNames = new Map(contacts.map((contact) => [contact.id, contact.display_name]));
  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: business.timezone,
  }).format(new Date());

  const openInvoices = invoices
    .map((invoice) => ({
      id: invoice.id,
      code: invoice.invoice_code,
      customerName: contactNames.get(invoice.customer_id) ?? "Customer",
      currency: invoice.currency,
      outstanding: Math.max(
        0,
        Number(invoice.total_transaction) -
          Number(invoice.paid_transaction) -
          Number(invoice.returned_transaction),
      ),
      invoiceDate: invoice.invoice_date,
    }))
    .filter((invoice) => invoice.outstanding > 0);

  const totalInvoicedBase = invoices.reduce((sum, invoice) => sum + Number(invoice.total_base), 0);
  const totalReturnedBase = invoices.reduce((sum, invoice) => sum + Number(invoice.returned_base), 0);
  const totalPaidBase = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_base), 0);
  const netSalesBase = Math.max(0, totalInvoicedBase - totalReturnedBase);
  const outstandingBase = Math.max(0, netSalesBase - totalPaidBase);
  const overdueCount = invoices.filter((invoice) => {
    const presentation = invoicePresentation(invoice, today);
    return presentation.balance > 0 && invoice.due_date < today;
  }).length;

  const loadError = [
    settingsResult.error,
    contactsResult.error,
    revenueResult.error,
    paymentAccountsResult.error,
    invoicesResult.error,
  ].find(Boolean);

  if (loadError) {
    console.error("Business sales workspace load failed", { code: loadError.code });
  }

  const accrualReady = settings?.accounting_basis === "accrual";

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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/business/${business.slug}/inventory`}
              className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-3 text-sm font-black text-primary transition-colors hover:bg-primary-soft"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Sales returns
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Invoice-to-ledger controls active
            </span>
          </div>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {formatLabel(business.business_type)} revenue cycle
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Sales and invoices
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Invoices, inventory issues, receipts, returns, customer credits, and return-adjusted
            receivables use one atomic tenant-scoped workflow.
          </p>
        </header>

        {loadError ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Some sales information could not be loaded. No invoice, payment, return, or journal was changed.
          </section>
        ) : null}

        {!accrualReady ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-warning-soft px-4 py-4 text-sm text-warning">
            Automated invoice posting is paused because this company is not using accrual accounting.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <ReceiptText className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Issued invoices</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {invoices.length}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Net invoiced</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">
              {formatMoney(netSalesBase, business.base_currency)}
            </strong>
            <span className="mt-1 block text-xs text-text-secondary">
              Returns {formatMoney(totalReturnedBase, business.base_currency)}
            </span>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Banknote className="size-5 text-success" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Outstanding</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">
              {formatMoney(outstandingBase, business.base_currency)}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CalendarClock
              className={`size-5 ${overdueCount > 0 ? "text-danger" : "text-success"}`}
              aria-hidden="true"
            />
            <p className="mt-4 text-xs font-bold text-text-secondary">Overdue</p>
            <strong
              className={`mt-1 block text-xl font-black tabular-nums ${
                overdueCount > 0 ? "text-danger" : "text-success"
              }`}
            >
              {overdueCount}
            </strong>
          </article>
        </section>

        {accrualReady && canManageSales ? (
          contacts.length > 0 && revenueAccounts.length > 0 ? (
            <div className="mt-8">
              <CreateSalesInvoiceForm
                businessId={business.id}
                baseCurrency={business.base_currency}
                customers={contacts.map((contact) => ({
                  id: contact.id,
                  name: contact.display_name,
                  currency: contact.currency,
                  paymentTermsDays: contact.payment_terms_days,
                }))}
                revenueAccounts={revenueAccounts.map((account) => ({
                  id: account.id,
                  code: account.code,
                  name: account.name,
                }))}
              />
            </div>
          ) : (
            <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-6">
              <ContactRound className="size-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 font-black text-text-primary">Add a customer first</h2>
              <p className="mt-1 text-sm text-text-secondary">
                An issued invoice requires an active tenant-scoped customer and revenue account.
              </p>
              <Link
                href={`/business/${business.slug}/contacts`}
                className="finance-focus mt-4 inline-flex min-h-10 items-center rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
              >
                Open contacts
              </Link>
            </section>
          )
        ) : null}

        {accrualReady && canCollectPayments && openInvoices.length > 0 && paymentAccounts.length > 0 ? (
          <div className="mt-8">
            <RecordSalesPaymentForm
              businessId={business.id}
              invoices={openInvoices}
              paymentAccounts={paymentAccounts.map((account) => ({
                id: account.id,
                code: account.code,
                name: account.name,
              }))}
            />
          </div>
        ) : null}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Receivables register
              </p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Recent invoices</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">
              {invoices.length}
            </span>
          </div>

          {invoices.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs uppercase tracking-[0.08em] text-text-tertiary">
                  <tr>
                    <th className="px-4 py-3 font-black">Invoice</th>
                    <th className="px-4 py-3 font-black">Customer</th>
                    <th className="px-4 py-3 font-black">Date</th>
                    <th className="px-4 py-3 font-black">Due</th>
                    <th className="px-4 py-3 text-right font-black">Total</th>
                    <th className="px-4 py-3 text-right font-black">Paid</th>
                    <th className="px-4 py-3 text-right font-black">Returned</th>
                    <th className="px-4 py-3 text-right font-black">Balance</th>
                    <th className="px-4 py-3 text-right font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const total = Number(invoice.total_transaction);
                    const paid = Number(invoice.paid_transaction);
                    const returned = Number(invoice.returned_transaction);
                    const presentation = invoicePresentation(invoice, today);
                    return (
                      <tr key={invoice.id} className="border-t border-border/60">
                        <td className="px-4 py-4 font-black text-text-primary">{invoice.invoice_code}</td>
                        <td className="px-4 py-4 text-text-secondary">
                          {contactNames.get(invoice.customer_id) ?? "Customer"}
                        </td>
                        <td className="px-4 py-4 text-text-secondary">{formatDate(invoice.invoice_date)}</td>
                        <td
                          className={`px-4 py-4 ${
                            presentation.label === "Overdue"
                              ? "font-bold text-danger"
                              : "text-text-secondary"
                          }`}
                        >
                          {formatDate(invoice.due_date)}
                        </td>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-text-primary">
                          {formatMoney(total, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-text-secondary">
                          {formatMoney(paid, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-warning">
                          {formatMoney(returned, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-text-primary">
                          {formatMoney(presentation.balance, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${presentation.className}`}
                          >
                            {presentation.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-8 text-center">
              <ReceiptText className="mx-auto size-7 text-text-tertiary" aria-hidden="true" />
              <h3 className="mt-3 font-black text-text-primary">No invoices yet</h3>
              <p className="mt-1 text-sm text-text-secondary">
                The first issued invoice will automatically create its accounting journal.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
