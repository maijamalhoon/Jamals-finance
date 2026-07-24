export type PlatformAdminRole = "owner" | "admin" | "analyst" | "support";

export type AdminAccessMember = {
  adminReference: string;
  maskedEmail: string;
  role: PlatformAdminRole;
  status: "active" | "disabled";
  createdAt: string;
  lastAccessAt: string | null;
  isSelf: boolean;
  manageable: boolean;
};

export type AdminAccessInvitation = {
  invitationCode: string;
  maskedEmail: string;
  role: Exclude<PlatformAdminRole, "owner">;
  status: "pending" | "expired";
  createdAt: string;
  expiresAt: string;
  manageable: boolean;
};

export type AdminAccessEvent = {
  eventReference: string;
  action:
    | "invitation_created"
    | "invitation_revoked"
    | "invitation_accepted"
    | "role_changed"
    | "access_disabled"
    | "access_restored";
  actorReference: string;
  subjectReference: string | null;
  invitationCode: string | null;
  previousRole: PlatformAdminRole | null;
  nextRole: PlatformAdminRole | null;
  createdAt: string;
};

export type AdminAccessSnapshot = {
  operationsAllowed: boolean;
  inviteDelivery: "manual_code";
  rawInviteTokenStored: false;
  userMetadataAuthorization: false;
  serviceRoleExposedToBrowser: false;
  counts: {
    activeOwners: number;
    activeAdmins: number;
    activeAnalysts: number;
    activeSupport: number;
    disabledMembers: number;
    pendingInvitations: number;
  };
  members: AdminAccessMember[];
  invitations: AdminAccessInvitation[];
  recentEvents: AdminAccessEvent[];
};

const ROLES = new Set<PlatformAdminRole>([
  "owner",
  "admin",
  "analyst",
  "support",
]);
const INVITE_ROLES = new Set<AdminAccessInvitation["role"]>([
  "admin",
  "analyst",
  "support",
]);
const EVENT_ACTIONS = new Set<AdminAccessEvent["action"]>([
  "invitation_created",
  "invitation_revoked",
  "invitation_accepted",
  "role_changed",
  "access_disabled",
  "access_restored",
]);
const FORBIDDEN_KEYS = new Set([
  "email",
  "userId",
  "token",
  "tokenSha256",
  "serviceRoleKey",
  "rawIp",
  "financeData",
  "password",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_KEYS.has(key) || hasForbiddenKey(nested),
  );
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

function readString(value: unknown, max = 160) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= max ? result : null;
}

function readDate(value: unknown, nullable = false) {
  if (nullable && value === null) return null;
  const text = readString(value, 64);
  return text && !Number.isNaN(Date.parse(text)) ? text : undefined;
}

function readRole(value: unknown) {
  return typeof value === "string" && ROLES.has(value as PlatformAdminRole)
    ? (value as PlatformAdminRole)
    : null;
}

function readMembers(value: unknown): AdminAccessMember[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const parsed: AdminAccessMember[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const adminReference = readString(item.adminReference, 16);
    const maskedEmail = readString(item.maskedEmail, 160);
    const role = readRole(item.role);
    const createdAt = readDate(item.createdAt);
    const lastAccessAt = readDate(item.lastAccessAt, true);
    if (
      !adminReference?.match(/^ADM-[A-F0-9]{12}$/) ||
      !maskedEmail?.includes("@") ||
      !maskedEmail.includes("*") ||
      !role ||
      (item.status !== "active" && item.status !== "disabled") ||
      !createdAt ||
      lastAccessAt === undefined ||
      typeof item.isSelf !== "boolean" ||
      typeof item.manageable !== "boolean" ||
      (item.isSelf && item.manageable)
    ) {
      return null;
    }
    parsed.push({
      adminReference,
      maskedEmail,
      role,
      status: item.status,
      createdAt,
      lastAccessAt,
      isSelf: item.isSelf,
      manageable: item.manageable,
    });
  }
  return parsed;
}

