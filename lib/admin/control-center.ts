export type PlatformAdminRole = "owner" | "admin" | "analyst" | "support";

export type AdminCountBreakdown = {
  label: string;
  users: number;
};

export type AdminRouteBreakdown = {
  route: string;
  count: number;
};

export type AdminPlanBreakdown = {
  code: string;
  name: string;
  kind: "free" | "paid";
  status: string;
  users: number;
};

export type AdminControlCenterSnapshot = {
  generatedAt: string;
  adminRole: PlatformAdminRole;
  featurePolicy: "unlimited";
  users: {
    total: number;
    new7d: number;
    new30d: number;
    signedIn24h: number;
    signedIn30d: number;
  };
  billing: {
    freeUsers: number;
    trialUsers: number;
    paidUsers: number;
    pastDueUsers: number;
    cancelledUsers: number;
    providerConnected: boolean;
    plans: AdminPlanBreakdown[];
  };
  telemetry: {
    activeUsers24h: number;
    activeUsers30d: number;
    events24h: number;
    failedOperations7d: number;
    poorPerformanceSignals7d: number;
    devices: AdminCountBreakdown[];
    countries: AdminCountBreakdown[];
    topRoutes: AdminRouteBreakdown[];
    slowRoutes: AdminRouteBreakdown[];
  };
  privacy: {
    openRequests: number;
    overdueRequests: number;
    completedRequests30d: number;
    adminViews30d: number;
    telemetryEventsStored: number;
    telemetrySubjectsStored: number;
    expiredTelemetryPending: number;
    expiredAdminAuditPending: number;
    lastRetentionRunAt: string | null;
    lastRetentionRowsDeleted: number;
    telemetryRetentionDays: number;
    adminAuditRetentionMonths: number;
    rawIpStored: false;
    sessionReplayEnabled: false;
    financeContentInTelemetry: false;
  };
};

