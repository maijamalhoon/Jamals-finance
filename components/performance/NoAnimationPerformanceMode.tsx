"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ANIMATION_MODE_CHANGE_EVENT,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";
import { preloadDashboardModals } from "@/lib/dashboard-modal-loaders";
import { NAV_ITEMS } from "@/lib/navigation";

const DASHBOARD_ROUTES = Array.from(
  new Set(NAV_ITEMS.map((item) => item.href)),
);

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

function isPerformanceAnimationMode(mode: AnimationMode) {
  return mode === "fast" || mode === "none";
}

export default function AnimationPerformanceMode() {
  const pathname = usePathname();
  const router = useRouter();
  const insideDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    if (!insideDashboard) return;

    const prefetchedRoutes = new Set<string>();
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null = null;

    const getActiveMode = () => getDocumentAnimationMode();

    const prefetchRoute = (href: string) => {
      if (
        !isPerformanceAnimationMode(getActiveMode()) ||
        prefetchedRoutes.has(href)
      ) {
        return;
      }

      prefetchedRoutes.add(href);
      router.prefetch(href);
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

    const warmPerformanceExperience = () => {
      cancelScheduledWork();

      const mode = getActiveMode();
      if (!isPerformanceAnimationMode(mode)) return;

      // Warm every dashboard form chunk immediately. Both accelerated modes
      // keep the first form tap from waiting on a lazy bundle download.
      void preloadDashboardModals();

      const prefetchAllRoutes = () => {
        DASHBOARD_ROUTES.forEach(prefetchRoute);
      };

      if (mode === "none") {
        timeoutHandle = globalThis.setTimeout(prefetchAllRoutes, 0);
        return;
      }

      // Fast mode keeps its visible motion, while route data/chunks are warmed
      // as soon as the main thread has a small opening.
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(prefetchAllRoutes, {
          timeout: 160,
        });
      } else {
        timeoutHandle = globalThis.setTimeout(prefetchAllRoutes, 40);
      }
    };

    const handleNavigationIntent = (event: Event) => {
      const href = getDashboardHref(event.target);
      if (href) prefetchRoute(href);
    };

    const handleAnimationModeChange = (event: Event) => {
      const nextMode = (event as CustomEvent<AnimationMode>).detail;
      if (isPerformanceAnimationMode(nextMode)) warmPerformanceExperience();
      else cancelScheduledWork();
    };

    warmPerformanceExperience();

    document.addEventListener("pointerover", handleNavigationIntent, true);
    document.addEventListener("focusin", handleNavigationIntent, true);
    document.addEventListener("touchstart", handleNavigationIntent, {
      capture: true,
      passive: true,
    });
    window.addEventListener(
      ANIMATION_MODE_CHANGE_EVENT,
      handleAnimationModeChange,
    );

    return () => {
      cancelScheduledWork();
      document.removeEventListener("pointerover", handleNavigationIntent, true);
      document.removeEventListener("focusin", handleNavigationIntent, true);
      document.removeEventListener("touchstart", handleNavigationIntent, true);
      window.removeEventListener(
        ANIMATION_MODE_CHANGE_EVENT,
        handleAnimationModeChange,
      );
    };
  }, [insideDashboard, router]);

  return null;
}