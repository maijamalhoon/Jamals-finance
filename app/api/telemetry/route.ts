import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  classifyTelemetryDevice,
  parseTelemetryPayload,
  readTelemetryGeo,
} from "@/lib/telemetry/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TELEMETRY_BODY_BYTES = 4 * 1024;

function telemetryResponse(status = 204) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function telemetryError(status: number, code: string) {
  return NextResponse.json(
    { error: "Telemetry request rejected", code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function requestIsSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_TELEMETRY_ENABLED !== "true") {
    return telemetryResponse();
  }

  if (!requestIsSameOrigin(request)) {
    return telemetryError(403, "cross_site_request_blocked");
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return telemetryError(415, "unsupported_media_type");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_TELEMETRY_BODY_BYTES
  ) {
    return telemetryError(413, "payload_too_large");
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return telemetryError(400, "invalid_body");
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_TELEMETRY_BODY_BYTES) {
    return telemetryError(413, "payload_too_large");
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return telemetryError(400, "invalid_json");
  }

  const payload = parseTelemetryPayload(body);
  if (!payload) return telemetryError(400, "invalid_payload");

  const geo = readTelemetryGeo(request.headers);
  const device = classifyTelemetryDevice(request.headers.get("user-agent"));
  const requestId = request.headers.get("x-vercel-id")?.slice(0, 128) ?? null;
  const appVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 64) ?? null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_privacy_telemetry_event", {
    p_session_id: payload.sessionId,
    p_event_name: payload.eventName,
    p_route: payload.route,
    p_feature: payload.feature,
    p_result: payload.result,
    p_navigation_type: payload.navigationType,
    p_metric_name: payload.metricName,
    p_metric_value: payload.metricValue,
    p_metric_rating: payload.metricRating,
    p_country_code: geo.countryCode,
    p_region_code: geo.regionCode,
    p_city: geo.city,
    p_device_type: device.deviceType,
    p_os_family: device.osFamily,
    p_browser_family: device.browserFamily,
    p_request_id: requestId,
    p_app_version: appVersion,
  });

  if (error) {
    Sentry.captureMessage("Privacy telemetry insert failed", {
      level: "warning",
      tags: {
        area: "privacy-telemetry",
        database_code: error.code || "unknown",
      },
    });

    if (error.code === "42501") {
      return telemetryError(401, "authentication_required");
    }

    return telemetryError(503, "telemetry_unavailable");
  }

  return telemetryResponse();
}
