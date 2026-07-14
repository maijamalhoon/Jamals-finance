"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  applyThemePreference,
  getStoredThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

const themeOptions = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] satisfies Array<{ value: ThemePreference; label: string }>;

export default function ThemeSelector({
  className,
  label = "Theme",
  showLabel = false,
}: {
  className?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function syncTheme() {
      const storedPreference = getStoredThemePreference();
      setPreference(storedPreference);
      setResolvedTheme(
        applyThemePreference(storedPreference, { persist: false }),
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === THEME_STORAGE_KEY) syncTheme();
    }

    syncTheme();
    media.addEventListener("change", syncTheme);
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      media.removeEventListener("change", syncTheme);
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function handleChange(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    setResolvedTheme(applyThemePreference(nextPreference));
  }

  const Icon =
    preference === "system" ? Monitor : preference === "dark" ? Moon : Sun;

  return (
    <label
      className={cn(
        "theme-selector finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-primary px-3 text-sm font-semibold text-text-secondary shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      {showLabel ? <span className="text-text-primary">{label}</span> : null}
      <span className="sr-only">{label}</span>
      <select
        aria-label={`${label} preference`}
        value={preference}
        onChange={(event) =>
          handleChange(event.target.value as ThemePreference)
        }
        className="min-h-9 min-w-0 cursor-pointer appearance-none bg-transparent pr-4 font-semibold text-text-primary outline-none"
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="sr-only" aria-live="polite">
        Resolved theme: {resolvedTheme}
      </span>
    </label>
  );
}
