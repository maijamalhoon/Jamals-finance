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
  });

  it("is server-safe without browser globals", () => {
    expect(getStoredThemePreference()).toBe("system");
    expect(applyThemePreference("dark", { persist: false })).toBe("dark");
  });
});
