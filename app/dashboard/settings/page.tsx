import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsExperienceV2 from "@/components/settings/SettingsExperienceV2";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";

import "./settings-polish.css";
import "./settings-polish-fixes.css";
import "./settings-desktop-layout.css";
import "./settings-restructure.css";
import "./settings-windows-switch.css";
import "./settings-clean-finish.css";
import "./settings-appearance-global.css";

export const dynamic = "force-dynamic";

function logSettingsQueryError(
  context: string,
  error: { code?: string } | null,
) {
  if (!error) return;
  console.error("Settings query failed", { context, code: error.code ?? "unknown" });
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    categoriesResult,
    categoryUsageResult,
    accountsResult,
    transactionsResult,
    goalsResult,
    investmentsResult,
    notificationPreferencesResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, type, color, icon_key, parent_id")
      .eq("user_id", user.id)
      .order("type")
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name"),
    supabase
      .from("transactions")
      .select("category_id")
      .eq("user_id", user.id),
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("investments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("notification_preferences")
      .select("goal_alerts_enabled, payable_alerts_enabled")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  logSettingsQueryError("categories", categoriesResult.error);
  logSettingsQueryError("category-usage", categoryUsageResult.error);
  logSettingsQueryError("accounts-count", accountsResult.error);
  logSettingsQueryError("transactions-count", transactionsResult.error);
  logSettingsQueryError("goals-count", goalsResult.error);
  logSettingsQueryError("investments-count", investmentsResult.error);
  logSettingsQueryError("notification-preferences", notificationPreferencesResult.error);

  const categoriesAvailable =
    !categoriesResult.error && !categoryUsageResult.error;
  const categories = categoriesAvailable ? categoriesResult.data ?? [] : [];
  const transactionCategoryRows =
    categoriesAvailable ? categoryUsageResult.data ?? [] : [];

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
    <div className="settings-page-polish">
      <SettingsExperienceV2
        email={user.email ?? ""}
        userId={user.id}
        displayName={displayName}
        categories={(categories ?? []) as PersistentSettingsCategory[]}
        categoryUsage={categoryUsage}
        categoriesAvailable={categoriesAvailable}
        stats={{
          accounts: accountsResult.error ? null : accountsResult.count,
          transactions: transactionsResult.error ? null : transactionsResult.count,
          goals: goalsResult.error ? null : goalsResult.count,
          investments: investmentsResult.error ? null : investmentsResult.count,
        }}
        notificationPreferences={
          notificationPreferencesResult.data ?? {
            goal_alerts_enabled: true,
            payable_alerts_enabled: true,
          }
        }
        notificationPreferencesAvailable={!notificationPreferencesResult.error}
      />
    </div>
  );
}
