import { describe, expect, it } from "vitest";
import {
  buildSettingsSnapshot,
  mapAuthError,
  validateCategoryDeleteReadiness,
  validatePasswordChange,
  validateProfileName,
} from "./security";

const baseSnapshot = {
  generatedAt: "2026-07-11T00:00:00.000Z",
  email: "jamal@example.com",
  displayName: "Jamal",
  preferences: {
    currency: "PKR",
    dateFormat: "dd MMM yyyy",
    compactMode: false,
    themeMode: "system",
  },
  categories: [
    {
      id: "category-1",
      name: "Salary",
      type: "income" as const,
      color: "#22c55e",
      parent_id: null,
    },
  ],
  stats: { accounts: 2, transactions: 4, goals: 1, investments: 3 },
};

describe("settings security helpers", () => {
  it("rejects an empty profile name", () => {
    expect(validateProfileName("   ")).toEqual({
      ok: false,
      error: "Enter a display name.",
    });
  });

  it("normalizes surrounding profile whitespace", () => {
    expect(validateProfileName("  Jamal Khan  ")).toEqual({
      ok: true,
      value: "Jamal Khan",
    });
  });

  it("rejects profile names over 80 characters", () => {
    expect(validateProfileName("a".repeat(81))).toEqual({
      ok: false,
      error: "Display name must be 80 characters or fewer.",
    });
  });

  it("rejects a missing verification code", () => {
    expect(
      validatePasswordChange({
        verificationCode: " ",
        newPassword: "password1",
        confirmPassword: "password1",
      }),
    ).toMatchObject({ ok: false, error: "Enter the verification code." });
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      validatePasswordChange({
        verificationCode: "123456",
        newPassword: "short",
        confirmPassword: "short",
      }),
    ).toMatchObject({
      ok: false,
      error: "New password must be at least 8 characters.",
    });
  });

  it("rejects a mismatched confirmation", () => {
    expect(
      validatePasswordChange({
        verificationCode: "123456",
        newPassword: "password1",
        confirmPassword: "password2",
      }),
    ).toMatchObject({ ok: false, error: "Passwords do not match." });
  });

  it("accepts a valid password change without altering the password", () => {
    expect(
      validatePasswordChange({
        verificationCode: " 123456 ",
        newPassword: " password1 ",
        confirmPassword: " password1 ",
      }),
    ).toEqual({
      ok: true,
      value: { verificationCode: "123456", newPassword: " password1 " },
    });
  });

  it("rejects an alphabetic verification code", () => {
    expect(
      validatePasswordChange({
        verificationCode: "abcdef",
        newPassword: "password1",
        confirmPassword: "password1",
      }),
    ).toEqual({
      ok: false,
      error: "Verification code must contain digits only.",
    });
  });

  it("rejects a mixed alphanumeric verification code", () => {
    expect(
      validatePasswordChange({
        verificationCode: "12ab34",
        newPassword: "password1",
        confirmPassword: "password1",
      }),
    ).toEqual({
      ok: false,
      error: "Verification code must contain digits only.",
    });
  });

  it("preserves a digits-only code with leading zeroes as a string", () => {
    expect(
      validatePasswordChange({
        verificationCode: "001234",
        newPassword: "password1",
        confirmPassword: "password1",
      }),
    ).toEqual({
      ok: true,
      value: { verificationCode: "001234", newPassword: "password1" },
    });
  });

  it("builds a settings snapshot with only intended top-level fields", () => {
    expect(Object.keys(buildSettingsSnapshot(baseSnapshot))).toEqual([
      "generatedAt",
      "profile",
      "displayPreferences",
      "categoryConfiguration",
      "accountStatistics",
    ]);
  });

  it("never includes userId", () => {
    const snapshot = buildSettingsSnapshot({
      ...baseSnapshot,
      userId: "should-not-export",
    } as typeof baseSnapshot & { userId: string });
    expect(JSON.stringify(snapshot)).not.toContain("userId");
    expect(JSON.stringify(snapshot)).not.toContain("should-not-export");
  });

  it("never includes sensitive or internal fields", () => {
    const snapshot = buildSettingsSnapshot({
      ...baseSnapshot,
      password: "password",
      nonce: "nonce",
      token: "token",
      session: "session",
      secret: "secret",
    } as unknown as typeof baseSnapshot);
    const serialized = JSON.stringify(snapshot).toLowerCase();
    for (const forbidden of ["password", "nonce", "token", "session", "secret"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("keeps failed statistics unavailable", () => {
    const snapshot = buildSettingsSnapshot({
      ...baseSnapshot,
      stats: { accounts: null, transactions: null, goals: null, investments: null },
    });
    expect(snapshot.accountStatistics).toEqual({
      accounts: null,
      transactions: null,
      goals: null,
      investments: null,
    });
  });

  it("keeps genuine zero statistics as zero", () => {
    const snapshot = buildSettingsSnapshot({
      ...baseSnapshot,
      stats: { accounts: 0, transactions: 0, goals: 0, investments: 0 },
    });
    expect(snapshot.accountStatistics).toEqual({
      accounts: 0,
      transactions: 0,
      goals: 0,
      investments: 0,
    });
  });

  it("maps network and rate-limit auth errors to safe messages", () => {
    expect(mapAuthError(new TypeError("Failed to fetch"))).toBe(
      "Check your connection and try again.",
    );
    expect(mapAuthError({ status: 429, message: "backend details" })).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
  });

  it("does not expose unknown backend error text", () => {
    expect(
      mapAuthError(
        { message: "sensitive backend internals" },
        "Could not update your profile. Please try again.",
      ),
    ).toBe("Could not update your profile. Please try again.");
  });

  it("allows category deletion with zero usage and zero children", () => {
    expect(
      validateCategoryDeleteReadiness({ usageCount: 0, childCount: 0 }),
    ).toEqual({ ok: true, value: { usageCount: 0, childCount: 0 } });
  });

  it("blocks category deletion when transactions use it", () => {
    expect(
      validateCategoryDeleteReadiness({ usageCount: 2, childCount: 0 }),
    ).toEqual({ ok: false, error: "Used by 2 transactions." });
  });

  it("blocks category deletion when it has children", () => {
    expect(
      validateCategoryDeleteReadiness({ usageCount: 0, childCount: 3 }),
    ).toEqual({
      ok: false,
      error: "Move 3 subcategories before deleting.",
    });
  });

  it("fails closed when category usage is unavailable", () => {
    expect(
      validateCategoryDeleteReadiness({ usageCount: null, childCount: 0 }),
    ).toEqual({
      ok: false,
      error: "Category references could not be verified. Please try again.",
    });
  });

  it("fails closed when child count is unavailable", () => {
    expect(
      validateCategoryDeleteReadiness({ usageCount: 0, childCount: null }),
    ).toEqual({
      ok: false,
      error: "Category references could not be verified. Please try again.",
    });
  });

  it("fails closed for negative category counts", () => {
    expect(
      validateCategoryDeleteReadiness({ usageCount: -1, childCount: 0 }),
    ).toMatchObject({ ok: false });
    expect(
      validateCategoryDeleteReadiness({ usageCount: 0, childCount: -1 }),
    ).toMatchObject({ ok: false });
  });

  it("fails closed for non-finite category counts", () => {
    for (const invalidCount of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        validateCategoryDeleteReadiness({
          usageCount: invalidCount,
          childCount: 0,
        }),
      ).toMatchObject({ ok: false });
    }
  });
});
