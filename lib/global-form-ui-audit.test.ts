import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const auditAuthority = read("../components/forms/GlobalFormAuditAuthority.tsx");
const fieldAuthority = read("../components/forms/GlobalFormFieldAuthority.tsx");
const actionAuthority = read("../components/forms/GlobalFormActionAuthority.tsx");
const dashboardActionAuthority = read(
  "../components/forms/FinancePickerKeyboardGuard.tsx",
);
const pwaRegister = read("../app/pwa-register.tsx");
const authControls = read("../components/auth/AuthControls.tsx");
const loginPage = read("../app/login/page.tsx");
const onboardingPage = read("../app/onboarding/page.tsx");
const resetPasswordPage = read("../app/reset-password/page.tsx");
const profileCustomization = read(
  "../components/settings/ProfileCustomizationSection.tsx",
);
const settingsPreferences = read(
  "../components/settings/SettingsPreferencesSection.tsx",
);
const settingsReference = read(
  "../components/settings/SettingsReferenceSections.tsx",
);
const categoryManagement = read(
  "../components/settings/CategoryManagementExperience.tsx",
);
const settingsCentering = read(
  "../app/dashboard/settings/settings-mobile-modal-centering.css",
);

describe("site-wide form UI audit authority", () => {
  it("mounts responsive field, action and audit authorities for every route", () => {
    expect(pwaRegister).toContain("GlobalFormAuditAuthority");
    expect(pwaRegister).toContain("GlobalFormFieldAuthority");
    expect(pwaRegister).toContain("GlobalFormActionAuthority");
    expect(pwaRegister).toContain("<GlobalFormAuditAuthority />");
    expect(pwaRegister).toContain("<GlobalFormFieldAuthority />");
    expect(pwaRegister).toContain("<GlobalFormActionAuthority />");
  });

  it("uses one device-responsive field and action token", () => {
    expect(auditAuthority).toContain("--jf-global-form-control-height: clamp(");
    expect(auditAuthority).toContain("--jf-global-date-control-height");
    expect(auditAuthority).toContain("--jf-global-multiline-control-height");
    expect(auditAuthority).toContain("--jf-global-final-action-height: clamp(");
    expect(auditAuthority).toContain("--jf-global-form-action-height");
  });

  it("covers native, auth, date, account, category and wheel controls", () => {
    for (const selector of [
      "input:not",
      "textarea",
      "select",
      ".auth-field-control",
      ".auth-input",
      ".finance-account-select",
      '[data-slot="select-trigger"]',
      '[role="combobox"]',
      '[role="listbox"][aria-roledescription="scroll picker"]',
      '[role="spinbutton"][aria-haspopup="dialog"]',
    ]) {
      expect(fieldAuthority).toContain(selector);
    }
    expect(fieldAuthority).toContain('[role="radiogroup"], [role="group"]');
    expect(fieldAuthority).toContain("isManagedChoiceGroup");
    expect(fieldAuthority).not.toContain(':has(> button[aria-pressed])');
  });

  it("keeps finance action colors while removing button icons and shortening labels", () => {
    expect(dashboardActionAuthority).toContain(
      'button[data-jf-form-action="true"] svg',
    );
    expect(dashboardActionAuthority).toContain("display: none !important");
    expect(dashboardActionAuthority).toContain("getShortActionLabel");
    expect(dashboardActionAuthority).toContain("data-jf-form-action-label");
    expect(auditAuthority).toContain('button[data-jf-form-action="true"]::after');
  });

  it("covers supporting Settings and confirmation actions without touching controls", () => {
    for (const verb of [
      "choose",
      "resend",
      "enable",
      "archive",
      "restore",
      "retry",
    ]) {
      expect(actionAuthority).toContain(verb);
    }
    expect(actionAuthority).toContain('[data-slot="dialog-close"]');
    expect(actionAuthority).toContain('[aria-haspopup]');
    expect(actionAuthority).toContain('[role="radio"]');
    expect(actionAuthority).toContain("finance-icon-bubble");
    expect(actionAuthority).toContain("data-global-confirm-dialog");
  });

  it("preserves auth labels and colors while making auth actions iconless and equal", () => {
    expect(auditAuthority).toContain(".auth-primary-action svg");
    expect(auditAuthority).toContain(".jf-auth-card button.w-full");
    expect(auditAuthority).toContain("display: none !important");
    expect(authControls).toContain("auth-primary-action w-full");
    expect(loginPage).toContain("Continue");
    expect(loginPage).toContain("Log in");
    expect(loginPage).toContain("Create account");
    expect(resetPasswordPage).toContain("Update password");
    expect(onboardingPage).toContain("Open dashboard");
  });

  it("keeps onboarding segmented account type inside the shared field footprint", () => {
    expect(onboardingPage).toContain('role="group" aria-label="Account type"');
    expect(onboardingPage).toContain("aria-pressed={selected}");
    expect(fieldAuthority).toContain('[role="group"]');
  });

  it("covers all Settings form families and their supporting actions", () => {
    expect(profileCustomization).toContain("Choose Photo");
    expect(profileCustomization).toContain("Save Profile");
    expect(settingsPreferences).toContain("settings-currency-select");
    expect(settingsPreferences).toContain("settings-date-format-select");
    expect(settingsReference).toContain("Send verification code");
    expect(settingsReference).toContain("Resend code");
    expect(settingsReference).toContain("Sign out other devices");
    expect(categoryManagement).toContain("Create Category");
    expect(categoryManagement).toContain("Delete");
  });

  it("keeps every known Settings dialog centered with its purpose-specific width", () => {
    for (const marker of [
      "#settings-category-name",
      "#persistent-category-name",
      "#settings-currency-select",
      "#settings-date-format-select",
      "#settings-reference-display-name",
      "#custom-profile-name",
      ".settings-security-panel",
    ]) {
      expect(settingsCentering).toContain(marker);
      expect(auditAuthority).toContain(marker);
    }
    expect(auditAuthority).toContain("46rem");
    expect(auditAuthority).toContain("36rem");
    expect(auditAuthority).toContain("32rem");
  });
});
