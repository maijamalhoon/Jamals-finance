import { validatePasswordPolicy } from "@/lib/auth/password-policy";

const REQUEST_TIMEOUT_MS = 8_000;

export type PasswordProtectionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function checkPasswordProtection(
  password: string,
): Promise<PasswordProtectionResult> {
  const localPolicy = validatePasswordPolicy(password);
  if (!localPolicy.ok) return localPolicy;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/security/password-check", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | { safe?: boolean; code?: string; message?: string }
      | null;

    if (response.ok && payload?.safe === true) {
      return { ok: true };
    }

    if (response.status === 409 || payload?.code === "password_compromised") {
      return {
        ok: false,
        error:
          "This password has appeared in known data breaches. Choose a unique password that you do not use anywhere else.",
      };
    }

    if (response.status === 422 && payload?.message) {
      return { ok: false, error: payload.message };
    }

    if (response.status === 429) {
      return {
        ok: false,
        error: "Too many password security checks. Wait a moment and try again.",
      };
    }

    return {
      ok: false,
      error:
        "Password security could not be verified right now. Please try again so your account is not created with an unchecked password.",
    };
  } catch {
    return {
      ok: false,
      error:
        "Password security could not be verified right now. Check your connection and try again.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
