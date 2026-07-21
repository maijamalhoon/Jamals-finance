"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import HeaderSearchAutoClose from "@/components/layout/HeaderSearchAutoClose";
import MobileHeaderSearchEnhancer from "@/components/layout/MobileHeaderSearchEnhancer";

const DesktopHeader = dynamic(() => import("@/components/layout/Header"), {
  ssr: false,
});

const CompactHeader = dynamic(
  () => import("@/components/layout/MobileHeader"),
  { ssr: false },
);

const DESKTOP_HEADER_SEARCH_TRIGGER_SELECTOR = "[data-header-search-trigger]";
const MOBILE_HEADER_SEARCH_TRIGGER_SELECTOR =
  'form[data-mobile-control-cluster][role="search"] button[aria-expanded]';

type HeaderMode = "desktop" | "compact" | null;

type ResponsiveDashboardHeaderProps = {
  notificationSlot: ReactNode;
};

function HeaderSearchOpenFallback() {
  useEffect(() => {
    const isSearchOpen = (trigger: HTMLButtonElement) => {
      const input = trigger
        .closest("form")
        ?.querySelector<HTMLInputElement>(
          "#desktop-inline-transaction-search",
        );

      return input?.getAttribute("aria-hidden") === "false";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const trigger = event.target.closest<HTMLButtonElement>(
        DESKTOP_HEADER_SEARCH_TRIGGER_SELECTOR,
      );

      if (!trigger || isSearchOpen(trigger)) return;

      // Desktop keeps the trusted pointer fallback because its search surface
      // does not move underneath the active pointer.
      event.preventDefault();
      trigger.click();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return null;
}

function MobileSearchPointerDownGuard() {
  useEffect(() => {
    let boundCleanup: (() => void) | null = null;
    let mountObserver: MutationObserver | null = null;

    const bindTrigger = () => {
      const trigger = document.querySelector<HTMLButtonElement>(
        MOBILE_HEADER_SEARCH_TRIGGER_SELECTOR,
      );

      if (!trigger) return false;

      const handlePointerDown = (event: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return;

        // The mobile search expands and moves. Prevent the legacy pointer-down
        // enhancer from opening it before pointer-up; the normal click remains
        // untouched and becomes the single reliable open action.
        event.stopImmediatePropagation();
      };

      trigger.addEventListener("pointerdown", handlePointerDown, true);
      boundCleanup = () => {
        trigger.removeEventListener("pointerdown", handlePointerDown, true);
      };

      return true;
    };

    if (!bindTrigger()) {
      mountObserver = new MutationObserver(() => {
        if (!bindTrigger()) return;
        mountObserver?.disconnect();
        mountObserver = null;
      });
      mountObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      mountObserver?.disconnect();
      boundCleanup?.();
    };
  }, []);

  return null;
}

export default function ResponsiveDashboardHeader({
  notificationSlot,
}: ResponsiveDashboardHeaderProps) {
  const [mode, setMode] = useState<HeaderMode>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateMode = () => {
      setMode(mediaQuery.matches ? "desktop" : "compact");
    };

    updateMode();
    mediaQuery.addEventListener("change", updateMode);

    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  if (mode === null) {
    return (
      <div
        aria-hidden="true"
        className="min-h-0 shrink-0 print:hidden lg:min-h-[88px]"
      />
    );
  }

  if (mode === "desktop") {
    return (
      <div className="jf-dashboard-header-wrap shrink-0 print:hidden">
        <style jsx global>{`
          @media (min-width: 1024px) {
            .jf-dashboard-header-wrap,
            .jf-dashboard-header-wrap .jf-desktop-header {
              border: 0 !important;
              background: var(--background) !important;
              box-shadow: none !important;
            }

            .jf-dashboard-header-wrap .jf-desktop-header > div {
              border: 0 !important;
            }
          }
        `}</style>
        <HeaderSearchOpenFallback />
        <DesktopHeader notificationSlot={notificationSlot} />
        <HeaderSearchAutoClose />
      </div>
    );
  }

  return (
    <>
      <MobileSearchPointerDownGuard />
      <CompactHeader notificationSlot={notificationSlot} />
      <MobileHeaderSearchEnhancer />
    </>
  );
}
