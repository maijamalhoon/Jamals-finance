import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BellRing, ShieldCheck } from "lucide-react";

import BusinessNotificationsWorkspace, {
  type BusinessNotificationsSnapshot,
} from "@/components/business/BusinessNotificationsWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Notifications",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  workspace_mode: "advanced_company" | "simple_shop";
  timezone: string;
  status: string;
};

function fallbackSnapshot(business: BusinessRow, userId: string): BusinessNotificationsSnapshot {
  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      workspace_mode: business.workspace_mode,
      timezone: business.timezone,
    },
    summary: { active: 0, unread: 0, critical: 0, snoozed: 0 },
    category_counts: {},
    notifications: [],
    preferences: {
      business_id: business.id,
      user_id: userId,
      in_app_enabled: true,
      sales_alerts_enabled: true,
      purchase_alerts_enabled: true,
      inventory_alerts_enabled: true,
      crm_alerts_enabled: true,
      team_alerts_enabled: true,
      accounting_alerts_enabled: true,
      realtime_enabled: true,
    },
    settings: {
      business_id: business.id,
      due_soon_days: 7,
      fiscal_period_warning_days: 14,
      receivable_alerts_enabled: true,
      payable_alerts_enabled: true,
      low_stock_alerts_enabled: true,
      crm_alerts_enabled: true,
      team_alerts_enabled: true,
      accounting_alerts_enabled: true,
      updated_by: null,
    },
    can_manage: false,
  };
}

export default async function BusinessNotificationsPage({
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
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/notifications`)}`);
  }

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, workspace_mode, timezone, status")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;
  if (business.status !== "active") notFound();

  const membershipResult = await supabase
    .from("business_members")
    .select("status")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const snapshotResult = await supabase.rpc("get_business_notifications_snapshot", {
    p_business_id: business.id,
    p_limit: 150,
  });

  if (snapshotResult.error) {
    console.error("Business notifications snapshot failed", {
      code: snapshotResult.error.code,
    });
  }

  const snapshot = (snapshotResult.data ?? fallbackSnapshot(business, user.id)) as BusinessNotificationsSnapshot;
  const backHref =
    business.workspace_mode === "simple_shop"
      ? `/business/${business.slug}/shop`
      : `/business/${business.slug}`;

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {business.name}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Role-filtered alerts
          </span>
        </div>

        <header className="mt-7 flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <BellRing className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {business.workspace_mode === "simple_shop" ? "Shop alerts" : "Company alerts"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Notifications and alerts
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
              Review due receivables and payables, low stock, assigned follow-ups, fiscal-period warnings, payments, invitations, and access events without exposing another member&apos;s restricted data.
            </p>
          </div>
        </header>

        {snapshotResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Notification data could not be refreshed. No invoice, payment, stock, CRM, team, or accounting record was changed.
          </section>
        ) : null}

        <div className="mt-8">
          <BusinessNotificationsWorkspace snapshot={snapshot} />
        </div>
      </div>
    </main>
  );
}
