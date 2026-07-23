"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  APP_LANGUAGE_OPTIONS,
  DEFAULT_APP_LANGUAGE,
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  getAppLanguageOption,
  isAppLanguage,
  type AppLanguage,
  type AppLanguageOption,
} from "@/lib/i18n/config";

type LanguageContextValue = {
  language: AppLanguage;
  option: AppLanguageOption;
  options: readonly AppLanguageOption[];
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readDocumentLanguage(): AppLanguage {
  if (typeof document === "undefined") return DEFAULT_APP_LANGUAGE;

  const value = document.documentElement.dataset.language;
  return isAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
}

function writeDeviceLanguage(language: AppLanguage) {
  const option = getAppLanguageOption(language);
  const root = document.documentElement;

  root.lang = language;
  root.dir = option.direction;
  root.dataset.language = language;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANGUAGE_STORAGE_KEY}=${encodeURIComponent(language)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(
    DEFAULT_APP_LANGUAGE,
  );

  useEffect(() => {
    const initialLanguage = readDocumentLanguage();
    writeDeviceLanguage(initialLanguage);
    setLanguageState(initialLanguage);

    function handleStorage(event: StorageEvent) {
      if (event.key !== LANGUAGE_STORAGE_KEY || !isAppLanguage(event.newValue)) {
        return;
      }

      writeDeviceLanguage(event.newValue);
      setLanguageState(event.newValue);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    const normalized = isAppLanguage(nextLanguage)
      ? nextLanguage
      : DEFAULT_APP_LANGUAGE;

    writeDeviceLanguage(normalized);
    setLanguageState(normalized);
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGE_EVENT, {
        detail: { language: normalized },
      }),
    );
  }, []);

  const option = useMemo(() => getAppLanguageOption(language), [language]);
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      option,
      options: APP_LANGUAGE_OPTIONS,
      setLanguage,
    }),
    [language, option, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
