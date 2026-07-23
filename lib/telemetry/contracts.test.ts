import { describe, expect, it } from "vitest";

import {
  normalizeTelemetryRoute,
  parseTelemetryPayload,
} from "@/lib/telemetry/contracts";

describe("privacy-first telemetry contracts", () => {
  it("removes queries and replaces dynamic identifiers", () => {
    expect(
      normalizeTelemetryRoute(
        "/business/my-private-company/reports?email=private@example.com",
      ),
    ).toBe("/business/:workspace/reports");
    expect(
      normalizeTelemetryRoute(
        "/dashboard/accounts/7b4e2e44-41b3-4fde-8f56-9ac849779a32#balance",
      ),
    ).toBe("/dashboard/accounts/:id");
  });

  it("accepts only approved fields and event shapes", () => {
    expect(
      parseTelemetryPayload({
        eventName: "web_vital",
        route: "/dashboard",
        metricName: "lcp",
        metricValue: 1840,
      }),
    ).toEqual({
      eventName: "web_vital",
      route: "/dashboard",
      metricName: "lcp",
      metricValue: 1840,
    });

    expect(
      parseTelemetryPayload({
        eventName: "feature_used",
        featureName: "report_opened",
      }),
    ).toEqual({
      eventName: "feature_used",
      featureName: "report_opened",
    });
  });

  it("rejects arbitrary or sensitive properties", () => {
    expect(
      parseTelemetryPayload({
        eventName: "page_viewed",
        route: "/dashboard",
        email: "private@example.com",
      }),
    ).toBeNull();
    expect(
      parseTelemetryPayload({
        eventName: "feature_used",
        featureName: "transaction_created",
        amount: 5000,
      }),
    ).toBeNull();
    expect(
      parseTelemetryPayload({
        eventName: "client_error",
        errorCode: "Contains private text",
      }),
    ).toBeNull();
  });

  it("requires safe result and metric combinations", () => {
    expect(
      parseTelemetryPayload({
        eventName: "operation_failed",
        featureName: "backup_import",
        result: "failure",
        durationMs: 9120,
        errorCode: "IMPORT_TIMEOUT",
      }),
    ).toEqual({
      eventName: "operation_failed",
      featureName: "backup_import",
      result: "failure",
      durationMs: 9120,
      errorCode: "IMPORT_TIMEOUT",
    });

    expect(
      parseTelemetryPayload({
        eventName: "operation_failed",
        featureName: "backup_import",
        result: "success",
      }),
    ).toBeNull();
  });
});
