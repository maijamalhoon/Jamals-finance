"use client";

import { SlidersHorizontal, Tags } from "@/components/icons/jalvoro/compat";

import CategorySettingsSection from "@/components/settings/CategorySettingsSection";
import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import ProfileCustomizationSection from "@/components/settings/ProfileCustomizationSection";
import SettingsAnimationPreviewControl from "@/components/settings/SettingsAnimationPreviewControl";
import SettingsDataTransferSection from "@/components/settings/SettingsDataTransferSection";
import {
  SettingsAppearanceSection,
  SettingsProfileSecuritySection,
  type SettingsReferenceStats,
} from "@/components/settings/SettingsReferenceSections";
import SettingsPreferencesSection from "@/components/settings/SettingsPreferencesSection";

type SettingsExperienceV2Props = {
  email: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  categories: PersistentSettingsCategory[];
  categoryUsage: Record<string, number>;
  categoriesAvailable: boolean;
  stats: SettingsReferenceStats;
  notificationPreferences: {
    goal_alerts_enabled: boolean;
    payable_alerts_enabled: boolean;
  };
  notificationPreferencesAvailable: boolean;
};

export default function SettingsExperienceV2(props: SettingsExperienceV2Props) {
  return (
    <div className="settings-experience-v2">
      <header
        className="settings-reference-page-heading"
        aria-labelledby="settings-page-title"
      >
        <h1 id="settings-page-title">Settings</h1>
      </header>

      <ProfileCustomizationSection
        userId={props.userId}
        email={props.email}
        displayName={props.displayName}
        avatarUrl={props.avatarUrl}
        stats={{
          transactions: props.stats.transactions,
          categories: props.categoriesAvailable ? props.categories.length : null,
          accounts: props.stats.accounts,
        }}
      />

      <div className="settings-reference-grid">
        <div className="settings-reference-appearance">
          <SettingsAppearanceSection />
          <SettingsAnimationPreviewControl />
        </div>

        <section className="settings-reference-section settings-reference-preferences-wrapper">
          <h2 className="settings-reference-section-heading">
            <span aria-hidden="true">
              <SlidersHorizontal size={19} strokeWidth={2.35} />
            </span>
            Preferences
          </h2>
          <SettingsPreferencesSection />
        </section>

        <SettingsProfileSecuritySection
          email={props.email}
          displayName={props.displayName}
        />

        <section className="settings-reference-section settings-reference-categories-wrapper">
          <h2 className="settings-reference-section-heading">
            <span aria-hidden="true">
              <Tags size={19} strokeWidth={2.35} />
            </span>
            Categories
          </h2>
          <CategorySettingsSection
            initialCategories={props.categories}
            initialUsage={props.categoryUsage}
            userId={props.userId}
            available={props.categoriesAvailable}
          />
        </section>

        <SettingsDataTransferSection
          email={props.email}
          displayName={props.displayName}
        />
      </div>
    </div>
  );
}
