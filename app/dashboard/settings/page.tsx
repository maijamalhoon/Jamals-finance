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
    { count: accountsCount },
    { count: transactionsCount },
    { count: goalsCount },
    { count: investmentsCount },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, type, color").order("name"),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("goals").select("id", { count: "exact", head: true }),
    supabase.from("investments").select("id", { count: "exact", head: true }),
  ]);

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
      stats={{
        accounts: accountsCount ?? 0,
        transactions: transactionsCount ?? 0,
        goals: goalsCount ?? 0,
        investments: investmentsCount ?? 0,
      }}
    />
  );
}
