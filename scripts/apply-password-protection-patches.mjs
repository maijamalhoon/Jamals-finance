import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

function updateFile(path, transform) {
  const source = readFileSync(path, "utf8");
  const next = transform(source);
  if (next === source) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, next);
}

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first === -1) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(from, first + from.length) !== -1) {
    throw new Error(`Ambiguous patch target: ${label}`);
  }
  return source.slice(0, first) + to + source.slice(first + from.length);
}

updateFile("app/login/page.tsx", (source) => {
  let next = replaceOnce(
    source,
    `import { Button } from "@/components/ui/button";\nimport { createClient } from "@/lib/supabase/client";`,
    `import { Button } from "@/components/ui/button";\nimport { checkPasswordProtection } from "@/lib/auth/password-protection";\nimport {\n  PASSWORD_MIN_LENGTH,\n  validatePasswordPolicy,\n} from "@/lib/auth/password-policy";\nimport { createClient } from "@/lib/supabase/client";`,
    "login password protection imports",
  );

  next = replaceOnce(
    next,
    `    if (!password || password.length < 6) {\n      setFieldError("password", "Use at least 6 characters.");\n      return;\n    }\n\n    if (!ensureOnline() || !beginAction("creating")) return;\n\n    try {\n      const { data, error: signUpError } = await supabase.auth.signUp({`,
    `    const passwordPolicy = validatePasswordPolicy(password);\n    if (!passwordPolicy.ok) {\n      setFieldError("password", passwordPolicy.error);\n      return;\n    }\n\n    if (!ensureOnline() || !beginAction("creating")) return;\n\n    try {\n      const passwordProtection = await checkPasswordProtection(password);\n      if (!passwordProtection.ok) {\n        endAction();\n        setFieldError("password", passwordProtection.error);\n        return;\n      }\n\n      const { data, error: signUpError } = await supabase.auth.signUp({`,
    "signup password verification",
  );

  next = replaceOnce(
    next,
    `helper="Use at least 6 characters. Additional account policy is checked when you submit."`,
    `helper={\`Use at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number or symbol. Known breached passwords are rejected on submit.\`}`,
    "signup password helper",
  );

  next = replaceOnce(
    next,
    `<AuthPasswordRequirements password={password} minimumLength={6} />`,
    `<AuthPasswordRequirements\n              password={password}\n              minimumLength={PASSWORD_MIN_LENGTH}\n            />`,
    "signup password requirement length",
  );

  return next;
});

updateFile("app/reset-password/page.tsx", (source) => {
  let next = replaceOnce(
    source,
    `import { Button } from "@/components/ui/button";\nimport { createClient } from "@/lib/supabase/client";`,
    `import { Button } from "@/components/ui/button";\nimport { checkPasswordProtection } from "@/lib/auth/password-protection";\nimport {\n  PASSWORD_MIN_LENGTH,\n  validatePasswordPolicy,\n} from "@/lib/auth/password-policy";\nimport { createClient } from "@/lib/supabase/client";`,
    "reset password protection imports",
  );

  next = replaceOnce(
    next,
    `    if (password.length < 6) {\n      setFieldErrors({ password: "Use at least 6 characters." });\n      passwordInputRef.current?.focus();\n      return;\n    }`,
    `    const passwordPolicy = validatePasswordPolicy(password);\n    if (!passwordPolicy.ok) {\n      setFieldErrors({ password: passwordPolicy.error });\n      passwordInputRef.current?.focus();\n      return;\n    }`,
    "reset local password policy",
  );

  next = replaceOnce(
    next,
    `    setRecoveryState("updating");\n    setMessage("");\n\n    let updateOutcome: PasswordUpdateOutcome = "thrown_error";`,
    `    setRecoveryState("updating");\n    setMessage("");\n\n    const passwordProtection = await checkPasswordProtection(password);\n    if (!passwordProtection.ok) {\n      setRecoveryState("ready");\n      setFieldErrors({ password: passwordProtection.error });\n      passwordInputRef.current?.focus();\n      return;\n    }\n\n    let updateOutcome: PasswordUpdateOutcome = "thrown_error";`,
    "reset breached password verification",
  );

  next = replaceOnce(
    next,
    `description: "Use at least 6 characters and confirm the same password below.",`,
    `description: \`Use at least ${PASSWORD_MIN_LENGTH} characters. Known breached passwords are rejected before the update.\`,`,
    "reset password description",
  );

  next = replaceOnce(
    next,
    `placeholder="At least 6 characters"`,
    `placeholder={\`At least ${PASSWORD_MIN_LENGTH} characters\`}`,
    "reset password placeholder",
  );

  next = replaceOnce(
    next,
    `helper="Use at least 6 characters. Password managers can save it after the update."`,
    `helper={\`Use at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number or symbol.\`}`,
    "reset password helper",
  );

  return next;
});

