import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPinned, ShieldCheck } from "@/components/icons/jalvoro/compat";

import BusinessBranchesWorkspace, { type BranchesSnapshot } from "@/components/business/BusinessBranchesWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Branches",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  workspace_mode: "advanced_company" | "simple_shop";
  status: string;
  timezone: string;
  country_code: string | null;
};

const emptySnapshot: BranchesSnapshot = {
  can_manage: false,
  current_user_access_mode: "all",
  summary: {
    total_branches: 0,
    active_branches: 0,
    selected_scope_members: 0,
    primary_branch_id: null,
  },
  branches: [],
  members: [],
  audit: [],
};

export default async function BusinessBranchesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/branches`)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, workspace_mode, status, timezone, country_code")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;
  if (business.status !== "active") notFound();
  if (business.workspace_mode === "simple_shop") redirect(`/business/${business.slug}/shop`);

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
    ["owner", "admin", "accountant", "manager", "sales", "cashier", "inventory", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("branches.view") ||
    permissions.includes("branches.manage");

  if (!canView) notFound();

  const snapshotResult = await supabase.rpc("get_business_branches_snapshot", {
    p_business_id: business.id,
  });

  if (snapshotResult.error) {
    console.error("Business branches snapshot failed", { code: snapshotResult.error.code });
  }

  const snapshot = (snapshotResult.data ?? emptySnapshot) as BranchesSnapshot;

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
            <ShieldCheck className="size-4" aria-hidden="true" /> Tenant-isolated branch scope
          </span>
        </div>

        <header className="mt-7">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <MapPinned className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Company administration</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Branches and locations</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
                Create operational locations, choose a protected primary branch, assign managers, and restrict team members to selected branches without changing existing finance or inventory records.
              </p>
            </div>
          </div>
        </header>

        {snapshotResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Branch information could not be loaded. No location or member access was changed.
          </section>
        ) : null}

        <div className="mt-8">
          <BusinessBranchesWorkspace
            businessId={business.id}
            businessName={business.name}
            businessTimezone={business.timezone}
            businessCountryCode={business.country_code}
            snapshot={snapshot}
          />
        </div>
      </div>
    </main>
  );
}
