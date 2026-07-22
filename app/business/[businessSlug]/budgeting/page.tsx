import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import BusinessBudgetingWorkspace, { type BusinessBudgetingSnapshot } from "@/components/business/BusinessBudgetingWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Budgeting & Forecasting",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  timezone: string;
  fiscal_year_start_month: number;
  workspace_mode: "advanced_company" | "simple_shop";
  status: string;
};

function dateInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function fiscalRange(today: string, startMonth: number) {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const startYear = month < startMonth ? year - 1 : year;
  const startsOn = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(startYear + 1, startMonth - 1, 0));
  const endsOn = endDate.toISOString().slice(0, 10);
  return { startsOn, endsOn };
}

function validUuid(value: string | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export default async function BusinessBudgetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ scenario?: string; compare?: string }>;
}) {
  const { businessSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = `/business/${businessSlug}/budgeting`;
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, timezone, fiscal_year_start_month, workspace_mode, status")
    .eq("slug", businessSlug)
    .maybeSingle();
  if (businessResult.error) console.error("Budgeting business load failed", { code: businessResult.error.code });
  const business = businessResult.data as BusinessRow | null;
  if (!business || business.status !== "active" || business.workspace_mode !== "advanced_company") notFound();

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const canView =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("budget.view") ||
    permissions.includes("budget.manage") ||
    permissions.includes("budget.approve") ||
    permissions.includes("accounting.view") ||
    permissions.includes("accounting.manage") ||
    permissions.includes("reports.view");
  if (!canView) notFound();

  const today = dateInZone(business.timezone);
  const range = fiscalRange(today, business.fiscal_year_start_month);
  const snapshotResult = await supabase.rpc("get_business_budgeting_snapshot", {
    p_business_id: business.id,
    p_scenario_id: validUuid(query.scenario),
    p_comparison_scenario_id: validUuid(query.compare),
  });
  if (snapshotResult.error) {
    console.error("Budgeting snapshot failed", { code: snapshotResult.error.code });
    throw new Error("Budgeting and forecasting data could not be loaded.");
  }

  return (
    <>
      <div className="bg-background px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Link
            href={`/business/${business.slug}`}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Business workspace
          </Link>
        </div>
      </div>
      <BusinessBudgetingWorkspace
        businessId={business.id}
        businessName={business.name}
        businessSlug={business.slug}
        baseCurrency={business.base_currency}
        defaultStartsOn={range.startsOn}
        defaultEndsOn={range.endsOn}
        today={today}
        snapshot={(snapshotResult.data ?? {}) as BusinessBudgetingSnapshot}
      />
    </>
  );
}
