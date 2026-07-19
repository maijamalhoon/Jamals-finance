"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import CategorySettingsSection from "@/components/settings/CategorySettingsSection";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import ProfileCustomizationSection from "@/components/settings/ProfileCustomizationSection";
import SettingsOneUI, {
  type AccountStats,
} from "@/components/settings/SettingsOneUI";
import SettingsPreferencesSection from "@/components/settings/SettingsPreferencesSection";

type SettingsExperienceV2Props = {
  email: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
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
      <header className="settings-simple-heading" aria-labelledby="settings-page-title">
        <span className="settings-simple-heading-icon" aria-hidden="true">
          <Settings2 size={24} />
        </span>
        <h1 id="settings-page-title">Settings</h1>
      </header>

      <ProfileCustomizationSection
        userId={props.userId}
        email={props.email}
        displayName={props.displayName}
        avatarUrl={props.avatarUrl}
      />

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
