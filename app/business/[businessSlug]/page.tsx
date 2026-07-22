import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Boxes,
  Building2,
  ContactRound,
  Handshake,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Workspace",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  country_code: string | null;
  base_currency: string;
  timezone: string;
  fiscal_year_start_month: number;
  module_config: Record<string, boolean> | null;
  status: string;
};

const MODULES = [
  {
    key: "accounting",
    label: "Accounting",
    description: "Chart of accounts, journals, ledgers, trial balance, and financial controls.",
    icon: BookOpenCheck,
    route: "accounting",
  },
  {
    key: "contacts",
    label: "Contacts",
    description: "Customers, suppliers, contact people, balances, and statements.",
    icon: ContactRound,
    route: "contacts",
  },
  {
    key: "sales",
    label: "Sales & invoices",
    description: "Quotations, invoices, receipts, payments, returns, and credit notes.",
    icon: ReceiptText,
    route: "sales",
  },
  {
    key: "purchases",
    label: "Purchases",
    description: "Purchase orders, supplier bills, payments, and purchase returns.",
    icon: ShoppingCart,
    route: "purchases",
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Products, warehouses, stock movements, valuation, and reorder control.",
    icon: Boxes,
    route: "inventory",
  },
  {
    key: "crm",
    label: "CRM",
    description: "Leads, opportunities, activities, follow-ups, and sales ownership.",
    icon: Handshake,
    route: "crm",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Profit and loss, balance sheet, cash flow, aging, stock, and returns reports.",
    icon: BarChart3,
    route: "reports",
  },
] as const;

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function BusinessWorkspacePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}`)}`);

  const businessResult = await supabase
    .from("businesses")
    .select(
      "id, name, slug, business_type, country_code, base_currency, timezone, fiscal_year_start_month, module_config, status",
    )
    .eq("slug", businessSlug)
    .maybeSingle();

  if (businessResult.error) {
    console.error("Failed to load business workspace", { code: businessResult.error.code });
  }
  if (!businessResult.data && !businessResult.error) notFound();

  const business = businessResult.data as BusinessRow | null;
  if (!business) notFound();

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const enabledModules = business.module_config ?? {};
  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const canViewReports =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("reports.view") ||
    permissions.includes("accounting.view");
  const canViewCrm =
    ["owner", "admin", "accountant", "manager", "sales", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("crm.view") ||
    permissions.includes("crm.manage");

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/business"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Business workspaces
          </Link>
          <Link
            href="/dashboard"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-3 text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
          >
            Personal finance
          </Link>
        </div>

        <header className="mt-7 rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                <Building2 aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  {formatLabel(business.business_type)} workspace
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                  {business.name}
                </h1>
                <p className="mt-2 text-sm text-text-secondary">
                  {formatLabel(role)} access · {business.status}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Tenant isolation active
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Base currency", business.base_currency],
              ["Country", business.country_code ?? "Not set"],
              ["Timezone", business.timezone],
              ["Fiscal year starts", `Month ${business.fiscal_year_start_month}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
                <span className="text-xs font-bold text-text-secondary">{label}</span>
                <strong className="mt-1 block truncate text-base font-black text-text-primary">{value}</strong>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">ERP foundation</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-text-primary sm:text-2xl">
              Modules selected for this business
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
              Modules are configured from the nature of business. Accounting is live first because every invoice,
              payment, purchase, stock movement, CRM conversion, and report must use its verified source of truth.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const enabled = enabledModules[module.key] === true;
              const accessible =
                module.key === "reports" ? canViewReports : module.key === "crm" ? canViewCrm : true;
              const openable = enabled && accessible;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] ${
                        enabled && accessible
                          ? "bg-primary-soft text-primary"
                          : "bg-surface-secondary text-text-tertiary"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    {openable ? (
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
                      />
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                          enabled && !accessible
                            ? "bg-warning-soft text-warning"
                            : enabled
                              ? "bg-success-soft text-success"
                              : "bg-surface-secondary text-text-secondary"
                        }`}
                      >
                        {enabled && !accessible ? "Restricted" : enabled ? "Enabled" : "Not required"}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 text-base font-black text-text-primary">{module.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{module.description}</p>
                  {openable ? <span className="mt-4 inline-flex text-sm font-black text-primary">Open module</span> : null}
                </>
              );

              return openable ? (
                <Link
                  key={module.key}
                  href={`/business/${business.slug}/${module.route}`}
                  className="finance-focus group rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                >
                  {content}
                </Link>
              ) : (
                <article key={module.key} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
                  {content}
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-[var(--radius-card)] bg-primary-soft px-5 py-5 text-primary sm:px-6">
          <div className="flex items-start gap-3">
            <BookOpenCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-black">Accounting source of truth is active</h2>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Balanced journals, fiscal periods, currency conversion, immutable posting, CRM conversions, and
                verified reports are available. Operational modules do not calculate financial results independently.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
