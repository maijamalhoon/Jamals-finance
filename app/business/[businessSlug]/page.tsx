import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  BarChart3,
  BellRing,
  BookOpenCheck,
  Boxes,
  Building2,
  ContactRound,
  FileArchive,
  Handshake,
  Landmark,
  MapPinned,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import BusinessNotificationBell from "@/components/business/BusinessNotificationBell";
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
  workspace_mode: "advanced_company" | "simple_shop";
  status: string;
};

type NotificationSnapshot = {
  summary?: { unread?: number; critical?: number };
  preferences?: { realtime_enabled?: boolean };
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
    key: "banking",
    label: "Banking & reconciliation",
    description: "Bank and cash accounts, statement imports, ledger matching, outstanding items, and permanent locks.",
    icon: Landmark,
    route: "banking",
  },
  {
    key: "budgeting",
    label: "Budgeting & forecasting",
    description: "Monthly budgets, rolling forecasts, actual variance, runway, approvals, and locked baselines.",
    icon: TrendingUp,
    route: "budgeting",
  },
  {
    key: "documents",
    label: "Documents & records",
    description: "Private company files, folders, immutable versions, secure downloads, linked records, and audit history.",
    icon: FileArchive,
    route: "documents",
  },
  {
    key: "branches",
    label: "Branches & locations",
    description: "Operational locations, primary branch control, managers, member scope, and immutable access history.",
    icon: MapPinned,
    route: "branches",
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
    key: "team",
    label: "Team & permissions",
    description: "Invitations, employee roles, custom permissions, ownership, and audit history.",
    icon: UsersRound,
    route: "team",
  },
  {
    key: "notifications",
    label: "Notifications & alerts",
    description: "Role-filtered dues, stock, CRM, accounting, payment, invitation, and access alerts.",
    icon: BellRing,
    route: "notifications",
  },
  {
    key: "tax-closing",
    label: "Tax & fiscal closing",
    description: "Tax codes, filing snapshots, retained earnings close, controlled reopen, and permanent locks.",
    icon: BadgePercent,
    route: "tax-closing",
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
      "id, name, slug, business_type, country_code, base_currency, timezone, fiscal_year_start_month, module_config, workspace_mode, status",
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
  if (business.workspace_mode === "simple_shop") redirect(`/business/${business.slug}/shop`);

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
  const canViewTeam =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("team.view") ||
    permissions.includes("team.manage");
  const canViewTax =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("tax.view") ||
    permissions.includes("tax.manage") ||
    permissions.includes("accounting.view") ||
    permissions.includes("reports.view");
  const canViewBanking =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("banking.view") ||
    permissions.includes("banking.manage") ||
    permissions.includes("accounting.view") ||
    permissions.includes("accounting.manage");
  const canViewBudgeting =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("budget.view") ||
    permissions.includes("budget.manage") ||
    permissions.includes("budget.approve") ||
    permissions.includes("accounting.view") ||
    permissions.includes("accounting.manage") ||
    permissions.includes("reports.view");
  const canViewDocuments =
    ["owner", "admin", "accountant", "manager", "sales", "inventory", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("documents.view") ||
    permissions.includes("documents.manage");
  const canViewBranches =
    ["owner", "admin", "accountant", "manager", "sales", "cashier", "inventory", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("branches.view") ||
    permissions.includes("branches.manage");

  const notificationsResult = await supabase.rpc("get_business_notifications_snapshot", {
    p_business_id: business.id,
    p_limit: 1,
  });
  if (notificationsResult.error) {
    console.error("Business notification bell failed", { code: notificationsResult.error.code });
  }
  const notificationSnapshot = (notificationsResult.data ?? {}) as NotificationSnapshot;
  const unreadNotifications = Number(notificationSnapshot.summary?.unread ?? 0);
  const criticalNotifications = Number(notificationSnapshot.summary?.critical ?? 0);
  const realtimeNotifications = notificationSnapshot.preferences?.realtime_enabled !== false;

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
          <div className="flex items-center gap-2">
            <BusinessNotificationBell
              businessId={business.id}
              businessSlug={business.slug}
              unreadCount={unreadNotifications}
              criticalCount={criticalNotifications}
              realtimeEnabled={realtimeNotifications}
            />
            <Link
              href="/dashboard"
              className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-3 text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
            >
              Personal finance
            </Link>
          </div>
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
              Modules are configured from the nature of business. Every operational module uses the same verified accounting, banking, budgeting, documents, branches, tax, permission, notification, and reporting source of truth.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const enabled = ["banking", "budgeting", "documents", "branches", "team", "notifications", "tax-closing"].includes(module.key)
                ? true
                : enabledModules[module.key] === true;
              const accessible =
                module.key === "reports"
                  ? canViewReports
                  : module.key === "crm"
                    ? canViewCrm
                    : module.key === "team"
                      ? canViewTeam
                      : module.key === "tax-closing"
                        ? canViewTax
                        : module.key === "banking"
                          ? canViewBanking
                          : module.key === "budgeting"
                            ? canViewBudgeting
                            : module.key === "documents"
                              ? canViewDocuments
                              : module.key === "branches"
                                ? canViewBranches
                                : true;
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
              <h2 className="font-black">Accounting, banking, budgeting, documents, branches, tax, access control, and alerts are active</h2>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Balanced journals, bank reconciliation locks, approved budgets, private versioned records, protected branch scopes, rolling forecasts, fiscal periods, tax returns, retained-earnings close, immutable posting, team audit history, CRM conversions, verified reports, and role-filtered alerts are available. Operational modules do not calculate financial results independently.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
