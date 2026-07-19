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

const sectionHeadingCss = `
.settings-page-polish .settings-profile-customization .settings-section-label,
.settings-page-polish .settings-core > div > div > section:nth-of-type(2) > p:first-child {
  display: flex !important;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.55rem;
  margin: 0 !important;
  padding: 0 0.35rem 0.55rem !important;
  color: var(--text-primary) !important;
  font-family: var(--font-geist-sans), var(--font-sans) !important;
  font-size: clamp(0.98rem, 2vw, 1.08rem) !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  letter-spacing: -0.018em !important;
  text-transform: none !important;
}

.settings-page-polish .settings-profile-customization .settings-section-label::before,
.settings-page-polish .settings-core > div > div > section:nth-of-type(2) > p:first-child::before {
  content: "";
  display: block;
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  background: var(--primary);
}

.settings-page-polish .settings-profile-customization .settings-section-label::before {
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='5'/%3E%3Cpath d='M20 21a8 8 0 0 0-16 0'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='5'/%3E%3Cpath d='M20 21a8 8 0 0 0-16 0'/%3E%3C/svg%3E") center / contain no-repeat;
}

.settings-page-polish .settings-core > div > div > section:nth-of-type(2) > p:first-child::before {
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='13.5' cy='6.5' r='.5' fill='black'/%3E%3Ccircle cx='17.5' cy='10.5' r='.5' fill='black'/%3E%3Ccircle cx='8.5' cy='7.5' r='.5' fill='black'/%3E%3Ccircle cx='6.5' cy='12.5' r='.5' fill='black'/%3E%3Cpath d='M12 2a10 10 0 0 0 0 20c.926 0 1.5-.746 1.5-1.667 0-.437-.18-.835-.437-1.125-.29-.326-.063-.9.373-.9H15a7 7 0 0 0 0-14Z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='13.5' cy='6.5' r='.5' fill='black'/%3E%3Ccircle cx='17.5' cy='10.5' r='.5' fill='black'/%3E%3Ccircle cx='8.5' cy='7.5' r='.5' fill='black'/%3E%3Ccircle cx='6.5' cy='12.5' r='.5' fill='black'/%3E%3Cpath d='M12 2a10 10 0 0 0 0 20c.926 0 1.5-.746 1.5-1.667 0-.437-.18-.835-.437-1.125-.29-.326-.063-.9.373-.9H15a7 7 0 0 0 0-14Z'/%3E%3C/svg%3E") center / contain no-repeat;
}

.settings-page-polish .settings-preferences-slot > section {
  position: relative;
  padding-top: 2.8rem;
}

.settings-page-polish .settings-preferences-slot > section::before {
  content: "";
  position: absolute;
  top: 0.54rem;
  left: 0.35rem;
  width: 1.15rem;
  height: 1.15rem;
  background: var(--primary);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='21' x2='14' y1='4' y2='4'/%3E%3Cline x1='10' x2='3' y1='4' y2='4'/%3E%3Cline x1='21' x2='12' y1='12' y2='12'/%3E%3Cline x1='8' x2='3' y1='12' y2='12'/%3E%3Cline x1='21' x2='16' y1='20' y2='20'/%3E%3Cline x1='12' x2='3' y1='20' y2='20'/%3E%3Cline x1='14' x2='14' y1='2' y2='6'/%3E%3Cline x1='8' x2='8' y1='10' y2='14'/%3E%3Cline x1='16' x2='16' y1='18' y2='22'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='21' x2='14' y1='4' y2='4'/%3E%3Cline x1='10' x2='3' y1='4' y2='4'/%3E%3Cline x1='21' x2='12' y1='12' y2='12'/%3E%3Cline x1='8' x2='3' y1='12' y2='12'/%3E%3Cline x1='21' x2='16' y1='20' y2='20'/%3E%3Cline x1='12' x2='3' y1='20' y2='20'/%3E%3Cline x1='14' x2='14' y1='2' y2='6'/%3E%3Cline x1='8' x2='8' y1='10' y2='14'/%3E%3Cline x1='16' x2='16' y1='18' y2='22'/%3E%3C/svg%3E") center / contain no-repeat;
}

.settings-page-polish .settings-preferences-slot > section::after {
  content: "Preferences";
  position: absolute;
  top: 0;
  left: 2.05rem;
  display: flex;
  min-height: 2.25rem;
  align-items: center;
  padding-bottom: 0.55rem;
  color: var(--text-primary);
  font-family: var(--font-geist-sans), var(--font-sans);
  font-size: clamp(0.98rem, 2vw, 1.08rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.018em;
}

.settings-page-polish .settings-preferences-slot .settings-preferences-intro {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  overflow: hidden !important;
  clip: rect(0 0 0 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
}

.settings-page-polish .settings-preferences-slot .settings-preferences-intro + .settings-preferences-divider {
  display: none !important;
}

.settings-page-polish .settings-core > div > div > section:nth-of-type(2) .finance-panel > div:first-child > div:first-child {
  display: none !important;
}

.settings-page-polish .settings-core > div > div > section:nth-of-type(2) [role="radiogroup"] {
  margin-top: 0 !important;
}

.settings-page-polish .settings-core > div > div > section:nth-of-type(2) [role="radio"] > span:nth-child(2) > span:last-child,
.settings-page-polish .settings-profile-customization .finance-panel > button .min-w-0.flex-1 > span:last-child,
.settings-page-polish .settings-core > div > div > section:nth-of-type(1) .finance-panel > button .min-w-0.flex-1 > span:last-child,
.settings-page-polish .settings-preferences-slot .finance-panel > button .min-w-0.flex-1 > span:last-child {
  display: none !important;
}
`;

export default function SettingsExperienceV2(
  props: SettingsExperienceV2Props,
) {
  const [preferenceRevision, setPreferenceRevision] = useState(0);

  return (
    <div className="settings-experience-v2">
      <style>{sectionHeadingCss}</style>
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
