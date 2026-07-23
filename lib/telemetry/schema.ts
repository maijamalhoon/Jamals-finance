export const TELEMETRY_EVENT_NAMES = [
  "page_view",
  "page_navigation",
  "web_vital",
  "long_task",
  "feature_used",
  "operation_started",
  "operation_completed",
  "operation_failed",
] as const;

export const TELEMETRY_FEATURES = [
  "dashboard",
  "transactions",
  "income",
  "expenses",
  "accounts",
  "goals",
  "payables",
  "investments",
  "analytics",
  "reports",
  "settings",
  "import",
  "export",
  "authentication",
  "onboarding",
  "ai_insights",
  "business",
] as const;

export const TELEMETRY_RESULTS = [
  "success",
  "failure",
  "cancelled",
  "unknown",
] as const;

export const TELEMETRY_NAVIGATION_TYPES = [
  "push",
  "replace",
  "traverse",
  "reload",
] as const;

export const TELEMETRY_METRIC_NAMES = [
  "TTFB",
  "FCP",
  "LCP",
  "CLS",
  "LOAD",
  "LONG_TASK",
] as const;

export const TELEMETRY_METRIC_RATINGS = [
  "good",
  "needs-improvement",
  "poor",
  "unrated",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];
export type TelemetryFeature = (typeof TELEMETRY_FEATURES)[number];
export type TelemetryResult = (typeof TELEMETRY_RESULTS)[number];
export type TelemetryNavigationType =
  (typeof TELEMETRY_NAVIGATION_TYPES)[number];
export type TelemetryMetricName = (typeof TELEMETRY_METRIC_NAMES)[number];
export type TelemetryMetricRating =
  (typeof TELEMETRY_METRIC_RATINGS)[number];

export type ParsedTelemetryPayload = {
  sessionId: string;
  eventName: TelemetryEventName;
  route: string;
  feature: TelemetryFeature | null;
  result: TelemetryResult | null;
  navigationType: TelemetryNavigationType | null;
  metricName: TelemetryMetricName | null;
  metricValue: number | null;
  metricRating: TelemetryMetricRating | null;
};

export type TelemetryDevice = {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  osFamily: "Android" | "iOS" | "Windows" | "macOS" | "Linux" | "Other";
  browserFamily:
    | "Chrome"
    | "Edge"
    | "Firefox"
    | "Opera"
    | "Safari"
    | "Samsung Internet"
    | "Other";
};

export type TelemetryGeo = {
  countryCode: string | null;
  regionCode: string | null;
  city: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTER_TEST_PATTERN = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARACTER_REPLACE_PATTERN = /[\u0000-\u001f\u007f]/g;
const UUID_PATH_SEGMENT_PATTERN =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const NUMERIC_PATH_SEGMENT_PATTERN = /\/\d{1,20}(?=\/|$)/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMember<T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function optionalMember<T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return isMember(value, values) ? value : undefined;
}

export function normalizeTelemetryRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > 240 ||
    !trimmed.startsWith("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    CONTROL_CHARACTER_TEST_PATTERN.test(trimmed)
  ) {
    return null;
  }

  const normalized = trimmed
    .replace(/\/{2,}/g, "/")
    .replace(UUID_PATH_SEGMENT_PATTERN, "/[id]")
    .replace(NUMERIC_PATH_SEGMENT_PATTERN, "/[id]");

  if (normalized.length > 160) return null;
  return normalized;
}

export function parseTelemetryPayload(
  value: unknown,
): ParsedTelemetryPayload | null {
  if (!isRecord(value)) return null;

  const sessionId = value.sessionId;
  const eventName = value.eventName;
  const route = normalizeTelemetryRoute(value.route);

  if (
    typeof sessionId !== "string" ||
    !UUID_PATTERN.test(sessionId) ||
    !isMember(eventName, TELEMETRY_EVENT_NAMES) ||
    route === null
  ) {
    return null;
  }

  const feature = optionalMember(value.feature, TELEMETRY_FEATURES);
  const result = optionalMember(value.result, TELEMETRY_RESULTS);
  const navigationType = optionalMember(
    value.navigationType,
    TELEMETRY_NAVIGATION_TYPES,
  );
  const metricName = optionalMember(value.metricName, TELEMETRY_METRIC_NAMES);
  const metricRating = optionalMember(
    value.metricRating,
    TELEMETRY_METRIC_RATINGS,
  );

  if (
    feature === undefined ||
    result === undefined ||
    navigationType === undefined ||
    metricName === undefined ||
    metricRating === undefined
  ) {
    return null;
  }

  const metricValue =
    value.metricValue === undefined || value.metricValue === null
      ? null
      : typeof value.metricValue === "number" &&
          Number.isFinite(value.metricValue) &&
          value.metricValue >= 0 &&
          value.metricValue <= 600000
        ? value.metricValue
        : undefined;

  if (metricValue === undefined) return null;

  if (
    [
      "feature_used",
      "operation_started",
      "operation_completed",
      "operation_failed",
    ].includes(eventName) &&
    feature === null
  ) {
    return null;
  }

  if (eventName === "page_navigation" && navigationType === null) return null;

  if (
    (eventName === "web_vital" || eventName === "long_task") &&
    (metricName === null || metricValue === null)
  ) {
    return null;
  }

  if (eventName === "long_task" && metricName !== "LONG_TASK") return null;

  return {
    sessionId,
    eventName,
    route,
    feature,
    result,
    navigationType,
    metricName,
    metricValue,
    metricRating,
  };
}

function cleanHeaderValue(value: string | null, maxLength: number) {
  if (!value) return null;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {}

  const cleaned = decoded
    .replace(CONTROL_CHARACTER_REPLACE_PATTERN, "")
    .trim()
    .slice(0, maxLength);

  return cleaned || null;
}

export function readTelemetryGeo(headers: Headers): TelemetryGeo {
  const country = cleanHeaderValue(headers.get("x-vercel-ip-country"), 2)?.toUpperCase();
  const region = cleanHeaderValue(
    headers.get("x-vercel-ip-country-region"),
    8,
  )?.toUpperCase();
  const city = cleanHeaderValue(headers.get("x-vercel-ip-city"), 80);

  return {
    countryCode: country && /^[A-Z]{2}$/.test(country) ? country : null,
    regionCode:
      region && /^[A-Z0-9-]{1,8}$/.test(region) ? region : null,
    city,
  };
}

export function classifyTelemetryDevice(userAgent: string | null): TelemetryDevice {
  const value = userAgent ?? "";

  const deviceType: TelemetryDevice["deviceType"] =
    /iPad|Tablet|Android(?!.*Mobile)/i.test(value)
      ? "tablet"
      : /Mobile|iPhone|iPod|Android/i.test(value)
        ? "mobile"
        : value
          ? "desktop"
          : "unknown";

  const osFamily: TelemetryDevice["osFamily"] = /Android/i.test(value)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(value)
      ? "iOS"
      : /Windows/i.test(value)
        ? "Windows"
        : /Macintosh|Mac OS X/i.test(value)
          ? "macOS"
          : /Linux/i.test(value)
            ? "Linux"
            : "Other";

  const browserFamily: TelemetryDevice["browserFamily"] = /SamsungBrowser/i.test(
    value,
  )
    ? "Samsung Internet"
    : /Edg\//i.test(value)
      ? "Edge"
      : /OPR\//i.test(value)
        ? "Opera"
        : /Firefox\//i.test(value)
          ? "Firefox"
          : /Chrome\//i.test(value)
            ? "Chrome"
            : /Safari\//i.test(value)
              ? "Safari"
              : "Other";

  return { deviceType, osFamily, browserFamily };
}
