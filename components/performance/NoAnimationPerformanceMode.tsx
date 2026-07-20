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

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
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
  const connection = (navigator as NavigatorWithConnection).connection;
  const effectiveType = connection?.effectiveType ?? "unknown";
  const constrained =
    connection?.saveData === true ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g";
  const moderate = effectiveType === "3g";

  return {
    allowed: !constrained,
    routeLimit:
      mode === "none" ? (moderate ? 2 : 5) : moderate ? 1 : 3,
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

    const getActiveMode = () => getDocumentAnimationMode();

    const prefetchRoute = (href: string) => {
      if (
        !isPerformanceAnimationMode(getActiveMode()) ||
        href === pathname ||
        prefetchedDashboardRoutes.has(href)
      ) {
        return;
      }

      prefetchedDashboardRoutes.add(href);

      try {
        router.prefetch(href);
      } catch {
        // A later direct navigation still works; allow a future intent to retry.
        prefetchedDashboardRoutes.delete(href);
      }
    };

    const preloadModal = (key: DashboardModalKey) => {
      if (!isPerformanceAnimationMode(getActiveMode())) return;
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
      if (
        !isPerformanceAnimationMode(mode) ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

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

    const handleUserIntent = (event: Event) => {
      const href = getDashboardHref(event.target);
      if (href) prefetchRoute(href);

      const modalKey = getModalIntent(event.target);
      if (modalKey) preloadModal(modalKey);
    };

    const handleAnimationModeChange = (event: Event) => {
      const nextMode = (event as CustomEvent<AnimationMode>).detail;
      if (isPerformanceAnimationMode(nextMode)) warmPerformanceExperience();
      else cancelScheduledWork();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") warmPerformanceExperience();
      else cancelScheduledWork();
    };

    warmPerformanceExperience();

    document.addEventListener("pointerover", handleUserIntent, true);
    document.addEventListener("pointerdown", handleUserIntent, true);
    document.addEventListener("focusin", handleUserIntent, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      ANIMATION_MODE_CHANGE_EVENT,
      handleAnimationModeChange,
    );

    return () => {
      cancelScheduledWork();
      document.removeEventListener("pointerover", handleUserIntent, true);
      document.removeEventListener("pointerdown", handleUserIntent, true);
      document.removeEventListener("focusin", handleUserIntent, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        ANIMATION_MODE_CHANGE_EVENT,
        handleAnimationModeChange,
      );
    };
  }, [insideDashboard, pathname, router]);

  return null;
}
