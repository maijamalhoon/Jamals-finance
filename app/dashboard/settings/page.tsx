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
    <div>
      <div className="mb-6">
        <h2 className="text-white text-xl font-semibold">Settings</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        <ProfileSettings email={user.email ?? ""} />
        <CategoriesSettings categories={categories ?? []} />
        <SignOutButton />
      </div>
    </div>
  );
}
