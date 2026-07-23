import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck, ShieldCheck } from "lucide-react";

import BusinessApprovalsWorkspace, { type ApprovalsSnapshot } from "@/components/business/BusinessApprovalsWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Approvals",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  workspace_mode: "advanced_company" | "simple_shop";
  status: string;
  base_currency: string;
};

const emptySnapshot: ApprovalsSnapshot = {
  summary: { pending: 0, approved: 0, rejected: 0, urgent: 0, unassigned: 0 },
  policies: [],
  requests: [],
  decisions: [],
  members: [],
  branches: [],
  audit: [],
  capabilities: { can_view_all: false, can_request: false, can_decide: false, can_manage: false },
};

export default async function BusinessApprovalsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/approvals`)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, workspace_mode, status, base_currency")
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
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("approvals.view") ||
    permissions.includes("approvals.decide") ||
    permissions.includes("approvals.manage");
  const canRequest =
    ["owner", "admin", "accountant", "manager", "sales", "cashier", "inventory"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("approvals.request") ||
    permissions.includes("approvals.manage");

  if (!canView && !canRequest) notFound();

  const snapshotResult = await supabase.rpc("get_business_approvals_snapshot", {
    p_business_id: business.id,
    p_limit: 150,
  });

  if (snapshotResult.error) {
    console.error("Business approvals snapshot failed", { code: snapshotResult.error.code });
  }

  const snapshot = (snapshotResult.data ?? emptySnapshot) as ApprovalsSnapshot;

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
            <ShieldCheck className="size-4" aria-hidden="true" /> Maker–checker enforced
          </span>
        </div>

        <header className="mt-7">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Internal controls</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Approvals and authority</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
                Route sensitive business actions through branch-aware policies, independent approvers, immutable decisions, and a complete control audit without duplicating accounting or operational records.
              </p>
            </div>
          </div>
        </header>

        {snapshotResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Approval information could not be loaded. No request, policy, assignment, or decision was changed.
          </section>
        ) : null}

        <div className="mt-8">
          <BusinessApprovalsWorkspace
            businessId={business.id}
            currentUserId={user.id}
            baseCurrency={business.base_currency}
            snapshot={snapshot}
          />
        </div>
      </div>
    </main>
  );
}
