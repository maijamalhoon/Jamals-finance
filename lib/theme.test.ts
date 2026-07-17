import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyThemePreference,
  getStoredThemePreference,
  getThemeRootState,
  isThemePreference,
  normalizeThemePreference,
  resolveThemePreference,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_PREFERENCES,
  THEME_VIEWPORT_COLORS,
} from "./theme";
import { getReadableTextColor } from "./theme-colors";

const settingsSource = readFileSync(
  new URL("../components/settings/SettingsOneUI.tsx", import.meta.url),
  "utf8",
);

const globalsCssSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

function getCssRule(source: string, selectorStart: string) {
  const ruleStart = source.indexOf(selectorStart);
  if (ruleStart === -1) throw new Error(`Missing CSS rule: ${selectorStart}`);

  const declarationStart = source.indexOf("{", ruleStart);
  const ruleEnd = source.indexOf("}", declarationStart);
  return source.slice(ruleStart, ruleEnd + 1);
}

const nonSettingsThemeSurfaces = [
  "../components/landing/PremiumLandingPage.tsx",
  "../components/auth/AuthShell.tsx",
  "../components/layout/JamalMenu.tsx",
].map((relativePath) => ({
  relativePath,
  source: readFileSync(new URL(relativePath, import.meta.url), "utf8"),
}));

