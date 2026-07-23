import { describe, expect, it } from "vitest";

import {
  classifyTelemetryDevice,
  normalizeTelemetryRoute,
  parseTelemetryPayload,
  readTelemetryGeo,
} from "./schema";

const sessionId = "1c2db3ad-4176-4e90-8da8-f4aecce173d5";

describe("privacy telemetry contracts", () => {
  it("normalizes dynamic identifiers without retaining record ids", () => {
    expect(
      normalizeTelemetryRoute(
        "/dashboard/transactions/5de940d2-f604-4ec8-baa7-3175a5a5158f/42",
      ),
    ).toBe("/dashboard/transactions/[id]/[id]");
  });

  it("rejects query strings, fragments, external URLs, and oversized routes", () => {
    expect(normalizeTelemetryRoute("/dashboard?account=private")).toBeNull();
    expect(normalizeTelemetryRoute("/dashboard#balance")).toBeNull();
    expect(normalizeTelemetryRoute("https://example.com/dashboard")).toBeNull();
    expect(normalizeTelemetryRoute(`/${"a".repeat(241)}`)).toBeNull();
  });

  it("rejects control characters deterministically across repeated calls", () => {
    expect(normalizeTelemetryRoute("/dashboard\n/private")).toBeNull();
    expect(normalizeTelemetryRoute("/dashboard\n/private")).toBeNull();
    expect(normalizeTelemetryRoute("/dashboard/settings")).toBe(
      "/dashboard/settings",
    );
  });

  it("accepts strictly shaped LCP and INP web-vital payloads", () => {
    expect(
      parseTelemetryPayload({
        sessionId,
        eventName: "web_vital",
        route: "/dashboard",
        metricName: "LCP",
        metricValue: 1842.4,
        metricRating: "good",
      }),
    ).toEqual({
      sessionId,
      eventName: "web_vital",
      route: "/dashboard",
      feature: null,
      result: null,
      navigationType: null,
      metricName: "LCP",
      metricValue: 1842.4,
      metricRating: "good",
    });

    expect(
      parseTelemetryPayload({
        sessionId,
        eventName: "web_vital",
        route: "/dashboard/transactions",
        metricName: "INP",
        metricValue: 212,
        metricRating: "needs-improvement",
      }),
    ).toMatchObject({
      eventName: "web_vital",
      route: "/dashboard/transactions",
      metricName: "INP",
      metricValue: 212,
      metricRating: "needs-improvement",
    });
  });

  it("rejects unapproved features and incomplete operation events", () => {
    expect(
      parseTelemetryPayload({
        sessionId,
        eventName: "feature_used",
        route: "/dashboard",
        feature: "bank_balance",
      }),
    ).toBeNull();

    expect(
      parseTelemetryPayload({
        sessionId,
        eventName: "operation_failed",
        route: "/dashboard/settings",
      }),
    ).toBeNull();
  });

  it("keeps device data broad instead of storing exact models", () => {
    expect(
      classifyTelemetryDevice(
        "Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 Chrome/136.0 Safari/537.36",
      ),
    ).toEqual({
      deviceType: "mobile",
      osFamily: "Android",
      browserFamily: "Chrome",
    });

    expect(
      classifyTelemetryDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
      ),
    ).toEqual({
      deviceType: "desktop",
      osFamily: "macOS",
      browserFamily: "Safari",
    });
  });

  it("reads only derived Vercel geography and safely decodes the city", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "pk",
      "x-vercel-ip-country-region": "pb",
      "x-vercel-ip-city": "Lahore%20City",
    });

    expect(readTelemetryGeo(headers)).toEqual({
      countryCode: "PK",
      regionCode: "PB",
      city: "Lahore City",
    });
  });
});
