import { describe, expect, it } from "vitest";

import {
  DEFAULT_APP_LANGUAGE,
  getAppLanguageDirection,
  getAppLanguageLocale,
  getAppLanguageName,
  getAppLanguageNativeName,
  isAppLanguage,
  normalizeAppLanguage,
} from "@/lib/i18n/config";

describe("app language configuration", () => {
  it("keeps English as the default", () => {
    expect(DEFAULT_APP_LANGUAGE).toBe("en");
    expect(normalizeAppLanguage(undefined)).toBe("en");
    expect(normalizeAppLanguage("unsupported")).toBe("en");
  });

  it("recognizes every supported language code", () => {
    expect(isAppLanguage("en")).toBe(true);
    expect(isAppLanguage("ur")).toBe(true);
    expect(isAppLanguage("ar")).toBe(true);
    expect(isAppLanguage("hi")).toBe(true);
    expect(isAppLanguage("es")).toBe(true);
    expect(isAppLanguage("fr")).toBe(false);
  });

  it("uses RTL only for Urdu and Arabic", () => {
    expect(getAppLanguageDirection("ur")).toBe("rtl");
    expect(getAppLanguageDirection("ar")).toBe("rtl");
    expect(getAppLanguageDirection("en")).toBe("ltr");
    expect(getAppLanguageDirection("hi")).toBe("ltr");
    expect(getAppLanguageDirection("es")).toBe("ltr");
  });

  it("returns stable locale and display metadata", () => {
    expect(getAppLanguageLocale("ur")).toBe("ur-PK");
    expect(getAppLanguageName("es")).toBe("Spanish");
    expect(getAppLanguageNativeName("hi")).toBe("हिन्दी");
  });
});
