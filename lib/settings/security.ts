import { validatePasswordPolicy } from "@/lib/auth/password-policy";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface SettingsSnapshotCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string | null;
  parent_id: string | null;
}

export interface SettingsSnapshotStats {
  accounts: number | null;
  transactions: number | null;
  goals: number | null;
  investments: number | null;
}

export interface SettingsSnapshotInput {
  generatedAt: string;
  email: string;
  displayName: string;
  preferences: {
    currency: string;
    dateFormat: string;
    compactMode: boolean;
    themeMode: string;
  };
  categories: SettingsSnapshotCategory[] | null;
  stats: SettingsSnapshotStats;
}

export const CATEGORY_DELETE_VERIFICATION_ERROR =
  "Category references could not be verified. Please try again.";

export function validateProfileName(name: string): ValidationResult<string> {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return { ok: false, error: "Enter a display name." };
  }

  if (normalizedName.length > 80) {
    return {
      ok: false,
      error: "Display name must be 80 characters or fewer.",
    };
  }

  return { ok: true, value: normalizedName };
}

export function validatePasswordChange(input: {
  verificationCode: string;
  newPassword: string;
  confirmPassword: string;
}): ValidationResult<{ verificationCode: string; newPassword: string }> {
  const verificationCode = input.verificationCode.trim();

  if (!verificationCode) {
    return { ok: false, error: "Enter the verification code." };
  }

  if (!/^\d+$/.test(verificationCode)) {
    return {
      ok: false,
      error: "Verification code must contain digits only.",
    };
  }

  const passwordPolicy = validatePasswordPolicy(input.newPassword);
  if (!passwordPolicy.ok) {
    return { ok: false, error: passwordPolicy.error };
  }

  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  return {
    ok: true,
    value: { verificationCode, newPassword: input.newPassword },
  };
}

export function validateCategoryDeleteReadiness(input: {
  usageCount: number | null;
  childCount: number | null;
}): ValidationResult<{ usageCount: number; childCount: number }> {
  const counts = [input.usageCount, input.childCount];
  const countsAreValid = counts.every(
    (count) =>
      count !== null &&
      Number.isFinite(count) &&
      Number.isInteger(count) &&
      count >= 0,
  );

  if (!countsAreValid) {
    return {
      ok: false,
      error: CATEGORY_DELETE_VERIFICATION_ERROR,
    };
  }

  const usageCount = input.usageCount as number;
  const childCount = input.childCount as number;

  if (usageCount > 0) {
    return {
      ok: false,
      error: `Used by ${usageCount} transactions.`,
    };
  }

  if (childCount > 0) {
    return {
      ok: false,
      error: `Move ${childCount} subcategories before deleting.`,
    };
  }

  return { ok: true, value: { usageCount, childCount } };
}

export function mapAuthError(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "").toLowerCase()
      : "";
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : "";

  if (
    status === 429 ||
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (
    error instanceof TypeError ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed")
  ) {
    return "Check your connection and try again.";
  }

  return fallbackMessage;
}

export function buildSettingsSnapshot(input: SettingsSnapshotInput) {
  return {
    generatedAt: input.generatedAt,
    profile: {
      email: input.email,
      displayName: input.displayName,
    },
    displayPreferences: {
      currency: input.preferences.currency,
      dateFormat: input.preferences.dateFormat,
      compactMode: input.preferences.compactMode,
      themeMode: input.preferences.themeMode,
    },
    categoryConfiguration:
      input.categories === null
        ? null
        : input.categories.map((category) => ({
            id: category.id,
            name: category.name,
            type: category.type,
            color: category.color,
            parentId: category.parent_id,
          })),
    accountStatistics: {
      accounts: input.stats.accounts,
      transactions: input.stats.transactions,
      goals: input.stats.goals,
      investments: input.stats.investments,
    },
  };
}
