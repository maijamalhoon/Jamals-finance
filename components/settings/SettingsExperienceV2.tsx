"use client";

import CategorySettingsSection from "@/components/settings/CategorySettingsSection";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import SettingsOneUI, {
  type AccountStats,
} from "@/components/settings/SettingsOneUI";

type SettingsExperienceV2Props = {
  email: string;
  userId: string;
  displayName: string;
  categories: PersistentSettingsCategory[];
  categoryUsage: Record<string, number>;
  categoriesAvailable: boolean;
  stats: AccountStats;
  notificationPreferences: {
    goal_alerts_enabled: boolean;
    payable_alerts_enabled: boolean;
  };
  notificationPreferencesAvailable: boolean;
};

export default function SettingsExperienceV2(
  props: SettingsExperienceV2Props,
) {
  return (
    <>
      <div className="[&_section:nth-of-type(2)_.finance-panel>button:last-of-type]:hidden [&_section:nth-of-type(2)_.finance-panel>div:last-of-type]:hidden">
        <SettingsOneUI {...props} />
      </div>

      <CategorySettingsSection
        initialCategories={props.categories}
        initialUsage={props.categoryUsage}
        userId={props.userId}
        available={props.categoriesAvailable}
      />
    </>
  );
}
