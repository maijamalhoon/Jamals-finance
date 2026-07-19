"use client";

import { useState } from "react";
import CategorySettingsSection from "@/components/settings/CategorySettingsSection";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import SettingsOneUI, {
  type AccountStats,
} from "@/components/settings/SettingsOneUI";
import SettingsPreferencesSection from "@/components/settings/SettingsPreferencesSection";

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
  const [preferenceRevision, setPreferenceRevision] = useState(0);

  return (
    <div className="settings-experience-v2">
      <div className="settings-core">
        <SettingsOneUI key={preferenceRevision} {...props} />
      </div>

      <SettingsPreferencesSection
        onPreferenceSaved={() =>
          setPreferenceRevision((revision) => revision + 1)
        }
      />

      <CategorySettingsSection
        initialCategories={props.categories}
        initialUsage={props.categoryUsage}
        userId={props.userId}
        available={props.categoriesAvailable}
      />
    </div>
  );
}
