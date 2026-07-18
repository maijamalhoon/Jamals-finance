"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useState } from "react";

import CategoryManagementExperience, {
  type PersistentSettingsCategory,
} from "@/components/settings/CategoryManagementExperience";
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
  const [categoryOpen, setCategoryOpen] = useState(false);

  function captureCategoriesClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button) return;

    const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const isCategoriesLauncher =
      text.startsWith("Categories") &&
      text.includes("Manage income and expense categories");
    if (!isCategoriesLauncher) return;

    event.preventDefault();
    event.stopPropagation();
    setCategoryOpen(true);
  }

  return (
    <>
      <div onClickCapture={captureCategoriesClick}>
        <SettingsOneUI {...props} />
      </div>
      <CategoryManagementExperience
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        initialCategories={props.categories}
        initialUsage={props.categoryUsage}
        userId={props.userId}
        available={props.categoriesAvailable}
      />
    </>
  );
}
