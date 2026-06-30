import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsOneUI, {
  type SettingsCategory,
} from "@/components/settings/SettingsOneUI";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: categories },
    { data: transactionCategoryRows },
    { count: accountsCount },
    { count: transactionsCount },
    { count: goalsCount },
    { count: investmentsCount },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, type, color, parent_id")
      .order("type")
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name"),
    supabase.from("transactions").select("category_id"),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("goals").select("id", { count: "exact", head: true }),
    supabase.from("investments").select("id", { count: "exact", head: true }),
  ]);

  const categoryUsage = (transactionCategoryRows ?? []).reduce<
    Record<string, number>
  >((usage, transaction) => {
    const categoryId =
      typeof transaction.category_id === "string" ?
        transaction.category_id
      : null;

    if (!categoryId) return usage;

    usage[categoryId] = (usage[categoryId] ?? 0) + 1;
    return usage;
  }, {});

  const metadata = user.user_metadata as Record<string, unknown>;
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";

  return (
    <SettingsOneUI
      email={user.email ?? ""}
      userId={user.id}
      displayName={displayName}
      categories={(categories ?? []) as SettingsCategory[]}
      categoryUsage={categoryUsage}
      stats={{
        accounts: accountsCount ?? 0,
        transactions: transactionsCount ?? 0,
        goals: goalsCount ?? 0,
        investments: investmentsCount ?? 0,
      }}
    />
  );
}