updateFile("components/settings/SettingsReferenceSections.tsx", (source) => {
  let next = replaceOnce(
    source,
    `import { Button } from "@/components/ui/button";`,
    `import { Button } from "@/components/ui/button";\nimport { checkPasswordProtection } from "@/lib/auth/password-protection";`,
    "settings password protection import",
  );

  next = replaceOnce(
    next,
    `    setIsUpdatingPassword(true);\n    setPasswordFeedback(null);\n    const { error } = await supabase.auth.updateUser({`,
    `    setIsUpdatingPassword(true);\n    setPasswordFeedback(null);\n\n    const passwordProtection = await checkPasswordProtection(\n      validation.value.newPassword,\n    );\n    if (!passwordProtection.ok) {\n      setIsUpdatingPassword(false);\n      setPasswordFeedback({\n        tone: "error",\n        message: passwordProtection.error,\n      });\n      return;\n    }\n\n    const { error } = await supabase.auth.updateUser({`,
    "settings breached password verification",
  );

  next = replaceOnce(
    next,
    `placeholder="Minimum 8 characters"`,
    `placeholder="Minimum 12 characters"`,
    "settings password placeholder",
  );

  return next;
});

updateFile("lib/settings/security.ts", (source) => {
  let next = `import { validatePasswordPolicy } from "@/lib/auth/password-policy";\n\n${source}`;
  next = replaceOnce(
    next,
    `  if (input.newPassword.length < 8) {\n    return {\n      ok: false,\n      error: "New password must be at least 8 characters.",\n    };\n  }`,
    `  const passwordPolicy = validatePasswordPolicy(input.newPassword);\n  if (!passwordPolicy.ok) {\n    return { ok: false, error: passwordPolicy.error };\n  }`,
    "settings strong password policy",
  );
  return next;
});

updateFile("lib/settings/security.test.ts", (source) => {
  let next = replaceOnce(
    source,
    `import { describe, expect, it } from "vitest";`,
    `import { describe, expect, it } from "vitest";\nimport { PASSWORD_POLICY_MESSAGE } from "../auth/password-policy";`,
    "settings password policy test import",
  );

  next = next.replaceAll('newPassword: "password1"', 'newPassword: "Unique finance 2026!"');
  next = next.replaceAll('confirmPassword: "password1"', 'confirmPassword: "Unique finance 2026!"');
  next = next.replaceAll('confirmPassword: "password2"', 'confirmPassword: "Different finance 2026!"');
  next = next.replaceAll('newPassword: " password1 "', 'newPassword: " Unique finance 2026! "');
  next = next.replaceAll('confirmPassword: " password1 "', 'confirmPassword: " Unique finance 2026! "');
  next = next.replaceAll('newPassword: "password1"', 'newPassword: "Unique finance 2026!"');
  next = next.replaceAll('confirmPassword: "password1"', 'confirmPassword: "Unique finance 2026!"');
  next = next.replaceAll('newPassword: "password1"', 'newPassword: "Unique finance 2026!"');

  next = replaceOnce(
    next,
    `  it("rejects a password shorter than 8 characters", () => {`,
    `  it("rejects a password that fails the strong password policy", () => {`,
    "settings password policy test title",
  );

  next = replaceOnce(
    next,
    `      error: "New password must be at least 8 characters.",`,
    `      error: PASSWORD_POLICY_MESSAGE,`,
    "settings password policy expectation",
  );

  next = next.replaceAll(
    `value: { verificationCode: "123456", newPassword: " password1 " },`,
    `value: { verificationCode: "123456", newPassword: " Unique finance 2026! " },`,
  );
  next = next.replaceAll(
    `value: { verificationCode: "001234", newPassword: "password1" },`,
    `value: { verificationCode: "001234", newPassword: "Unique finance 2026!" },`,
  );

  return next;
});

updateFile("lib/auth-experience.test.ts", (source) => {
  let next = replaceOnce(
    source,
    `    expect(resetPasswordSource).toContain('setFieldErrors({ password: "Use at least 6 characters." })');`,
    `    expect(resetPasswordSource).toContain("validatePasswordPolicy(password)");\n    expect(resetPasswordSource).toContain("passwordPolicy.error");`,
    "auth experience password policy contract",
  );

  next = replaceOnce(
    next,
    `    expect(loginSource).toContain("router.replace(onboardingDestination(safeNext))");`,
    `    expect(loginSource).toContain("router.replace(onboardingDestination(safeNext))");\n    expect(loginSource).toContain("checkPasswordProtection(password)");\n    expect(resetPasswordSource).toContain("checkPasswordProtection(password)");`,
    "auth experience breached password contract",
  );

  return next;
});

unlinkSync("scripts/apply-password-protection-patches.mjs");
unlinkSync(".github/workflows/apply-password-protection-patches.yml");