const ADMIN_ROLES = new Set<PlatformAdminRole>([
  "owner",
  "admin",
  "analyst",
  "support",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

function readString(value: unknown, maximumLength = 160) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function readNullableDate(value: unknown) {
  if (value === null) return null;
  const parsed = readString(value, 64);
  return parsed && !Number.isNaN(Date.parse(parsed)) ? parsed : undefined;
}

function readCountBreakdown(
  value: unknown,
  labelKey: "device" | "country",
): AdminCountBreakdown[] | null {
  if (!Array.isArray(value)) return null;

  const parsed: AdminCountBreakdown[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const label = readString(item[labelKey], 80);
    const users = readCount(item.users);
    if (!label || users === null) return null;
    parsed.push({ label, users });
  }
  return parsed;
}

function readRouteBreakdown(
  value: unknown,
  countKey: "events" | "signals",
): AdminRouteBreakdown[] | null {
  if (!Array.isArray(value)) return null;

  const parsed: AdminRouteBreakdown[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const route = readString(item.route, 160);
    const count = readCount(item[countKey]);
    if (!route?.startsWith("/") || count === null) return null;
    parsed.push({ route, count });
  }
  return parsed;
}

function readPlanBreakdown(value: unknown): AdminPlanBreakdown[] | null {
  if (!Array.isArray(value)) return null;

  const parsed: AdminPlanBreakdown[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const code = readString(item.code, 40);
    const name = readString(item.name, 80);
    const kind = item.kind;
    const status = readString(item.status, 40);
    const users = readCount(item.users);
    if (
      !code ||
      !name ||
      (kind !== "free" && kind !== "paid") ||
      !status ||
      users === null
    ) {
      return null;
    }
    parsed.push({ code, name, kind, status, users });
  }
  return parsed;
}

export function parseAdminControlCenterSnapshot(
  value: unknown,
): AdminControlCenterSnapshot | null {
  if (!isRecord(value)) return null;

  const generatedAt = readString(value.generatedAt, 64);
  const adminRole = value.adminRole;
  const users = value.users;
  const billing = value.billing;
  const telemetry = value.telemetry;
  const privacy = value.privacy;

  if (
    !generatedAt ||
    Number.isNaN(Date.parse(generatedAt)) ||
    typeof adminRole !== "string" ||
    !ADMIN_ROLES.has(adminRole as PlatformAdminRole) ||
    value.featurePolicy !== "unlimited" ||
    !isRecord(users) ||
    !isRecord(billing) ||
    !isRecord(telemetry) ||
    !isRecord(privacy)
  ) {
    return null;
  }

  const total = readCount(users.total);
  const new7d = readCount(users.new7d);
  const new30d = readCount(users.new30d);
  const signedIn24h = readCount(users.signedIn24h);
  const signedIn30d = readCount(users.signedIn30d);
  const freeUsers = readCount(billing.freeUsers);
  const trialUsers = readCount(billing.trialUsers);
  const paidUsers = readCount(billing.paidUsers);
  const pastDueUsers = readCount(billing.pastDueUsers);
  const cancelledUsers = readCount(billing.cancelledUsers);
  const activeUsers24h = readCount(telemetry.activeUsers24h);
  const activeUsers30d = readCount(telemetry.activeUsers30d);
  const events24h = readCount(telemetry.events24h);
  const failedOperations7d = readCount(telemetry.failedOperations7d);
  const poorPerformanceSignals7d = readCount(
    telemetry.poorPerformanceSignals7d,
  );
  const plans = readPlanBreakdown(billing.plans);
  const devices = readCountBreakdown(telemetry.devices, "device");
  const countries = readCountBreakdown(telemetry.countries, "country");
  const topRoutes = readRouteBreakdown(telemetry.topRoutes, "events");
  const slowRoutes = readRouteBreakdown(telemetry.slowRoutes, "signals");

  const openRequests = readCount(privacy.openRequests);
  const overdueRequests = readCount(privacy.overdueRequests);
  const completedRequests30d = readCount(privacy.completedRequests30d);
  const adminViews30d = readCount(privacy.adminViews30d);
  const telemetryEventsStored = readCount(privacy.telemetryEventsStored);
  const telemetrySubjectsStored = readCount(privacy.telemetrySubjectsStored);
  const expiredTelemetryPending = readCount(privacy.expiredTelemetryPending);
  const expiredAdminAuditPending = readCount(privacy.expiredAdminAuditPending);
  const lastRetentionRowsDeleted = readCount(privacy.lastRetentionRowsDeleted);
  const telemetryRetentionDays = readCount(privacy.telemetryRetentionDays);
  const adminAuditRetentionMonths = readCount(
    privacy.adminAuditRetentionMonths,
  );
  const lastRetentionRunAt = readNullableDate(privacy.lastRetentionRunAt);

  if (
    [
      total,
      new7d,
      new30d,
      signedIn24h,
      signedIn30d,
      freeUsers,
      trialUsers,
      paidUsers,
      pastDueUsers,
      cancelledUsers,
      activeUsers24h,
      activeUsers30d,
      events24h,
      failedOperations7d,
      poorPerformanceSignals7d,
      openRequests,
      overdueRequests,
      completedRequests30d,
      adminViews30d,
      telemetryEventsStored,
      telemetrySubjectsStored,
      expiredTelemetryPending,
      expiredAdminAuditPending,
      lastRetentionRowsDeleted,
      telemetryRetentionDays,
      adminAuditRetentionMonths,
    ].some((count) => count === null) ||
    typeof billing.providerConnected !== "boolean" ||
    !plans ||
    !devices ||
    !countries ||
    !topRoutes ||
    !slowRoutes ||
    lastRetentionRunAt === undefined ||
    privacy.rawIpStored !== false ||
    privacy.sessionReplayEnabled !== false ||
    privacy.financeContentInTelemetry !== false
  ) {
    return null;
  }

  return {
    generatedAt,
    adminRole: adminRole as PlatformAdminRole,
    featurePolicy: "unlimited",
    users: {
      total: total!,
      new7d: new7d!,
      new30d: new30d!,
      signedIn24h: signedIn24h!,
      signedIn30d: signedIn30d!,
    },
    billing: {
      freeUsers: freeUsers!,
      trialUsers: trialUsers!,
      paidUsers: paidUsers!,
      pastDueUsers: pastDueUsers!,
      cancelledUsers: cancelledUsers!,
      providerConnected: billing.providerConnected,
      plans,
    },
    telemetry: {
      activeUsers24h: activeUsers24h!,
      activeUsers30d: activeUsers30d!,
      events24h: events24h!,
      failedOperations7d: failedOperations7d!,
      poorPerformanceSignals7d: poorPerformanceSignals7d!,
      devices,
      countries,
      topRoutes,
      slowRoutes,
    },
    privacy: {
      openRequests: openRequests!,
      overdueRequests: overdueRequests!,
      completedRequests30d: completedRequests30d!,
      adminViews30d: adminViews30d!,
      telemetryEventsStored: telemetryEventsStored!,
      telemetrySubjectsStored: telemetrySubjectsStored!,
      expiredTelemetryPending: expiredTelemetryPending!,
      expiredAdminAuditPending: expiredAdminAuditPending!,
      lastRetentionRunAt,
      lastRetentionRowsDeleted: lastRetentionRowsDeleted!,
      telemetryRetentionDays: telemetryRetentionDays!,
      adminAuditRetentionMonths: adminAuditRetentionMonths!,
      rawIpStored: false,
      sessionReplayEnabled: false,
      financeContentInTelemetry: false,
    },
  };
}

export function formatAdminCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatAdminGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
