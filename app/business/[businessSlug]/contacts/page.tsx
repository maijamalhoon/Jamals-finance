import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ContactRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";

import CreateBusinessContactForm from "@/components/business/CreateBusinessContactForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Contacts",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  business_type: string;
  workspace_mode: "advanced_company" | "simple_shop";
};

type ContactRow = {
  id: string;
  contact_type: "customer" | "supplier" | "both";
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  currency: string;
  credit_limit: number | string;
  payment_terms_days: number;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  status: string;
  created_at: string;
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function addressSummary(address: Record<string, unknown> | null) {
  if (!address) return "No billing address";
  const parts = [address.line1, address.city, address.country].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : "No billing address";
}

export default async function BusinessContactsPage({
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
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/contacts`)}`);
  }

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, business_type, workspace_mode")
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

  const permissions = membershipResult.data.permissions ?? [];
  const canManageContacts =
    ["owner", "admin", "accountant", "manager", "sales"].includes(
      membershipResult.data.role,
    ) ||
    permissions.includes("*") ||
    permissions.includes("contacts.manage") ||
    permissions.includes("sales.manage");

  const contactsResult = await supabase
    .from("business_contacts")
    .select(
      "id, contact_type, display_name, legal_name, email, phone, tax_id, currency, credit_limit, payment_terms_days, billing_address, notes, status, created_at",
    )
    .eq("business_id", business.id)
    .neq("status", "archived")
    .order("display_name", { ascending: true });

  if (contactsResult.error) {
    console.error("Business contacts load failed", { code: contactsResult.error.code });
  }

  const contacts = (contactsResult.data ?? []) as ContactRow[];
  const customerCount = contacts.filter((contact) =>
    ["customer", "both"].includes(contact.contact_type),
  ).length;
  const supplierCount = contacts.filter((contact) =>
    ["supplier", "both"].includes(contact.contact_type),
  ).length;
  const activeCount = contacts.filter((contact) => contact.status === "active").length;

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
            Tenant-isolated contacts
          </span>
        </div>

        <header className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {formatLabel(business.business_type)} relationships
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Customers and suppliers
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
              One company-scoped contact record can support sales, purchases, statements, credit
              control, and future CRM activity without exposing it to another business.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-3 py-2 text-xs font-bold text-text-secondary">
            {business.workspace_mode === "simple_shop" ? (
              <Store className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <Building2 className="size-4 text-primary" aria-hidden="true" />
            )}
            {business.workspace_mode === "simple_shop" ? "Simple shop" : "Advanced company"}
          </span>
        </header>

        {contactsResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Contacts could not be loaded. No business or personal record was changed.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <UsersRound className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">All contacts</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {contacts.length}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <ContactRound className="size-5 text-success" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Customers</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {customerCount}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Building2 className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Suppliers</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {supplierCount}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <ShieldCheck className="size-5 text-success" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Active records</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {activeCount}
            </strong>
          </article>
        </section>

        {canManageContacts ? (
          <div className="mt-8">
            <CreateBusinessContactForm
              businessId={business.id}
              baseCurrency={business.base_currency}
            />
          </div>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5 text-sm text-text-secondary">
            Your role has read-only contact access.
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Relationship directory
              </p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Company contacts</h2>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">
              {contacts.length}
            </span>
          </div>

          {contacts.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {contacts.map((contact) => (
                <article
                  key={contact.id}
                  className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                      <ContactRound className="size-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-black text-text-secondary">
                      {formatLabel(contact.contact_type)}
                    </span>
                  </div>

                  <h3 className="mt-5 truncate text-base font-black text-text-primary">
                    {contact.display_name}
                  </h3>
                  {contact.legal_name ? (
                    <p className="mt-1 truncate text-xs text-text-tertiary">{contact.legal_name}</p>
                  ) : null}

                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                      <span className="truncate">{contact.email ?? "No email"}</span>
                    </p>
                    <p className="flex min-w-0 items-center gap-2">
                      <Phone className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                      <span className="truncate">{contact.phone ?? "No phone"}</span>
                    </p>
                    <p className="flex min-w-0 items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                      <span className="line-clamp-2">{addressSummary(contact.billing_address)}</span>
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                      <span className="block text-[11px] font-bold text-text-tertiary">Credit limit</span>
                      <strong className="mt-1 block truncate text-sm font-black text-text-primary">
                        {formatMoney(contact.credit_limit, contact.currency)}
                      </strong>
                    </span>
                    <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                      <span className="block text-[11px] font-bold text-text-tertiary">Terms</span>
                      <strong className="mt-1 block text-sm font-black text-text-primary">
                        {contact.payment_terms_days} days
                      </strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-8 text-center">
              <ContactRound className="mx-auto size-7 text-text-tertiary" aria-hidden="true" />
              <h3 className="mt-3 font-black text-text-primary">No contacts yet</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Add a customer or supplier to start invoices and future purchase workflows.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
