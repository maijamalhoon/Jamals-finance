import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("privacy telemetry database boundary", () => {
  it("keeps telemetry tables private with short-lived detailed events", () => {
    const migration = read(
      "supabase/migrations/20260723213000_privacy_telemetry_foundation.sql",
    );

    expect(migration).toContain("create schema if not exists telemetry");
    expect(migration).toContain("revoke all on schema telemetry from public, anon, authenticated");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("alter table telemetry.subjects enable row level security");
    expect(migration).toContain("alter table telemetry.events enable row level security");
    expect(migration).not.toMatch(/raw_ip|ip_address|latitude|longitude|email_address/i);
  });

  it("exposes only a security-invoker wrapper from the public API schema", () => {
    const migration = read(
      "supabase/migrations/20260724001500_harden_privacy_telemetry_rpc_boundary.sql",
    );

    expect(migration).toContain("telemetry.record_privacy_telemetry_event_impl");
    expect(migration).toContain("language sql");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = pg_catalog, telemetry");
    expect(migration).toContain("telemetry_subjects_deny_direct_access");
    expect(migration).toContain("telemetry_events_deny_direct_access");
    expect(migration).toContain("using (false)");
    expect(migration).toContain("with check (false)");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });
});
