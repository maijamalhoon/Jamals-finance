import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import BusinessPayrollWorkspace from "@/components/business/BusinessPayrollWorkspace";
import type { BusinessPayrollSnapshot } from "@/components/business/payroll/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employee Payroll",
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

export default async function BusinessPayrollPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = `/business/${businessSlug}/payroll`;
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, base_currency, timezone, workspace_mode, status")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (businessResult.error) {
    console.error("Payroll business load failed", { code: businessResult.error.code });
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
    ["owner", "admin", "accountant"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("payroll.view") ||
    permissions.includes("payroll.manage") ||
    permissions.includes("payroll.process") ||
    permissions.includes("payroll.pay");

  if (!canView) notFound();

  const snapshotResult = await supabase.rpc("get_business_payroll_snapshot", {
    p_business_id: business.id,
    p_limit: 150,
  });

  if (snapshotResult.error) {
    console.error("Payroll snapshot failed", { code: snapshotResult.error.code });
    throw new Error("Payroll data could not be loaded.");
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
      <BusinessPayrollWorkspace
        businessId={business.id}
        businessName={business.name}
        baseCurrency={business.base_currency}
        today={dateInZone(business.timezone)}
        snapshot={(snapshotResult.data ?? {}) as BusinessPayrollSnapshot}
      />
    </>
  );
}
