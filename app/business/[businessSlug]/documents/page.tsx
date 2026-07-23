import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import BusinessDocumentsWorkspace, { type BusinessDocumentsSnapshot } from "@/components/business/BusinessDocumentsWorkspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documents & Records",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  workspace_mode: "advanced_company" | "simple_shop";
  status: string;
};

function validUuid(value: string | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export default async function BusinessDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ folder?: string; status?: string; search?: string }>;
}) {
  const { businessSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = `/business/${businessSlug}/documents`;
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, workspace_mode, status")
    .eq("slug", businessSlug)
    .maybeSingle();
  if (businessResult.error) console.error("Documents business load failed", { code: businessResult.error.code });
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
    ["owner", "admin", "accountant", "manager", "sales", "inventory", "viewer"].includes(role) ||
    permissions.includes("*") ||
    permissions.includes("documents.view") ||
    permissions.includes("documents.manage");
  if (!canView) notFound();

  const status = ["active", "archived", "all"].includes(query.status ?? "") ? query.status! : "all";
  const snapshotResult = await supabase.rpc("get_business_documents_snapshot", {
    p_business_id: business.id,
    p_folder_id: validUuid(query.folder),
    p_status: status,
    p_search: query.search?.slice(0, 120) || null,
    p_limit: 250,
  });
  if (snapshotResult.error) {
    console.error("Documents snapshot failed", { code: snapshotResult.error.code });
    throw new Error("Company documents could not be loaded.");
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
      <BusinessDocumentsWorkspace
        businessId={business.id}
        businessName={business.name}
        businessSlug={business.slug}
        snapshot={(snapshotResult.data ?? {}) as BusinessDocumentsSnapshot}
      />
    </>
  );
}
