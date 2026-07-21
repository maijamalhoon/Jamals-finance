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

const HEADER_SEARCH_TRIGGER_SELECTOR = [
  "[data-header-search-trigger]",
  'form[data-mobile-control-cluster][role="search"] button[aria-expanded]',
].join(",");

type HeaderMode = "desktop" | "compact" | null;

type ResponsiveDashboardHeaderProps = {
  notificationSlot: ReactNode;
};

function HeaderSearchOpenFallback() {
  useEffect(() => {
    const isSearchOpen = (trigger: HTMLButtonElement) => {
      if (trigger.hasAttribute("data-header-search-trigger")) {
        const input = trigger
          .closest("form")
          ?.querySelector<HTMLInputElement>(
            "#desktop-inline-transaction-search",
          );

        return input?.getAttribute("aria-hidden") === "false";
      }

      return trigger.getAttribute("aria-expanded") === "true";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const trigger = event.target.closest<HTMLButtonElement>(
        HEADER_SEARCH_TRIGGER_SELECTOR,
      );

      if (!trigger || isSearchOpen(trigger)) return;

      // Open immediately while the pointer interaction is still trusted.
      // This avoids mobile/desktop browsers suppressing the later click.
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
      <HeaderSearchOpenFallback />
      <CompactHeader notificationSlot={notificationSlot} />
      <MobileHeaderSearchEnhancer />
    </>
  );
}