function readInvitations(value: unknown): AdminAccessInvitation[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  const parsed: AdminAccessInvitation[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const invitationCode = readString(item.invitationCode, 16);
    const maskedEmail = readString(item.maskedEmail, 160);
    const createdAt = readDate(item.createdAt);
    const expiresAt = readDate(item.expiresAt);
    if (
      !invitationCode?.match(/^AIN-[A-F0-9]{12}$/) ||
      !maskedEmail?.includes("@") ||
      !maskedEmail.includes("*") ||
      typeof item.role !== "string" ||
      !INVITE_ROLES.has(item.role as AdminAccessInvitation["role"]) ||
      (item.status !== "pending" && item.status !== "expired") ||
      !createdAt ||
      !expiresAt ||
      typeof item.manageable !== "boolean" ||
      (item.status === "expired" && item.manageable)
    ) {
      return null;
    }
    parsed.push({
      invitationCode,
      maskedEmail,
      role: item.role as AdminAccessInvitation["role"],
      status: item.status,
      createdAt,
      expiresAt,
      manageable: item.manageable,
    });
  }
  return parsed;
}

function readEvents(value: unknown): AdminAccessEvent[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  const parsed: AdminAccessEvent[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const eventReference = readString(item.eventReference, 14);
    const actorReference = readString(item.actorReference, 16);
    const subjectReference =
      item.subjectReference === null
        ? null
        : readString(item.subjectReference, 16);
    const invitationCode =
      item.invitationCode === null
        ? null
        : readString(item.invitationCode, 16);
    const previousRole = item.previousRole === null ? null : readRole(item.previousRole);
    const nextRole = item.nextRole === null ? null : readRole(item.nextRole);
    const createdAt = readDate(item.createdAt);
    if (
      !eventReference?.match(/^AAE-[0-9]{10}$/) ||
      typeof item.action !== "string" ||
      !EVENT_ACTIONS.has(item.action as AdminAccessEvent["action"]) ||
      !actorReference?.match(/^ADM-[A-F0-9]{12}$/) ||
      (subjectReference !== null &&
        !subjectReference?.match(/^ADM-[A-F0-9]{12}$/)) ||
      (invitationCode !== null &&
        !invitationCode?.match(/^AIN-[A-F0-9]{12}$/)) ||
      (item.previousRole !== null && !previousRole) ||
      (item.nextRole !== null && !nextRole) ||
      !createdAt
    ) {
      return null;
    }
    parsed.push({
      eventReference,
      action: item.action as AdminAccessEvent["action"],
      actorReference,
      subjectReference,
      invitationCode,
      previousRole,
      nextRole,
      createdAt,
    });
  }
  return parsed;
}

export function parseAdminAccessSnapshot(value: unknown): AdminAccessSnapshot | null {
  if (!isRecord(value) || hasForbiddenKey(value)) return null;
  const access = value.access;
  if (!isRecord(access) || !isRecord(access.counts)) return null;
  const counts = {
    activeOwners: readCount(access.counts.activeOwners),
    activeAdmins: readCount(access.counts.activeAdmins),
    activeAnalysts: readCount(access.counts.activeAnalysts),
    activeSupport: readCount(access.counts.activeSupport),
    disabledMembers: readCount(access.counts.disabledMembers),
    pendingInvitations: readCount(access.counts.pendingInvitations),
  };
  const members = readMembers(access.members);
  const invitations = readInvitations(access.invitations);
  const recentEvents = readEvents(access.recentEvents);
  if (
    Object.values(counts).some((count) => count === null) ||
    typeof access.operationsAllowed !== "boolean" ||
    access.inviteDelivery !== "manual_code" ||
    access.rawInviteTokenStored !== false ||
    access.userMetadataAuthorization !== false ||
    access.serviceRoleExposedToBrowser !== false ||
    !members ||
    !invitations ||
    !recentEvents
  ) {
    return null;
  }
  return {
    operationsAllowed: access.operationsAllowed,
    inviteDelivery: "manual_code",
    rawInviteTokenStored: false,
    userMetadataAuthorization: false,
    serviceRoleExposedToBrowser: false,
    counts: {
      activeOwners: counts.activeOwners!,
      activeAdmins: counts.activeAdmins!,
      activeAnalysts: counts.activeAnalysts!,
      activeSupport: counts.activeSupport!,
      disabledMembers: counts.disabledMembers!,
      pendingInvitations: counts.pendingInvitations!,
    },
    members,
    invitations,
    recentEvents,
  };
}
