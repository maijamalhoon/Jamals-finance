"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackTelemetry } from "@/lib/telemetry/client";
import type { TelemetryMetricName } from "@/lib/telemetry/contracts";

const PERFORMANCE_SAMPLE_RATE = 0.1;

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type EventTimingEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
};

function scheduleIdle(callback: () => void) {
  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 2_000 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 750);
  return () => window.clearTimeout(handle);
}

function roundMetric(name: TelemetryMetricName, value: number) {
  return name === "cls"
    ? Math.round(value * 10_000) / 10_000
    : Math.round(value);
}

function observe(
  type: string,
  callback: PerformanceObserverCallback,
) {
  if (
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes.includes(type)
  ) {
    return null;
  }

  const observer = new PerformanceObserver(callback);
  try {
    observer.observe({ type, buffered: true });
    return observer;
  } catch {
    observer.disconnect();
    return null;
  }
}

export default function TelemetryProvider() {
  const pathname = usePathname();
  const routeRef = useRef(pathname);
  routeRef.current = pathname;

  useEffect(() => {
    return scheduleIdle(() => {
      trackTelemetry({ eventName: "page_viewed", route: pathname });
    });
  }, [pathname]);

  useEffect(() => {
    if (Math.random() >= PERFORMANCE_SAMPLE_RATE) return;

    const sendMetric = (metricName: TelemetryMetricName, metricValue: number) => {
      if (!Number.isFinite(metricValue) || metricValue < 0) return;
      trackTelemetry({
        eventName: "web_vital",
        route: routeRef.current,
        metricName,
        metricValue: roundMetric(metricName, metricValue),
      });
    };

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation?.responseStart !== undefined) {
      sendMetric("ttfb", navigation.responseStart);
    }

    const firstContentfulPaint = performance.getEntriesByName(
      "first-contentful-paint",
    )[0];
    if (firstContentfulPaint) sendMetric("fcp", firstContentfulPaint.startTime);

    let latestLcp = 0;
    let cumulativeLayoutShift = 0;
    let longestInteraction = 0;
    let flushed = false;

    const lcpObserver = observe("largest-contentful-paint", (list) => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) latestLcp = latest.startTime;
    });

    const clsObserver = observe("layout-shift", (list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) cumulativeLayoutShift += entry.value;
      }
    });

    const inpObserver = observe("event", (list) => {
      for (const entry of list.getEntries() as EventTimingEntry[]) {
        if ((entry.interactionId ?? 0) > 0) {
          longestInteraction = Math.max(longestInteraction, entry.duration);
        }
      }
    });

    const flush = () => {
      if (flushed) return;
      flushed = true;
      if (latestLcp > 0) sendMetric("lcp", latestLcp);
      sendMetric("cls", cumulativeLayoutShift);
      if (longestInteraction > 0) sendMetric("inp", longestInteraction);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange, {
      passive: true,
    });
    window.addEventListener("pagehide", flush, { passive: true, once: true });

    return () => {
      flush();
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      inpObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
