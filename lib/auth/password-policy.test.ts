import { describe, expect, it } from "vitest";

import {
  PASSWORD_POLICY_MESSAGE,
  validatePasswordPolicy,
} from "./password-policy";

describe("password policy", () => {
  it("rejects passwords shorter than twelve characters", () => {
    expect(validatePasswordPolicy("Strong1!abc")).toEqual({
      ok: false,
      error: PASSWORD_POLICY_MESSAGE,
    });
  });

  it("rejects passwords longer than the supported maximum", () => {
    expect(validatePasswordPolicy(`A1!${"x".repeat(126)}`)).toEqual({
      ok: false,
      error: PASSWORD_POLICY_MESSAGE,
    });
  });

  it("requires a letter", () => {
    expect(validatePasswordPolicy("123456789012!")).toEqual({
      ok: false,
      error: PASSWORD_POLICY_MESSAGE,
    });
  });

  it("requires a number or symbol", () => {
    expect(validatePasswordPolicy("correct horse battery staple")).toEqual({
      ok: false,
      error: PASSWORD_POLICY_MESSAGE,
    });
  });

  it("accepts a strong Latin password", () => {
    expect(validatePasswordPolicy("Unique finance 2026!")).toEqual({ ok: true });
  });

  it("accepts strong non-Latin passwords without requiring Latin casing", () => {
    expect(validatePasswordPolicy("محفوظپاسورڈ2026!")).toEqual({ ok: true });
  });
});