describe("theme contracts", () => {
  it("accepts exactly system, light, and dark", () => {
    expect(THEME_PREFERENCES).toEqual(["system", "light", "dark"]);
    expect(THEME_PREFERENCES.every(isThemePreference)).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
  });

  it("falls back invalid stored values to system", () => {
    expect(normalizeThemePreference("sepia")).toBe("system");
    expect(normalizeThemePreference(null)).toBe("system");
  });

  it("resolves system from the current operating-system theme", () => {
    expect(resolveThemePreference("system", "light")).toBe("light");
    expect(resolveThemePreference("system", "dark")).toBe("dark");
  });

  it("keeps manual preferences ahead of system changes", () => {
    expect(resolveThemePreference("light", "dark")).toBe("light");
    expect(resolveThemePreference("dark", "light")).toBe("dark");
  });

  it("keeps root theme attributes internally consistent", () => {
    expect(getThemeRootState("system", "dark")).toEqual({
      preference: "system",
      resolvedTheme: "dark",
      colorScheme: "dark",
      dataTheme: "dark",
      dataThemePreference: "system",
      darkClassActive: true,
    });

    expect(getThemeRootState("system", "light")).toEqual({
      preference: "system",
      resolvedTheme: "light",
      colorScheme: "light",
      dataTheme: "light",
      dataThemePreference: "system",
      darkClassActive: false,
    });

    expect(getThemeRootState("light", "dark")).toMatchObject({
      preference: "light",
      resolvedTheme: "light",
      colorScheme: "light",
      dataTheme: "light",
      dataThemePreference: "light",
      darkClassActive: false,
    });

    expect(getThemeRootState("dark", "light")).toMatchObject({
      preference: "dark",
      resolvedTheme: "dark",
      colorScheme: "dark",
      dataTheme: "dark",
      dataThemePreference: "dark",
      darkClassActive: true,
    });
  });

  it("keeps the only visible theme control in Settings Appearance", () => {
    expect(settingsSource).toContain("<SectionTitle>Appearance</SectionTitle>");
    expect(settingsSource).toContain('role="radiogroup"');
    expect(settingsSource).toContain('aria-label="Theme preference"');
    expect(settingsSource).toContain('role="radio"');
    expect(settingsSource).toContain('value: "system"');
    expect(settingsSource).toContain('value: "light"');
    expect(settingsSource).toContain('value: "dark"');
    expect(settingsSource).not.toMatch(/<select\b/);

    for (const { relativePath, source } of nonSettingsThemeSurfaces) {
      expect(source, relativePath).not.toContain("ThemeSelector");
      expect(source, relativePath).not.toContain('role="radiogroup"');
      expect(source, relativePath).not.toContain("applyThemePreference");
      expect(source, relativePath).not.toContain("jamal-theme");
    }

    expect(
      existsSync(
        new URL("../components/theme/ThemeSelector.tsx", import.meta.url),
      ),
    ).toBe(false);
  });

  it("bootstraps system mode before hydration and keeps OS changes live", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('return savedTheme === "light"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('? savedTheme : "system"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(
      'window.matchMedia("(prefers-color-scheme: dark)")',
    );
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('media.addEventListener("change"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('root.classList.toggle("dark"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('meta[name="theme-color"]');
    expect(THEME_VIEWPORT_COLORS).toEqual({
      light: "#F3F6FA",
      dark: "#0C1422",
    });
  });

  it("defines the requested complete light and dark semantic palettes", () => {
    const lightRule = getCssRule(globalsCssSource, ":root");
    const darkRule = getCssRule(globalsCssSource, "\n.dark {");

    for (const declaration of [
      "--page-background: #f3f6fa;",
      "--background-subtle: #e9eff6;",
      "--surface: #ffffff;",
      "--surface-tinted: #f7f9fc;",
      "--primary: #2956c8;",
      "--secondary: #0c766f;",
      "--success: #147a55;",
      "--danger: #b84f4a;",
      "--income: #147a55;",
      "--expense: #b84f4a;",
      "--transfer: #2366b1;",
      "--investment: #6849b8;",
      "--goals: #0b777b;",
      "--payables: #9a650c;",
    ]) {
      expect(lightRule).toContain(declaration);
    }

    for (const declaration of [
      "--page-background: #0c1422;",
      "--background-subtle: #111c2d;",
      "--surface: #152136;",
      "--surface-elevated: #1a2940;",
      "--surface-tinted: #18263b;",
      "--primary: #9bb0ff;",
      "--secondary: #55c5ba;",
      "--success: #48c691;",
      "--danger: #f09189;",
      "--income: #48c691;",
      "--expense: #f09189;",
      "--transfer: #70adef;",
      "--investment: #b39af2;",
      "--goals: #56c9c2;",
      "--payables: #e4b45d;",
    ]) {
      expect(darkRule).toContain(declaration);
    }
  });

  it("keeps persisted category swatch labels readable", () => {
    expect(getReadableTextColor("#2956C8")).toBe("#FFFFFF");
    expect(getReadableTextColor("#E5F4ED")).toBe("#17233A");
  });

  it("keeps dark shared repairs on the approved semantic tokens", () => {
    expect(globalsCssSource).not.toMatch(/\.theme-selector\b/);

    const primaryActionRule = getCssRule(
      globalsCssSource,
      ".dark .primary-action",
    );
    const successRule = getCssRule(
      globalsCssSource,
      ".dark :where(.finance-status-success",
    );
    const dangerRule = getCssRule(
      globalsCssSource,
      ".dark :where(.finance-status-danger",
    );
    const warningRule = getCssRule(
      globalsCssSource,
      ".dark :where(.finance-status-warning",
    );
    const infoRule = getCssRule(
      globalsCssSource,
      ".dark :where(.finance-status-info",
    );

    expect(primaryActionRule).toContain("color: var(--brand-on-accent);");
    expect(successRule).toContain("color: var(--success);");
    expect(dangerRule).toContain("color: var(--danger);");
    expect(warningRule).toContain("color: var(--warning);");
    expect(infoRule).toContain("color: var(--info);");
    expect(infoRule).not.toContain("var(--active)");
    expect(globalsCssSource).not.toMatch(/#79f0b4|#ff9a9a|#ffd27a/i);
  });

  it("is server-safe without browser globals", () => {
    expect(getStoredThemePreference()).toBe("system");
    expect(applyThemePreference("dark", { persist: false })).toBe("dark");
  });
});
