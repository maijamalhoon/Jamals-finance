"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ANIMATION_MODE_CHANGE_EVENT,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";
import {
  preloadDashboardModal,
  preloadDashboardModals,
  type DashboardModalKey,
} from "@/lib/dashboard-modal-loaders";
import { NAV_ITEMS } from "@/lib/navigation";

const DASHBOARD_ROUTE_PRIORITY = [
  "/dashboard/transactions",
  "/dashboard",
  "/dashboard/accounts",
  "/dashboard/income",
  "/dashboard/expenses",
  "/dashboard/analytics",
  ...NAV_ITEMS.map((item) => item.href),
].filter((href, index, routes) => routes.indexOf(href) === index);

// This cache lives for the browser session, so navigating between dashboard
// pages never schedules the same prefetch repeatedly.
const prefetchedDashboardRoutes = new Set<string>();

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

type NavigatorWithPerformanceHints = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
};

const MODAL_INTENT_MATCHERS: Array<{
  key: DashboardModalKey;
  labels: readonly string[];
}> = [
  { key: "transaction", labels: ["add income", "add expense"] },
  { key: "transfer", labels: ["transfer money", "add transfer"] },
  { key: "investment", labels: ["add investment", "new investment"] },
  { key: "goal", labels: ["add goal", "new goal"] },
  { key: "payable", labels: ["add payable", "new payable"] },
  { key: "account", labels: ["add account", "new account"] },
];

function getDashboardHref(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return null;

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (!url.pathname.startsWith("/dashboard")) return null;

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function getModalIntent(target: EventTarget | null): DashboardModalKey | null {
  if (!(target instanceof Element)) return null;

  const interactive = target.closest<HTMLElement>(
    "button[aria-label], a[aria-label], [role='button'][aria-label]",
  );
  const label = interactive?.getAttribute("aria-label")?.trim().toLowerCase();
  if (!label) return null;

  return (
    MODAL_INTENT_MATCHERS.find((matcher) =>
      matcher.labels.some((candidate) => label.includes(candidate)),
    )?.key ?? null
  );
}

function isPerformanceAnimationMode(mode: AnimationMode) {
  return mode === "fast" || mode === "none";
}

function getBackgroundWarmupPolicy(mode: AnimationMode) {
  const runtimeNavigator = navigator as NavigatorWithPerformanceHints;
  const connection = runtimeNavigator.connection;
  const effectiveType = connection?.effectiveType ?? "unknown";
  const downlink = connection?.downlink;
  const lowCapacityDevice =
    (runtimeNavigator.deviceMemory !== undefined &&
      runtimeNavigator.deviceMemory <= 2) ||
    (runtimeNavigator.hardwareConcurrency > 0 &&
      runtimeNavigator.hardwareConcurrency <= 2);
  const constrainedNetwork =
    runtimeNavigator.onLine === false ||
    connection?.saveData === true ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (downlink !== undefined && downlink < 1.5);
  const moderateNetwork =
    effectiveType === "3g" ||
    (downlink !== undefined && downlink >= 1.5 && downlink < 4);

  return {
    // Intent-based preloading still works on constrained devices; only automatic
    // background work is disabled to protect memory, battery and user data.
    allowed: !constrainedNetwork && !lowCapacityDevice,
    routeLimit:
      mode === "none" ? (moderateNetwork ? 2 : 5) : moderateNetwork ? 1 : 3,
    modalKeys:
      mode === "none"
        ? (["transaction", "transfer", "account"] as const)
        : (["transaction", "transfer"] as const),
  };
}

export default function AnimationPerformanceMode() {
  const pathname = usePathname();
  const router = useRouter();
  const insideDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    if (!insideDashboard) return;

    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null = null;
    let lastPointerIntentTarget: Element | null = null;
    let intentListenersAttached = false;

    const getActiveMode = () => getDocumentAnimationMode();

    const prefetchRoute = (href: string) => {
      if (href === pathname || prefetchedDashboardRoutes.has(href)) return;

      prefetchedDashboardRoutes.add(href);

      try {
        router.prefetch(href);
      } catch {
        // A later direct navigation still works; allow a future intent to retry.
        prefetchedDashboardRoutes.delete(href);
      }
    };

    const preloadModal = (key: DashboardModalKey) => {
      void preloadDashboardModal(key).catch(() => undefined);
    };

    const cancelScheduledWork = () => {
      if (
        idleHandle !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) globalThis.clearTimeout(timeoutHandle);

      idleHandle = null;
      timeoutHandle = null;
    };

    const handleUserIntent = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;

      if (event.type === "pointerover") {
        const interactiveTarget: Element | null = target
          ? target.closest(
              "a[href], button[aria-label], [role='button'][aria-label]",
            )
          : null;
        if (interactiveTarget === lastPointerIntentTarget) return;
        lastPointerIntentTarget = interactiveTarget;
      }

      const href = getDashboardHref(target);
      if (href) prefetchRoute(href);

      const modalKey = getModalIntent(target);
      if (modalKey) preloadModal(modalKey);
    };

    const attachIntentListeners = () => {
      if (intentListenersAttached) return;
      intentListenersAttached = true;
      document.addEventListener("pointerover", handleUserIntent, true);
      document.addEventListener("pointerdown", handleUserIntent, true);
      document.addEventListener("focusin", handleUserIntent, true);
    };

    const detachIntentListeners = () => {
      if (!intentListenersAttached) return;
      intentListenersAttached = false;
      lastPointerIntentTarget = null;
      document.removeEventListener("pointerover", handleUserIntent, true);
      document.removeEventListener("pointerdown", handleUserIntent, true);
      document.removeEventListener("focusin", handleUserIntent, true);
    };

    const runBoundedWarmup = (expectedMode: AnimationMode) => {
      if (
        document.visibilityState !== "visible" ||
        getActiveMode() !== expectedMode
      ) {
        return;
      }

      const policy = getBackgroundWarmupPolicy(expectedMode);
      if (!policy.allowed) return;

      void preloadDashboardModals(policy.modalKeys);

      DASHBOARD_ROUTE_PRIORITY.filter((href) => href !== pathname)
        .slice(0, policy.routeLimit)
        .forEach(prefetchRoute);
    };

    const warmPerformanceExperience = () => {
      cancelScheduledWork();

      const mode = getActiveMode();
      if (document.visibilityState !== "visible") {
        detachIntentListeners();
        return;
      }

      // Standard mode stays lightweight: no automatic bulk warmup, but the next
      // page or form is fetched as soon as the user shows navigation intent.
      attachIntentListeners();
      if (!isPerformanceAnimationMode(mode)) return;

      const warm = () => runBoundedWarmup(mode);

      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(warm, {
          timeout: mode === "none" ? 180 : 320,
        });
      } else {
        timeoutHandle = globalThis.setTimeout(
          warm,
          mode === "none" ? 24 : 80,
        );
      }
    };

    const handleAnimationModeChange = () => {
      warmPerformanceExperience();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        warmPerformanceExperience();
      } else {
        cancelScheduledWork();
        detachIntentListeners();
      }
    };

    warmPerformanceExperience();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      ANIMATION_MODE_CHANGE_EVENT,
      handleAnimationModeChange,
    );

    return () => {
      cancelScheduledWork();
      detachIntentListeners();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        ANIMATION_MODE_CHANGE_EVENT,
        handleAnimationModeChange,
      );
    };
  }, [insideDashboard, pathname, router]);

  return null;
}
