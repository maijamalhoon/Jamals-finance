import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatAdminCount,
  parseAdminControlCenterSnapshot,
} from "./control-center";

const validSnapshot = {
  generatedAt: "2026-07-23T20:00:00.000Z",
  adminRole: "owner",
  featurePolicy: "unlimited",
  users: {
    total: 1200,
    new7d: 80,
    new30d: 270,
    signedIn24h: 420,
    signedIn30d: 980,
  },
  billing: {
    freeUsers: 910,
    trialUsers: 90,
    paidUsers: 180,
    pastDueUsers: 8,
    cancelledUsers: 12,
    providerConnected: false,
    plans: [
      {
        code: "free",
        name: "Free",
        kind: "free",
        status: "free",
        users: 910,
      },
    ],
  },
  telemetry: {
    activeUsers24h: 360,
    activeUsers30d: 870,
    events24h: 6200,
    failedOperations7d: 9,
    poorPerformanceSignals7d: 3,
    devices: [{ device: "mobile", users: 510 }],
    countries: [{ country: "PK", users: 300 }],
    topRoutes: [{ route: "/dashboard", events: 1500 }],
    slowRoutes: [{ route: "/dashboard/reports", signals: 3 }],
  },
};

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("admin control center contracts", () => {
  it("accepts the aggregate-only snapshot contract", () => {
    expect(parseAdminControlCenterSnapshot(validSnapshot)).toMatchObject({
      adminRole: "owner",
      featurePolicy: "unlimited",
      users: { total: 1200 },
      billing: { freeUsers: 910, paidUsers: 180 },
      telemetry: { activeUsers24h: 360, events24h: 6200 },
    });
  });

  it("rejects malformed counts, routes, roles and feature policies", () => {
    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        adminRole: "superuser",
      }),
    ).toBeNull();

    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        featurePolicy: "limited",
      }),
    ).toBeNull();

    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        users: { ...validSnapshot.users, total: -1 },
      }),
    ).toBeNull();

    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        telemetry: {
          ...validSnapshot.telemetry,
          topRoutes: [{ route: "https://example.com/private", events: 1 }],
        },
      }),
    ).toBeNull();
  });

  it("formats large counts without changing their meaning", () => {
    expect(formatAdminCount(9999)).toBe("9,999");
    expect(formatAdminCount(12500)).toMatch(/12\.5K/i);
  });

  it("keeps the admin page server-rendered and single-RPC", () => {
    const page = read("app/admin/page.tsx");
    const component = read("components/admin/AdminControlCenter.tsx");

    expect(page).not.toContain('"use client"');
    expect(component).not.toContain('"use client"');
    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain('"get_platform_admin_snapshot"');
    expect(page).toContain('error?.code === "42501"');
    expect(component).not.toContain("recharts");
  });

  it("keeps billing private, provider-neutral and free of raw payload storage", () => {
    const foundation = read(
      "supabase/migrations/20260723200004_platform_admin_billing_foundation.sql",
    );
    const indexes = read(
      "supabase/migrations/20260723200143_index_admin_billing_foreign_keys.sql",
    );

    expect(foundation).toContain("create schema if not exists billing");
    expect(foundation).toContain("private.platform_admins");
    expect(foundation).toContain("public.get_platform_admin_snapshot");
    expect(foundation).toContain("security invoker");
    expect(foundation).toContain("featurePolicy', 'unlimited'");
    expect(foundation).toContain("payload_sha256");
    expect(foundation).not.toMatch(/payload\s+jsonb/i);
    expect(foundation).not.toContain("card_number");
    expect(foundation).not.toContain("cvv");
    expect(foundation).not.toContain("feature_limit");
    expect(indexes).toContain("billing_subscriptions_plan_code_idx");
    expect(indexes).toContain("admin_access_log_admin_user_idx");
  });
});
