import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarRange, ShieldCheck } from "@/components/icons/jalvoro/compat";

import BusinessReportsWorkspace, {
  type BusinessReportSnapshot,
} from "@/components/business/BusinessReportsWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Reports",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  base_currency: string;
  timezone: string;
  fiscal_year_start_month: number;
  status: string;
};

type ReportView =
  | "overview"
  | "profit-loss"
  | "balance-sheet"
  | "cash-flow"
  | "receivables"
  | "payables"
  | "stock"
  | "returns";

type SearchParams = {
  start?: string | string[];
  end?: string | string[];
  asOf?: string | string[];
  view?: string | string[];
};

const REPORT_VIEWS = new Set<ReportView>([
  "overview",
  "profit-loss",
  "balance-sheet",
  "cash-flow",
  "receivables",
  "payables",
  "stock",
  "returns",
]);

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function localDateParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function dateString(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fiscalDefaults(timezone: string, fiscalStartMonth: number) {
  const today = localDateParts(timezone);
  const fiscalYear = today.month < fiscalStartMonth ? today.year - 1 : today.year;
  return {
    start: dateString(fiscalYear, fiscalStartMonth, 1),
    end: dateString(today.year, today.month, today.day),
  };
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function BusinessReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { businessSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/reports`)}`);
  }

  const businessResult = await supabase
    .from("businesses")
    .select(
      "id, name, slug, business_type, base_currency, timezone, fiscal_year_start_month, status",
    )
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
  const canViewReports =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("reports.view") ||
    permissions.includes("accounting.view");

  if (!canViewReports) notFound();

  const defaults = fiscalDefaults(business.timezone, business.fiscal_year_start_month);
  const requestedStart = single(query.start);
  const requestedEnd = single(query.end);
  const requestedAsOf = single(query.asOf);

  const startDate = validDate(requestedStart) ? requestedStart! : defaults.start;
  const endDate = validDate(requestedEnd) ? requestedEnd! : defaults.end;
  const asOfDate = validDate(requestedAsOf) ? requestedAsOf! : endDate;
  const normalizedStart = startDate <= endDate ? startDate : defaults.start;
  const normalizedEnd = startDate <= endDate ? endDate : defaults.end;
  const requestedView = single(query.view) as ReportView | undefined;
  const activeView: ReportView = requestedView && REPORT_VIEWS.has(requestedView)
    ? requestedView
    : "overview";

  const reportResult = await supabase.rpc("get_business_reports_snapshot", {
    p_business_id: business.id,
    p_start_date: normalizedStart,
    p_end_date: normalizedEnd,
    p_as_of_date: asOfDate,
  });

  if (reportResult.error) {
    console.error("Business reports snapshot failed", { code: reportResult.error.code });
  }

  const snapshot = reportResult.data as BusinessReportSnapshot | null;

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
            Posted-ledger reporting active
          </span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {formatLabel(business.business_type)} reporting
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Financial and operational reports
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Profitability, financial position, cash movement, aging, stock valuation, and returns use
            the same tenant-scoped posted journals and immutable operational ledgers.
          </p>
        </header>

        <form
          action={`/business/${business.slug}/reports`}
          method="get"
          className="mt-6 rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)] sm:px-5"
        >
          <input type="hidden" name="view" value={activeView} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Period starts</span>
              <input
                type="date"
                name="start"
                defaultValue={normalizedStart}
                className="field-input min-h-11 w-full"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Period ends</span>
              <input
                type="date"
                name="end"
                defaultValue={normalizedEnd}
                className="field-input min-h-11 w-full"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Position as of</span>
              <input
                type="date"
                name="asOf"
                defaultValue={asOfDate}
                className="field-input min-h-11 w-full"
                required
              />
            </label>
            <button
              type="submit"
              className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-5 text-sm font-black text-primary-foreground"
            >
              <CalendarRange className="size-4" aria-hidden="true" />
              Run reports
            </button>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Period reports use {normalizedStart} to {normalizedEnd}. Balance, aging, and stock are
            reconstructed as of {asOfDate} in {business.base_currency}.
          </p>
        </form>

        {reportResult.error || !snapshot ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-5 py-5 text-danger">
            <h2 className="font-black">Reports could not be generated</h2>
            <p className="mt-1 text-sm opacity-80">
              No accounting, customer, supplier, or stock record was changed. Check the selected dates
              and your reporting access, then try again.
            </p>
          </section>
        ) : (
          <BusinessReportsWorkspace
            businessSlug={business.slug}
            businessName={business.name}
            snapshot={snapshot}
            activeView={activeView}
          />
        )}
      </div>
    </main>
  );
}
