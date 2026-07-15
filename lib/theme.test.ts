import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyThemePreference,
  getStoredThemePreference,
  getThemeRootState,
  isThemePreference,
  normalizeThemePreference,
  resolveThemePreference,
  THEME_PREFERENCES,
} from "./theme";

const settingsSource = readFileSync(
  new URL("../components/settings/SettingsOneUI.tsx", import.meta.url),
  "utf8",
);

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
    }

    expect(
      existsSync(
        new URL("../components/theme/ThemeSelector.tsx", import.meta.url),
      ),
    ).toBe(false);
  });

  it("is server-safe without browser globals", () => {
    expect(getStoredThemePreference()).toBe("system");
    expect(applyThemePreference("dark", { persist: false })).toBe("dark");
  });
});
