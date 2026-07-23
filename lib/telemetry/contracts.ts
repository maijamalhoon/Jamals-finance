export const TELEMETRY_EVENT_NAMES = [
  "page_viewed",
  "web_vital",
  "feature_used",
  "operation_completed",
  "operation_failed",
  "client_error",
] as const;

export const TELEMETRY_METRIC_NAMES = ["ttfb", "fcp", "lcp", "cls", "inp"] as const;

export const TELEMETRY_RESULTS = ["success", "failure", "cancelled"] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];
export type TelemetryMetricName = (typeof TELEMETRY_METRIC_NAMES)[number];
export type TelemetryResult = (typeof TELEMETRY_RESULTS)[number];

export type TelemetryPayload = {
  eventName: TelemetryEventName;
  route?: string;
  featureName?: string;
  result?: TelemetryResult;
  durationMs?: number;
  metricName?: TelemetryMetricName;
  metricValue?: number;
  errorCode?: string;
};

const PAYLOAD_KEYS = new Set([
  "eventName",
  "route",
  "featureName",
  "result",
  "durationMs",
  "metricName",
  "metricValue",
  "errorCode",
]);
const EVENT_NAMES = new Set<string>(TELEMETRY_EVENT_NAMES);
const METRIC_NAMES = new Set<string>(TELEMETRY_METRIC_NAMES);
const RESULTS = new Set<string>(TELEMETRY_RESULTS);
const SAFE_FEATURE = /^[a-z0-9_]{1,64}$/;
const SAFE_ERROR_CODE = /^[A-Z0-9_]{1,64}$/;
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_NUMBER_SEGMENT = /^\d{5,}$/;
const SAFE_ROUTE_SEGMENT = /^[a-z0-9._~-]{1,48}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function normalizeTelemetryRoute(value: string | null | undefined) {
  if (!value) return undefined;

  const path = value.split(/[?#]/, 1)[0]?.trim();
  if (!path?.startsWith("/")) return undefined;

  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment, index, allSegments) => {
      const decoded = (() => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })();
      const previous = allSegments[index - 1]?.toLowerCase();

      if (previous === "business") return ":workspace";
      if (UUID_SEGMENT.test(decoded) || LONG_NUMBER_SEGMENT.test(decoded)) return ":id";
      if (decoded.includes("@") || !SAFE_ROUTE_SEGMENT.test(decoded)) return ":dynamic";
      return decoded.toLowerCase();
    });

  const normalized = `/${segments.join("/")}`;
  return normalized.length <= 180 ? normalized : undefined;
}

export function parseTelemetryPayload(value: unknown): TelemetryPayload | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !PAYLOAD_KEYS.has(key))) return null;

  const eventName = optionalString(value.eventName);
  if (!eventName || !EVENT_NAMES.has(eventName)) return null;

  const route = normalizeTelemetryRoute(optionalString(value.route));
  const featureName = optionalString(value.featureName);
  const result = optionalString(value.result);
  const errorCode = optionalString(value.errorCode);
  const durationMs = value.durationMs;
  const metricName = optionalString(value.metricName);
  const metricValue = value.metricValue;

  if (featureName !== undefined && !SAFE_FEATURE.test(featureName)) return null;
  if (result !== undefined && !RESULTS.has(result)) return null;
  if (errorCode !== undefined && !SAFE_ERROR_CODE.test(errorCode)) return null;

  if (
    durationMs !== undefined &&
    (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > 120_000)
  ) {
    return null;
  }

  if ((metricName === undefined) !== (metricValue === undefined)) return null;
  if (metricName !== undefined && !METRIC_NAMES.has(metricName)) return null;
  if (
    metricValue !== undefined &&
    (typeof metricValue !== "number" || !Number.isFinite(metricValue))
  ) {
    return null;
  }

  if (eventName === "web_vital" && metricName === undefined) return null;
  if (eventName !== "web_vital" && metricName !== undefined) return null;
  if (eventName === "feature_used" && featureName === undefined) return null;
  if (
    (eventName === "operation_completed" || eventName === "operation_failed") &&
    featureName === undefined
  ) {
    return null;
  }
  if (eventName === "operation_failed" && result !== "failure") return null;
  if (eventName === "operation_completed" && result !== "success") return null;
  if (eventName === "client_error" && errorCode === undefined) return null;

  return {
    eventName: eventName as TelemetryEventName,
    ...(route ? { route } : {}),
    ...(featureName ? { featureName } : {}),
    ...(result ? { result: result as TelemetryResult } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(metricName
      ? {
          metricName: metricName as TelemetryMetricName,
          metricValue: metricValue as number,
        }
      : {}),
    ...(errorCode ? { errorCode } : {}),
  };
}
