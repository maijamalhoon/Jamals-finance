import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminAccessSnapshot } from "./access-operations";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const validSnapshot = {
  access: {
    operationsAllowed: true,
    inviteDelivery: "manual_code",
    rawInviteTokenStored: false,
    userMetadataAuthorization: false,
    serviceRoleExposedToBrowser: false,
    counts: {
      activeOwners: 1,
      activeAdmins: 2,
      activeAnalysts: 1,
      activeSupport: 1,
      disabledMembers: 1,
      pendingInvitations: 1,
    },
    members: [
      {
        adminReference: "ADM-A1B2C3D4E5F6",
        maskedEmail: "j******@example.com",
        role: "owner",
        status: "active",
        createdAt: "2026-07-24T04:00:00.000Z",
        lastAccessAt: "2026-07-24T05:00:00.000Z",
        isSelf: true,
        manageable: false,
      },
    ],
    invitations: [
      {
        invitationCode: "AIN-A1B2C3D4E5F6",
        maskedEmail: "a****@example.com",
        role: "admin",
        status: "pending",
        createdAt: "2026-07-24T04:00:00.000Z",
        expiresAt: "2026-07-27T04:00:00.000Z",
        manageable: true,
      },
    ],
    recentEvents: [
      {
        eventReference: "AAE-0000000001",
        action: "invitation_created",
        actorReference: "ADM-A1B2C3D4E5F6",
        subjectReference: null,
        invitationCode: "AIN-A1B2C3D4E5F6",
        previousRole: null,
        nextRole: "admin",
        createdAt: "2026-07-24T04:00:00.000Z",
      },
    ],
  },
};

describe("admin team access contracts", () => {
  it("accepts masked, opaque and structured access data", () => {
    expect(parseAdminAccessSnapshot(validSnapshot)).toMatchObject({
      operationsAllowed: true,
      counts: { activeOwners: 1, pendingInvitations: 1 },
      members: [{ adminReference: "ADM-A1B2C3D4E5F6", isSelf: true }],
      invitations: [{ invitationCode: "AIN-A1B2C3D4E5F6", role: "admin" }],
      recentEvents: [{ action: "invitation_created" }],
    });
  });

  it("rejects raw identity, token and service-role fields", () => {
    for (const unsafe of [
      { email: "owner@example.com" },
      { userId: "00000000-0000-0000-0000-000000000000" },
      { token: "raw-secret" },
      { tokenSha256: "hash" },
      { serviceRoleKey: "secret" },
      { rawIp: "127.0.0.1" },
      { financeData: { balance: 1 } },
      { password: "secret" },
    ]) {
      expect(
        parseAdminAccessSnapshot({
          ...validSnapshot,
          access: { ...validSnapshot.access, ...unsafe },
        }),
      ).toBeNull();
    }
  });

  it("rejects unsafe references and self-manageable accounts", () => {
    expect(
      parseAdminAccessSnapshot({
        access: {
          ...validSnapshot.access,
          members: [
            {
              ...validSnapshot.access.members[0],
              adminReference: "user-uuid",
            },
          ],
        },
      }),
    ).toBeNull();

    expect(
      parseAdminAccessSnapshot({
        access: {
          ...validSnapshot.access,
          members: [
            { ...validSnapshot.access.members[0], manageable: true },
          ],
        },
      }),
    ).toBeNull();
  });

  it("keeps invitations hashed, email-bound and owner-controlled", () => {
    const migration = read(
      "supabase/migrations/20260724050000_admin_team_access_security.sql",
    );
    expect(migration).toContain("token_sha256 bytea not null unique");
    expect(migration).toContain("intended_email_sha256 bytea not null");
    expect(migration).toContain("owner_access_required");
    expect(migration).toContain("admin_self_change_blocked");
    expect(migration).toContain("last_owner_protected");
    expect(migration).toContain("platform_admin_invitations_deny_direct");
    expect(migration).toContain("platform_admin_access_audit_deny_direct");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("rawInviteTokenStored', false");
    expect(migration).toContain("userMetadataAuthorization', false");
    expect(migration).toContain("serviceRoleExposedToBrowser', false");
    expect(migration).not.toMatch(/raw_token\s+(text|bytea)/i);
    expect(migration).not.toMatch(/password\s+(text|bytea)/i);
    expect(migration).not.toMatch(/finance_(data|content|record)\s+(jsonb|text)/i);
  });

  it("uses server actions without an administrative key in application code", () => {
    const actions = read("app/admin/access-actions.ts");
    const claim = read("app/admin/claim/page.tsx");
    expect(actions).toContain('"use server"');
    expect(actions).toContain("randomBytes(20)");
    expect(actions).toContain('createHash("sha256")');
    expect(actions).toContain('"create_platform_admin_invitation"');
    expect(actions).toContain('"accept_platform_admin_invitation"');
    expect(actions).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(actions).not.toContain("auth.admin");
    expect(claim).toContain("acceptAdminInvitationAction");
    expect(claim).toContain("Your signed-in email must match");
  });

  it("preserves the single aggregate admin RPC", () => {
    const page = read("app/admin/page.tsx");
    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain('"get_platform_admin_snapshot"');
    expect(page).toContain("parseAdminAccessSnapshot");
    expect(page).toContain("AdminTeamAccessPanel");
  });
});
