import { classifyTelemetryDevice } from "@/lib/telemetry/device";
import { parseTelemetryPayload } from "@/lib/telemetry/contracts";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
} as const;

function emptyResponse(status: number) {
  return new Response(null, { status, headers: NO_STORE_HEADERS });
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

function safeHeader(
  value: string | null,
  pattern: RegExp,
  maximumLength: number,
  transform: (candidate: string) => string = (candidate) => candidate,
) {
  if (!value) return null;
  const candidate = transform(value.trim()).slice(0, maximumLength);
  return pattern.test(candidate) ? candidate : null;
}

function safeCity(value: string | null) {
  if (!value) return null;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Vercel city headers can be RFC3986 encoded. Invalid encoding is discarded below.
  }

  const candidate = decoded.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80);
  return candidate ? candidate : null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return emptyResponse(403);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return emptyResponse(415);

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return emptyResponse(413);
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return emptyResponse(400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return emptyResponse(413);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return emptyResponse(400);
  }

  const payload = parseTelemetryPayload(parsedBody);
  if (!payload) return emptyResponse(400);

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return emptyResponse(401);

    const device = classifyTelemetryDevice(request.headers);
    const countryCode = safeHeader(
      request.headers.get("x-vercel-ip-country"),
      /^[A-Z]{2}$/,
      2,
      (candidate) => candidate.toUpperCase(),
    );
    const regionCode = safeHeader(
      request.headers.get("x-vercel-ip-country-region"),
      /^[A-Za-z0-9-]{1,8}$/,
      8,
    );
    const city = safeCity(request.headers.get("x-vercel-ip-city"));
    const appVersion = safeHeader(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
        process.env.NEXT_PUBLIC_APP_VERSION ??
        null,
      /^[A-Za-z0-9._-]{1,64}$/,
      64,
    );

    const { error } = await supabase.rpc("record_telemetry_event", {
      p_event_name: payload.eventName,
      p_route: payload.route ?? null,
      p_feature_name: payload.featureName ?? null,
      p_result: payload.result ?? null,
      p_duration_ms: payload.durationMs ?? null,
      p_metric_name: payload.metricName ?? null,
      p_metric_value: payload.metricValue ?? null,
      p_error_code: payload.errorCode ?? null,
      p_country_code: countryCode,
      p_region_code: regionCode,
      p_city: city,
      p_device_type: device.deviceType,
      p_os_family: device.osFamily,
      p_browser_family: device.browserFamily,
      p_app_version: appVersion,
    });

    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "telemetry_write_failed",
          code: error.code ?? "unknown",
        }),
      );
      return emptyResponse(202);
    }

    return emptyResponse(204);
  } catch {
    // Telemetry is intentionally fail-open: product features never wait on monitoring.
    return emptyResponse(202);
  }
}
