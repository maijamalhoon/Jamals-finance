"use client";

import {
  parseTelemetryPayload,
  type TelemetryPayload,
} from "@/lib/telemetry/contracts";

type PrivacyAwareNavigator = Navigator & {
  globalPrivacyControl?: boolean;
};

function telemetryAllowed() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const privacyNavigator = navigator as PrivacyAwareNavigator;
  return privacyNavigator.globalPrivacyControl !== true && navigator.doNotTrack !== "1";
}

export function trackTelemetry(input: TelemetryPayload) {
  if (!telemetryAllowed()) return;

  const payload = parseTelemetryPayload(input);
  if (!payload) return;

  const body = JSON.stringify(payload);
  if (body.length > 2 * 1024) return;

  try {
    if (typeof navigator.sendBeacon === "function") {
      const accepted = navigator.sendBeacon(
        "/api/telemetry",
        new Blob([body], { type: "application/json" }),
      );
      if (accepted) return;
    }

    void fetch("/api/telemetry", {
      method: "POST",
      body,
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);
  } catch {
    // Monitoring must never surface an error or delay the product experience.
  }
}
