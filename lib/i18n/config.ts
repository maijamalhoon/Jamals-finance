export type AppLanguage = "en" | "ur" | "ar" | "hi" | "es";

export type AppLanguageDirection = "ltr" | "rtl";

export type AppLanguageOption = {
  code: AppLanguage;
  locale: string;
  name: string;
  nativeName: string;
  direction: AppLanguageDirection;
  aiInstructionName: string;
};

export const DEFAULT_APP_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "jamals-finance-language";
export const LANGUAGE_CHANGE_EVENT = "jamals-finance-language-change";

export const APP_LANGUAGE_OPTIONS: readonly AppLanguageOption[] = [
  {
    code: "en",
    locale: "en-US",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    aiInstructionName: "English",
  },
  {
    code: "ur",
    locale: "ur-PK",
    name: "Urdu",
    nativeName: "اردو",
    direction: "rtl",
    aiInstructionName: "Urdu",
  },
  {
    code: "ar",
    locale: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    aiInstructionName: "Arabic",
  },
  {
    code: "hi",
    locale: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
    aiInstructionName: "Hindi",
  },
  {
    code: "es",
    locale: "es",
    name: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    aiInstructionName: "Spanish",
  },
] as const;

export const SUPPORTED_APP_LANGUAGES = APP_LANGUAGE_OPTIONS.map(
  (option) => option.code,
) as AppLanguage[];

const LANGUAGE_OPTIONS_BY_CODE = new Map<AppLanguage, AppLanguageOption>(
  APP_LANGUAGE_OPTIONS.map((option) => [option.code, option]),
);

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" &&
    SUPPORTED_APP_LANGUAGES.includes(value as AppLanguage)
  );
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
}

export function getAppLanguageOption(value: unknown): AppLanguageOption {
  const language = normalizeAppLanguage(value);
  return (
    LANGUAGE_OPTIONS_BY_CODE.get(language) ??
    LANGUAGE_OPTIONS_BY_CODE.get(DEFAULT_APP_LANGUAGE)!
  );
}

export function getAppLanguageDirection(
  value: unknown,
): AppLanguageDirection {
  return getAppLanguageOption(value).direction;
}

export function getAppLanguageLocale(value: unknown): string {
  return getAppLanguageOption(value).locale;
}

export function getAppLanguageName(value: unknown): string {
  return getAppLanguageOption(value).name;
}

export function getAppLanguageNativeName(value: unknown): string {
  return getAppLanguageOption(value).nativeName;
}

const LANGUAGE_DIRECTIONS = Object.fromEntries(
  APP_LANGUAGE_OPTIONS.map((option) => [option.code, option.direction]),
);

export const LANGUAGE_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const key = ${JSON.stringify(LANGUAGE_STORAGE_KEY)};
    const fallback = ${JSON.stringify(DEFAULT_APP_LANGUAGE)};
    const allowed = ${JSON.stringify(SUPPORTED_APP_LANGUAGES)};
    const directions = ${JSON.stringify(LANGUAGE_DIRECTIONS)};
    const stored = window.localStorage.getItem(key);
    const language = allowed.includes(stored) ? stored : fallback;
    const direction = directions[language] || "ltr";
    const root = document.documentElement;

    root.lang = language;
    root.dir = direction;
    root.dataset.language = language;

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = key + "=" + encodeURIComponent(language) + "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
  } catch {}
})();
`;
