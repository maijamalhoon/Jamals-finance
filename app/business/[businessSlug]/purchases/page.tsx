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
  ShieldCheck,
  ShoppingCart,
  Undo2,
} from "@/components/icons/jalvoro/compat";

import CreateSupplierBillForm from "@/components/business/CreateSupplierBillForm";
import RecordSupplierPaymentForm from "@/components/business/RecordSupplierPaymentForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Purchases",
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

type SupplierRow = {
  id: string;
  display_name: string;
  currency: string;
  payment_terms_days: number;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  system_key: string | null;
  is_active: boolean;
};

type SupplierBillRow = {
  id: string;
  supplier_id: string;
  bill_code: string;
  supplier_document_number: string | null;
  bill_date: string;
  due_date: string;
  status: "issued" | "partially_paid" | "paid";
  currency: string;
  exchange_rate: number | string;
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

function billPresentation(bill: SupplierBillRow, today: string) {
  const total = Number(bill.total_transaction);
  const paid = Number(bill.paid_transaction);
  const returned = Number(bill.returned_transaction);
  const balance = Math.max(0, total - paid - returned);
  const overdue = balance > 0 && bill.due_date < today;
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

export default async function BusinessPurchasesPage({
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
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/purchases`)}`);
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
  const canManagePurchases =
    ["owner", "admin", "accountant", "manager"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("purchases.manage");
  const canPaySuppliers = canManagePurchases || permissions.includes("purchases.pay");

  const [settingsResult, suppliersResult, accountsResult, billsResult] = await Promise.all([
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
      .in("contact_type", ["supplier", "both"])
      .order("display_name", { ascending: true }),
    supabase
      .from("business_chart_of_accounts")
      .select("id, code, name, account_type, system_key, is_active")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("code", { ascending: true }),
    supabase
      .from("business_supplier_bills")
      .select(
        "id, supplier_id, bill_code, supplier_document_number, bill_date, due_date, status, currency, exchange_rate, total_transaction, paid_transaction, returned_transaction, total_base, paid_base, returned_base, journal_entry_id, issued_at",
      )
      .eq("business_id", business.id)
      .in("status", ["issued", "partially_paid", "paid"])
      .order("bill_date", { ascending: false })
      .order("bill_number", { ascending: false })
      .limit(100),
  ]);

  const settings = settingsResult.data;
  const suppliers = (suppliersResult.data ?? []) as SupplierRow[];
  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const bills = (billsResult.data ?? []) as SupplierBillRow[];
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.display_name]));

  const allocationAccounts = accounts.filter(
    (account) =>
      account.account_type === "expense" ||
      ["inventory", "prepaid_expenses", "fixed_assets"].includes(account.system_key ?? ""),
  );
  const paymentAccounts = accounts.filter((account) =>
    ["cash", "bank"].includes(account.system_key ?? ""),
  );

  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: business.timezone,
  }).format(new Date());

  const openBills = bills
    .map((bill) => ({
      id: bill.id,
      code: bill.bill_code,
      supplierName: supplierNames.get(bill.supplier_id) ?? "Supplier",
      currency: bill.currency,
      outstanding: Math.max(
        0,
        Number(bill.total_transaction) -
          Number(bill.paid_transaction) -
          Number(bill.returned_transaction),
      ),
      billDate: bill.bill_date,
    }))
    .filter((bill) => bill.outstanding > 0);

  const totalPurchasedBase = bills.reduce((sum, bill) => sum + Number(bill.total_base), 0);
  const totalReturnedBase = bills.reduce((sum, bill) => sum + Number(bill.returned_base), 0);
  const totalPaidBase = bills.reduce((sum, bill) => sum + Number(bill.paid_base), 0);
  const netPurchasedBase = Math.max(0, totalPurchasedBase - totalReturnedBase);
  const outstandingBase = Math.max(0, netPurchasedBase - totalPaidBase);
  const overdueCount = bills.filter((bill) => {
    const presentation = billPresentation(bill, today);
    return presentation.balance > 0 && bill.due_date < today;
  }).length;

  const loadError = [
    settingsResult.error,
    suppliersResult.error,
    accountsResult.error,
    billsResult.error,
  ].find(Boolean);

  if (loadError) {
    console.error("Business purchases workspace load failed", { code: loadError.code });
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
              <Undo2 className="size-4" aria-hidden="true" />
              Purchase returns
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Bill-to-ledger controls active
            </span>
          </div>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {formatLabel(business.business_type)} purchase cycle
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Purchases and payables
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Supplier bills, inventory receipts, payments, returns, refund receivables, and
            return-adjusted Accounts Payable use one atomic tenant-scoped workflow.
          </p>
        </header>

        {loadError ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Some purchase information could not be loaded. No bill, payment, return, or journal was changed.
          </section>
        ) : null}

        {!accrualReady ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-warning-soft px-4 py-4 text-sm text-warning">
            Automated supplier bill posting is paused because this company is not using accrual accounting.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <ReceiptText className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Supplier bills</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {bills.length}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Net purchased</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">
              {formatMoney(netPurchasedBase, business.base_currency)}
            </strong>
            <span className="mt-1 block text-xs text-text-secondary">
              Returns {formatMoney(totalReturnedBase, business.base_currency)}
            </span>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Banknote className="size-5 text-warning" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Accounts Payable</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">
              {formatMoney(outstandingBase, business.base_currency)}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <CalendarClock
              className={`size-5 ${overdueCount > 0 ? "text-danger" : "text-success"}`}
              aria-hidden="true"
            />
            <p className="mt-4 text-xs font-bold text-text-secondary">Overdue bills</p>
            <strong
              className={`mt-1 block text-xl font-black tabular-nums ${
                overdueCount > 0 ? "text-danger" : "text-success"
              }`}
            >
              {overdueCount}
            </strong>
          </article>
        </section>

        {accrualReady && canManagePurchases ? (
          suppliers.length > 0 && allocationAccounts.length > 0 ? (
            <div className="mt-8">
              <CreateSupplierBillForm
                businessId={business.id}
                baseCurrency={business.base_currency}
                suppliers={suppliers.map((supplier) => ({
                  id: supplier.id,
                  name: supplier.display_name,
                  currency: supplier.currency,
                  paymentTermsDays: supplier.payment_terms_days,
                }))}
                allocationAccounts={allocationAccounts.map((account) => ({
                  id: account.id,
                  code: account.code,
                  name: account.name,
                  accountType: formatLabel(account.account_type),
                }))}
              />
            </div>
          ) : (
            <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-6">
              <ContactRound className="size-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 font-black text-text-primary">Add a supplier first</h2>
              <p className="mt-1 text-sm text-text-secondary">
                A posted supplier bill requires an active supplier and valid expense, inventory,
                prepaid, or fixed-asset allocation account.
              </p>
              <Link
                href={`/business/${business.slug}/contacts`}
                className="finance-focus mt-4 inline-flex min-h-10 items-center rounded-[var(--radius-button)] px-3 text-sm font-black text-primary hover:bg-primary-soft"
              >
                Open contacts
              </Link>
            </section>
          )
        ) : null}

        {accrualReady && canPaySuppliers && openBills.length > 0 && paymentAccounts.length > 0 ? (
          <div className="mt-8">
            <RecordSupplierPaymentForm
              businessId={business.id}
              bills={openBills}
              paymentAccounts={paymentAccounts.map((account) => ({
                id: account.id,
                code: account.code,
                name: account.name,
              }))}
            />
          </div>
        ) : null}

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Payables register
              </p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Recent supplier bills</h2>
            </div>
            <span className="text-xs font-bold text-text-secondary">
              Outstanding {formatMoney(outstandingBase, business.base_currency)}
            </span>
          </div>

          {bills.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]">
              <table className="w-full min-w-[1060px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs uppercase tracking-[0.08em] text-text-tertiary">
                  <tr>
                    <th className="px-4 py-3 font-black">Bill</th>
                    <th className="px-4 py-3 font-black">Supplier</th>
                    <th className="px-4 py-3 font-black">Supplier ref</th>
                    <th className="px-4 py-3 font-black">Bill date</th>
                    <th className="px-4 py-3 font-black">Due</th>
                    <th className="px-4 py-3 text-right font-black">Total</th>
                    <th className="px-4 py-3 text-right font-black">Paid</th>
                    <th className="px-4 py-3 text-right font-black">Returned</th>
                    <th className="px-4 py-3 text-right font-black">Outstanding</th>
                    <th className="px-4 py-3 text-right font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => {
                    const presentation = billPresentation(bill, today);
                    return (
                      <tr key={bill.id} className="border-t border-border-subtle/60">
                        <td className="px-4 py-3 font-black text-text-primary">{bill.bill_code}</td>
                        <td className="px-4 py-3 text-text-primary">
                          {supplierNames.get(bill.supplier_id) ?? "Supplier"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {bill.supplier_document_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{formatDate(bill.bill_date)}</td>
                        <td
                          className={`px-4 py-3 ${
                            presentation.label === "Overdue"
                              ? "font-bold text-danger"
                              : "text-text-secondary"
                          }`}
                        >
                          {formatDate(bill.due_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-text-primary">
                          {formatMoney(bill.total_transaction, bill.currency)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                          {formatMoney(bill.paid_transaction, bill.currency)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-warning">
                          {formatMoney(bill.returned_transaction, bill.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-primary">
                          {formatMoney(presentation.balance, bill.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
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
              <ShoppingCart className="mx-auto size-7 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-black text-text-primary">No supplier bills yet</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Issued supplier bills will appear here with payment, return, and overdue status.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
