import type { NextRequest } from "next/server";

import {
  DEFAULT_APP_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  getAppLanguageOption,
  isAppLanguage,
  type AppLanguage,
  type AppLanguageOption,
} from "@/lib/i18n/config";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function resolveRequestLanguage(
  request: NextRequest,
  body?: unknown,
): AppLanguageOption {
  const bodyLanguage =
    isRecord(body) && typeof body.language === "string"
      ? body.language
      : null;
  const queryLanguage = request.nextUrl.searchParams.get("language");
  const headerLanguage = request.headers.get("x-jf-language");
  const cookieLanguage = request.cookies.get(LANGUAGE_STORAGE_KEY)?.value;
  const selected = [
    bodyLanguage,
    queryLanguage,
    headerLanguage,
    cookieLanguage,
  ].find(isAppLanguage);

  return getAppLanguageOption(selected ?? DEFAULT_APP_LANGUAGE);
}

export function buildAIResponseLanguageInstruction(
  language: AppLanguageOption,
): string {
  return [
    `The website language selected on this device is ${language.aiInstructionName} (${language.code}).`,
    `Write every user-facing title, message, action, answer, and follow-up in ${language.aiInstructionName}.`,
    "Keep JSON property names exactly as requested in English.",
    "Do not switch to the question's language when it differs from the selected website language.",
  ].join(" ");
}

export type { AppLanguage };
