import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@/components/icons/jalvoro/compat";

import BusinessTaxClosingWorkspace, {
  type BusinessTaxClosingSnapshot,
} from "@/components/business/BusinessTaxClosingWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tax & Fiscal Closing",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  timezone: string;
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

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default async function BusinessTaxClosingPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { businessSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = `/business/${businessSlug}/tax-closing`;
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, timezone, workspace_mode, status")
    .eq("slug", businessSlug)
    .maybeSingle();
  if (businessResult.error) {
    console.error("Tax and closing business load failed", { code: businessResult.error.code });
  }
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
    permissions.includes("tax.view") ||
    permissions.includes("tax.manage") ||
    permissions.includes("accounting.view") ||
    permissions.includes("reports.view");
  if (!canView) notFound();

  const today = dateInZone(business.timezone);
  const defaultStart = `${today.slice(0, 7)}-01`;
  const requestedStart = validDate(query.start) ?? defaultStart;
  const requestedEnd = validDate(query.end) ?? today;
  const start = requestedEnd < requestedStart ? defaultStart : requestedStart;
  const end = requestedEnd < requestedStart ? today : requestedEnd;

  const snapshotResult = await supabase.rpc("get_business_tax_closing_snapshot", {
    p_business_id: business.id,
    p_tax_start: start,
    p_tax_end: end,
  });
  if (snapshotResult.error) {
    console.error("Tax and closing snapshot failed", { code: snapshotResult.error.code });
    throw new Error("Tax and fiscal data could not be loaded.");
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
      <BusinessTaxClosingWorkspace
        businessId={business.id}
        businessName={business.name}
        businessSlug={business.slug}
        baseCurrency={business.base_currency}
        initialStart={start}
        initialEnd={end}
        snapshot={(snapshotResult.data ?? {}) as BusinessTaxClosingSnapshot}
      />
    </>
  );
}
