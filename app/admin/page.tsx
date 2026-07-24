import { notFound, redirect } from "next/navigation";

import AdminControlCenter from "@/components/admin/AdminControlCenter";
import PrivacyGovernancePanel from "@/components/admin/PrivacyGovernancePanel";
import PrivacyRequestOperations from "@/components/admin/PrivacyRequestOperations";
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
  if (!snapshot) {
    throw new Error("Admin snapshot returned an invalid contract.");
  }

  const resolvedSearchParams = await searchParams;
  const rawActionResult = resolvedSearchParams.privacyAction;
  const actionResult =
    typeof rawActionResult === "string" && PRIVACY_ACTION_RESULTS.has(rawActionResult)
      ? (rawActionResult as
          | "updated"
          | "invalid"
          | "forbidden"
          | "missing"
          | "unavailable")
      : null;

  return (
    <>
      <AdminControlCenter snapshot={snapshot} />
      <PrivacyGovernancePanel privacy={snapshot.privacy} />
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <PrivacyRequestOperations
          privacy={snapshot.privacy}
          actionResult={actionResult}
        />
      </section>
    </>
  );
}
