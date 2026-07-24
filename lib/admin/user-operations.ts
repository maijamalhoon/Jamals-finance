export type UserActivityState =
  | "active_30d"
  | "quiet_90d"
  | "inactive_90d"
  | "never_signed_in";

export type UserSubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired"
  | "incomplete";

export type AdminUserDirectoryItem = {
  userReference: string;
  maskedEmail: string;
  onboardingStatus: "complete" | "pending";
  activityState: UserActivityState;
  joinedAt: string;
  lastSignInAt: string | null;
  planCode: string;
  planName: string;
  planKind: "free" | "paid";
  subscriptionStatus: UserSubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type AdminUserOperationsSnapshot = {
  operationsMode: "read_only";
  lookupKey: "opaque_reference";
  rawEmailReturned: false;
  userIdReturned: false;
  financeDataReturned: false;
  providerIdentifiersReturned: false;
  counts: {
    totalUsers: number;
    onboardingComplete: number;
    onboardingPending: number;
    signedIn30d: number;
    inactive90d: number;
    neverSignedIn: number;
    freeUsers: number;
    trialingUsers: number;
    activePaidUsers: number;
    pastDueUsers: number;
  };
  users: AdminUserDirectoryItem[];
};

const ACTIVITY_STATES = new Set<UserActivityState>([
  "active_30d",
  "quiet_90d",
  "inactive_90d",
  "never_signed_in",
]);

const SUBSCRIPTION_STATUSES = new Set<UserSubscriptionStatus>([
  "free",
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
  "incomplete",
]);

const FORBIDDEN_KEYS = new Set([
  "email",
  "userId",
  "id",
  "provider",
  "providerCustomerId",
  "providerSubscriptionId",
  "rawIp",
  "financeData",
  "balance",
  "transaction",
  "amount",
  "card",
  "bank",
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
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function readString(value: unknown, max = 160) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= max ? normalized : null;
}

function readDate(value: unknown, nullable = false) {
  if (nullable && value === null) return null;
  const text = readString(value, 64);
  return text && !Number.isNaN(Date.parse(text)) ? text : undefined;
}

function readUsers(value: unknown): AdminUserDirectoryItem[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;

  const users: AdminUserDirectoryItem[] = [];
  const references = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) return null;

    const userReference = readString(item.userReference, 16);
    const maskedEmail = readString(item.maskedEmail, 160);
    const joinedAt = readDate(item.joinedAt);
    const lastSignInAt = readDate(item.lastSignInAt, true);
    const planCode = readString(item.planCode, 40);
    const planName = readString(item.planName, 80);
    const trialEndsAt = readDate(item.trialEndsAt, true);
    const currentPeriodEnd = readDate(item.currentPeriodEnd, true);

    if (
      !userReference?.match(/^USR-[A-F0-9]{12}$/) ||
      references.has(userReference) ||
      !maskedEmail?.includes("@") ||
      !maskedEmail.includes("*") ||
      (item.onboardingStatus !== "complete" &&
        item.onboardingStatus !== "pending") ||
      typeof item.activityState !== "string" ||
      !ACTIVITY_STATES.has(item.activityState as UserActivityState) ||
      !joinedAt ||
      lastSignInAt === undefined ||
      !planCode?.match(/^[a-z0-9][a-z0-9_-]{1,39}$/) ||
      !planName ||
      (item.planKind !== "free" && item.planKind !== "paid") ||
      typeof item.subscriptionStatus !== "string" ||
      !SUBSCRIPTION_STATUSES.has(
        item.subscriptionStatus as UserSubscriptionStatus,
      ) ||
      trialEndsAt === undefined ||
      currentPeriodEnd === undefined ||
      typeof item.cancelAtPeriodEnd !== "boolean"
    ) {
      return null;
    }

    references.add(userReference);
    users.push({
      userReference,
      maskedEmail,
      onboardingStatus: item.onboardingStatus,
      activityState: item.activityState as UserActivityState,
      joinedAt,
      lastSignInAt,
      planCode,
      planName,
      planKind: item.planKind,
      subscriptionStatus: item.subscriptionStatus as UserSubscriptionStatus,
      trialEndsAt,
      currentPeriodEnd,
      cancelAtPeriodEnd: item.cancelAtPeriodEnd,
    });
  }

  return users;
}

export function parseAdminUserOperationsSnapshot(
  value: unknown,
): AdminUserOperationsSnapshot | null {
  if (!isRecord(value) || hasForbiddenKey(value)) return null;

  const operations = value.userOperations;
  if (!isRecord(operations) || !isRecord(operations.counts)) return null;

  const counts = {
    totalUsers: readCount(operations.counts.totalUsers),
    onboardingComplete: readCount(operations.counts.onboardingComplete),
    onboardingPending: readCount(operations.counts.onboardingPending),
    signedIn30d: readCount(operations.counts.signedIn30d),
    inactive90d: readCount(operations.counts.inactive90d),
    neverSignedIn: readCount(operations.counts.neverSignedIn),
    freeUsers: readCount(operations.counts.freeUsers),
    trialingUsers: readCount(operations.counts.trialingUsers),
    activePaidUsers: readCount(operations.counts.activePaidUsers),
    pastDueUsers: readCount(operations.counts.pastDueUsers),
  };
  const users = readUsers(operations.users);

  if (
    Object.values(counts).some((count) => count === null) ||
    operations.operationsMode !== "read_only" ||
    operations.lookupKey !== "opaque_reference" ||
    operations.rawEmailReturned !== false ||
    operations.userIdReturned !== false ||
    operations.financeDataReturned !== false ||
    operations.providerIdentifiersReturned !== false ||
    !users
  ) {
    return null;
  }

  if (
    counts.onboardingComplete! + counts.onboardingPending! !==
    counts.totalUsers!
  ) {
    return null;
  }

  return {
    operationsMode: "read_only",
    lookupKey: "opaque_reference",
    rawEmailReturned: false,
    userIdReturned: false,
    financeDataReturned: false,
    providerIdentifiersReturned: false,
    counts: {
      totalUsers: counts.totalUsers!,
      onboardingComplete: counts.onboardingComplete!,
      onboardingPending: counts.onboardingPending!,
      signedIn30d: counts.signedIn30d!,
      inactive90d: counts.inactive90d!,
      neverSignedIn: counts.neverSignedIn!,
      freeUsers: counts.freeUsers!,
      trialingUsers: counts.trialingUsers!,
      activePaidUsers: counts.activePaidUsers!,
      pastDueUsers: counts.pastDueUsers!,
    },
    users,
  };
}
