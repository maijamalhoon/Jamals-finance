import { notFound, redirect } from "next/navigation";

import AdminControlCenter from "@/components/admin/AdminControlCenter";
import BillingPlanOperations from "@/components/admin/BillingPlanOperations";
import PrivacyGovernancePanel from "@/components/admin/PrivacyGovernancePanel";
import PrivacyRequestOperations from "@/components/admin/PrivacyRequestOperations";
import { parseBillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import { parseAdminControlCenterSnapshot } from "@/lib/admin/control-center";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRIVACY_ACTION_RESULTS = new Set([
  "updated",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
]);

const BILLING_ACTION_RESULTS = new Set([
  "saved",
  "invalid",
  "forbidden",
  "unavailable",
]);

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=%2Fadmin");
  }

  const { data, error } = await supabase.rpc("get_platform_admin_snapshot");

  if (error?.code === "42501") {
    notFound();
  }

  if (error) {
    throw new Error(`Admin snapshot unavailable: ${error.code ?? "unknown"}`);
  }

  const snapshot = parseAdminControlCenterSnapshot(data);
  const billingOperations = parseBillingOperationsSnapshot(data);
  if (!snapshot || !billingOperations) {
    throw new Error("Admin snapshot returned an invalid contract.");
  }

  const resolvedSearchParams = await searchParams;
  const rawPrivacyActionResult = resolvedSearchParams.privacyAction;
  const privacyActionResult =
    typeof rawPrivacyActionResult === "string" &&
    PRIVACY_ACTION_RESULTS.has(rawPrivacyActionResult)
      ? (rawPrivacyActionResult as
          | "updated"
          | "invalid"
          | "forbidden"
          | "missing"
          | "unavailable")
      : null;

  const rawBillingActionResult = resolvedSearchParams.billingAction;
  const billingActionResult =
    typeof rawBillingActionResult === "string" &&
    BILLING_ACTION_RESULTS.has(rawBillingActionResult)
      ? (rawBillingActionResult as
          | "saved"
          | "invalid"
          | "forbidden"
          | "unavailable")
      : null;

  return (
    <>
      <AdminControlCenter snapshot={snapshot} />
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <BillingPlanOperations
          billing={billingOperations}
          actionResult={billingActionResult}
        />
      </section>
      <PrivacyGovernancePanel privacy={snapshot.privacy} />
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <PrivacyRequestOperations
          privacy={snapshot.privacy}
          actionResult={privacyActionResult}
        />
      </section>
    </>
  );
}
