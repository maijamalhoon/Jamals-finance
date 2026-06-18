import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileSettings from "@/components/settings/ProfileSettings";
import CategoriesSettings from "@/components/settings/CategoriesSettings";
import SignOutButton from "@/components/settings/SignOutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        <ProfileSettings email={user.email ?? ""} />
        <CategoriesSettings categories={categories ?? []} />
        <SignOutButton />
      </div>
    </div>
  );
}
