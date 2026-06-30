export const THEME_STORAGE_KEY = "jamal-theme";
export const THEME_CHANGE_EVENT = "jamal-theme-change";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ?
      "dark"
    : "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(savedTheme) ? savedTheme : "system";
}

export function resolveThemePreference(
  preference: ThemePreference,
): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function applyThemePreference(
  preference: ThemePreference,
  options: { persist?: boolean } = {},
): ResolvedTheme {
  const { persist = true } = options;
  const resolvedTheme = resolveThemePreference(preference);

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolvedTheme;
  }

  if (persist && typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { preference, resolvedTheme },
      }),
    );
  }

  return resolvedTheme;
}
