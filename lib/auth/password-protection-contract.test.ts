import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  new URL("../../app/api/security/password-check/route.ts", import.meta.url),
  "utf8",
);
const serverSource = readFileSync(
  new URL("./pwned-passwords.server.ts", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("./password-protection.ts", import.meta.url),
  "utf8",
);
const loginSource = readFileSync(
  new URL("../../app/login/page.tsx", import.meta.url),
  "utf8",
);
const resetSource = readFileSync(
  new URL("../../app/reset-password/page.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../../components/settings/SettingsReferenceSections.tsx", import.meta.url),
  "utf8",
);

describe("leaked password protection contracts", () => {
  it("uses k-anonymity with response padding and a bounded upstream request", () => {
    expect(serverSource).toContain('hash.slice(0, 5)');
    expect(serverSource).toContain('hash.slice(5)');
    expect(serverSource).toContain('"Add-Padding": "true"');
    expect(serverSource).toContain("RANGE_TIMEOUT_MS");
    expect(serverSource).toContain("next: { revalidate: RANGE_CACHE_SECONDS }");
  });

  it("never sends the full password or complete hash to the breach service", () => {
    expect(serverSource).toContain("${PWNED_PASSWORDS_RANGE_URL}/${prefix}");
    expect(serverSource).not.toContain("/${hash}");
    expect(serverSource).not.toMatch(/body\s*:\s*password/);
    expect(serverSource).not.toMatch(/console\.(log|info|debug|warn|error)/);
  });

  it("fails closed and applies origin, size, rate, and memory controls", () => {
    expect(routeSource).toContain("isSameOriginRequest(request)");
    expect(routeSource).toContain("MAX_REQUEST_BYTES");
    expect(routeSource).toContain("MAX_CHECKS_PER_WINDOW");
    expect(routeSource).toContain("MAX_RATE_BUCKETS");
    expect(routeSource).toContain('password_check_unavailable');
    expect(clientSource).toContain("Password security could not be verified right now");
    expect(clientSource).not.toMatch(/console\.(log|info|debug|warn|error)/);
  });

  it("protects every password creation and update flow", () => {
    expect(loginSource).toContain("checkPasswordProtection(password)");
    expect(resetSource).toContain("checkPasswordProtection(password)");
    expect(settingsSource).toContain("checkPasswordProtection(");
    expect(loginSource.indexOf("checkPasswordProtection(password)")).toBeLessThan(
      loginSource.indexOf("supabase.auth.signUp({"),
    );
    expect(resetSource.indexOf("checkPasswordProtection(password)")).toBeLessThan(
      resetSource.indexOf("supabase.auth.updateUser({ password })"),
    );
  });
});
