export const THEME_STORAGE_KEY = "jamal-theme";
export const THEME_CHANGE_EVENT = "jamal-theme-change";
export const THEME_VIEWPORT_COLORS = {
  light: "#F3F6FA",
  dark: "#0C1422",
} as const;

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export type ThemeRootState = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colorScheme: ResolvedTheme;
  dataTheme: ResolvedTheme;
  dataThemePreference: ThemePreference;
  darkClassActive: boolean;
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

export function getSystemTheme(matchesDark?: boolean): ResolvedTheme {
  if (typeof matchesDark === "boolean") return matchesDark ? "dark" : "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ?
      "dark"
    : "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    return normalizeThemePreference(
      window.localStorage.getItem(THEME_STORAGE_KEY),
    );
  } catch {
    return "system";
  }
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme = getSystemTheme(),
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

export function getThemeRootState(
  preference: ThemePreference,
  systemTheme: ResolvedTheme = getSystemTheme(),
): ThemeRootState {
  const resolvedTheme = resolveThemePreference(preference, systemTheme);

  return {
    preference,
    resolvedTheme,
    colorScheme: resolvedTheme,
    dataTheme: resolvedTheme,
    dataThemePreference: preference,
    darkClassActive: resolvedTheme === "dark",
  };
}

export function applyThemePreference(
  preference: ThemePreference,
  options: { persist?: boolean; systemTheme?: ResolvedTheme } = {},
): ResolvedTheme {
  const { persist = true, systemTheme = getSystemTheme() } = options;
  const state = getThemeRootState(preference, systemTheme);

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("dark", state.darkClassActive);
    root.style.colorScheme = state.colorScheme;
    root.dataset.themePreference = state.dataThemePreference;
    root.dataset.theme = state.dataTheme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_VIEWPORT_COLORS[state.resolvedTheme]);
  }

  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
      window.dispatchEvent(
        new CustomEvent(THEME_CHANGE_EVENT, {
          detail: { preference, resolvedTheme: state.resolvedTheme },
        }),
      );
    } catch {
      // Theme application should still work when storage is unavailable.
    }
  }

  return state.resolvedTheme;
}

export const THEME_BOOTSTRAP_SCRIPT = `
try {
  (function () {
    var root = document.documentElement;
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    var readPreference = function () {
      var savedTheme = localStorage.getItem(storageKey);
      return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
    };
    var applyPreference = function (theme) {
      var shouldUseDark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", shouldUseDark);
      root.style.colorScheme = shouldUseDark ? "dark" : "light";
      root.dataset.themePreference = theme;
      root.dataset.theme = shouldUseDark ? "dark" : "light";
      var themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.setAttribute("content", shouldUseDark ? ${JSON.stringify(THEME_VIEWPORT_COLORS.dark)} : ${JSON.stringify(THEME_VIEWPORT_COLORS.light)});
    };

    applyPreference(readPreference());
    media.addEventListener("change", function () {
      var theme = readPreference();
      if (theme === "system") applyPreference(theme);
    });
    window.addEventListener("storage", function (event) {
      if (event.key === null || event.key === storageKey) {
        applyPreference(readPreference());
      }
    });
  })();
} catch (_) {}
`;
