import { notFound, redirect } from "next/navigation";

import AdminControlCenter from "@/components/admin/AdminControlCenter";
import { parseAdminControlCenterSnapshot } from "@/lib/admin/control-center";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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

  return <AdminControlCenter snapshot={snapshot} />;
}
