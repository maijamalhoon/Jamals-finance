import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const auditAuthority = read("../components/forms/GlobalFormAuditAuthority.tsx");
const fieldAuthority = read("../components/forms/GlobalFormFieldAuthority.tsx");
const dashboardActionAuthority = read(
  "../components/forms/FinancePickerKeyboardGuard.tsx",
);
const pwaRegister = read("../app/pwa-register.tsx");
const authControls = read("../components/auth/AuthControls.tsx");
const loginPage = read("../app/login/page.tsx");
const settingsCentering = read(
  "../app/dashboard/settings/settings-mobile-modal-centering.css",
);

describe("site-wide form UI audit authority", () => {
  it("mounts responsive field and audit authorities for every route", () => {
    expect(pwaRegister).toContain("GlobalFormAuditAuthority");
    expect(pwaRegister).toContain("GlobalFormFieldAuthority");
    expect(pwaRegister).toContain("<GlobalFormAuditAuthority />");
    expect(pwaRegister).toContain("<GlobalFormFieldAuthority />");
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
  });

  it("keeps finance action colors while removing button icons and shortening labels", () => {
    expect(dashboardActionAuthority).toContain(
      'button[data-jf-form-action="true"] svg',
    );
    expect(dashboardActionAuthority).toContain("display: none !important");
    expect(dashboardActionAuthority).toContain("getShortActionLabel");
    expect(dashboardActionAuthority).toContain("data-jf-form-action-label");
  });

  it("preserves auth labels and colors while removing only primary action icons", () => {
    expect(auditAuthority).toContain(".auth-primary-action svg");
    expect(auditAuthority).toContain("display: none !important");
    expect(authControls).toContain("auth-primary-action w-full");
    expect(loginPage).toContain("Continue");
    expect(loginPage).toContain("Log in");
    expect(loginPage).toContain("Create account");
  });

  it("keeps every known Settings dialog in the mobile and tablet centering authority", () => {
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
    }
  });
});
