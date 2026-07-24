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
  privacy: {
    openRequests: 4,
    overdueRequests: 1,
    completedRequests30d: 8,
    requestAuditEvents30d: 6,
    requestOperationsAllowed: true,
    requestQueue: [
      {
        requestCode: "PRV-A1B2C3D4E5F6",
        requestType: "access",
        status: "identity_verification",
        verificationStatus: "pending",
        source: "support",
        createdAt: "2026-07-22T10:00:00.000Z",
        dueAt: "2026-07-29T23:59:59.000Z",
        assigned: true,
        assignedToMe: true,
        overdue: false,
        manageable: true,
      },
    ],
    adminViews30d: 32,
    telemetryEventsStored: 6200,
    telemetrySubjectsStored: 870,
    expiredTelemetryPending: 0,
    expiredAdminAuditPending: 0,
    expiredRequestAuditPending: 0,
    lastRetentionRunAt: "2026-07-23T19:00:00.000Z",
    lastRetentionRowsDeleted: 120,
    telemetryRetentionDays: 30,
    adminAuditRetentionMonths: 12,
    requestAuditRetentionMonths: 12,
    rawIpStored: false,
    sessionReplayEnabled: false,
    financeContentInTelemetry: false,
  },
};

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("admin control center contracts", () => {
  it("accepts the aggregate and opaque-ticket snapshot contract", () => {
    expect(parseAdminControlCenterSnapshot(validSnapshot)).toMatchObject({
      adminRole: "owner",
      featurePolicy: "unlimited",
      users: { total: 1200 },
      billing: { freeUsers: 910, paidUsers: 180 },
      telemetry: { activeUsers24h: 360, events24h: 6200 },
      privacy: {
        openRequests: 4,
        overdueRequests: 1,
        requestAuditEvents30d: 6,
        requestOperationsAllowed: true,
        requestQueue: [
          {
            requestCode: "PRV-A1B2C3D4E5F6",
            requestType: "access",
            assignedToMe: true,
          },
        ],
        rawIpStored: false,
        sessionReplayEnabled: false,
        financeContentInTelemetry: false,
      },
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

  it("rejects unsafe or identity-bearing privacy queue shapes", () => {
    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        privacy: {
          ...validSnapshot.privacy,
          requestQueue: [
            {
              ...validSnapshot.privacy.requestQueue[0],
              requestCode: "not-a-ticket",
            },
          ],
        },
      }),
    ).toBeNull();

    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        privacy: {
          ...validSnapshot.privacy,
          requestQueue: [
            {
              ...validSnapshot.privacy.requestQueue[0],
              status: "completed",
            },
          ],
        },
      }),
    ).toBeNull();

    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        privacy: {
          ...validSnapshot.privacy,
          requestQueue: [
            {
              ...validSnapshot.privacy.requestQueue[0],
              assigned: false,
              assignedToMe: true,
            },
          ],
        },
      }),
    ).toBeNull();
  });

  it("fails closed when a protected telemetry boundary is reported enabled", () => {
    for (const unsafeBoundary of [
      "rawIpStored",
      "sessionReplayEnabled",
      "financeContentInTelemetry",
    ] as const) {
      expect(
        parseAdminControlCenterSnapshot({
          ...validSnapshot,
          privacy: {
            ...validSnapshot.privacy,
            [unsafeBoundary]: true,
          },
        }),
      ).toBeNull();
    }
  });

  it("accepts no previous retention run but rejects invalid dates", () => {
    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        privacy: { ...validSnapshot.privacy, lastRetentionRunAt: null },
      }),
    ).not.toBeNull();

    expect(
      parseAdminControlCenterSnapshot({
        ...validSnapshot,
        privacy: { ...validSnapshot.privacy, lastRetentionRunAt: "not-a-date" },
      }),
    ).toBeNull();
  });

  it("formats large counts without changing their meaning", () => {
    expect(formatAdminCount(9999)).toBe("9,999");
    expect(formatAdminCount(12500)).toMatch(/12\.5K/i);
  });

  it("keeps the admin page server-rendered and snapshot loading single-RPC", () => {
    const page = read("app/admin/page.tsx");
    const component = read("components/admin/AdminControlCenter.tsx");
    const privacyPanel = read("components/admin/PrivacyGovernancePanel.tsx");
    const operations = read("components/admin/PrivacyRequestOperations.tsx");
    const action = read("app/admin/privacy-actions.ts");

    expect(page).not.toContain('"use client"');
    expect(component).not.toContain('"use client"');
    expect(privacyPanel).not.toContain('"use client"');
    expect(operations).not.toContain('"use client"');
    expect(action).toContain('"use server"');
    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain('"get_platform_admin_snapshot"');
    expect(page).toContain('error?.code === "42501"');
    expect(page).toContain("PrivacyRequestOperations");
    expect(action).toContain('"apply_privacy_request_workflow"');
    expect(component).not.toContain("recharts");
    expect(privacyPanel).not.toContain("recharts");
    expect(operations).not.toContain("recharts");
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

  it("keeps privacy requests structured, private and content-free", () => {
    const foundation = read(
      "supabase/migrations/20260724023000_privacy_governance_control_center.sql",
    );
    const operations = read(
      "supabase/migrations/20260724024500_privacy_request_operations.sql",
    );

    expect(foundation).toContain("private.privacy_requests");
    expect(foundation).toContain("privacy_requests_deny_direct");
    expect(foundation).toContain("private.privacy_retention_runs");
    expect(operations).toContain("private.privacy_request_audit");
    expect(operations).toContain("privacy_request_audit_deny_direct");
    expect(operations).toContain("apply_privacy_request_workflow");
    expect(operations).toContain("security invoker");
    expect(operations).toContain("requestOperationsAllowed");
    expect(operations).toContain("limit 30");
    expect(operations).toContain("privacy_request_verification_required");
    expect(operations).not.toMatch(/request_(body|message|text)\s+(text|jsonb)/i);
    expect(operations).not.toMatch(/finance_(value|content|record)\s+(text|jsonb|numeric)/i);
    expect(operations).not.toMatch(/raw_ip\s+(text|inet)/i);
    expect(operations).not.toMatch(/card_number\s+text/i);
    expect(operations).not.toMatch(/password\s+text/i);
  });
});
