import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileSettings from "@/components/settings/ProfileSettings";
import CategoriesSettings from "@/components/settings/CategoriesSettings";
import SignOutButton from "@/components/settings/SignOutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const now = new Date();
  const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("category_id, amount, date, type");

  const categoryStats = (transactions ?? []).reduce<
    Record<string, { monthAmount: number; totalAmount: number; count: number }>
  >((acc, transaction) => {
    const categoryId = transaction.category_id as string | null;
    if (!categoryId) return acc;
    acc[categoryId] ??= { monthAmount: 0, totalAmount: 0, count: 0 };
    const amount = Number(transaction.amount);
    acc[categoryId].totalAmount += amount;
    acc[categoryId].count += 1;
    if ((transaction.date as string) >= firstDayMonth) {
      acc[categoryId].monthAmount += amount;
    }
    return acc;
  }, {});

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
        <CategoriesSettings
          categories={categories ?? []}
          categoryStats={categoryStats}
        />
        <SignOutButton />
      </div>
    </div>
  );
}
