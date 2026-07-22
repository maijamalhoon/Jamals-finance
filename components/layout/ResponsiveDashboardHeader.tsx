"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import HeaderSearchAutoClose from "@/components/layout/HeaderSearchAutoClose";

const DesktopHeader = dynamic(() => import("@/components/layout/Header"), {
  ssr: false,
});

const CompactHeader = dynamic(
  () => import("@/components/layout/MobileHeader"),
  { ssr: false },
);

const DESKTOP_HEADER_SEARCH_TRIGGER_SELECTOR = "[data-header-search-trigger]";

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

function MobileHeaderSearchStyles() {
  return (
    <style jsx global>{`
      @media (max-width: 1023px) {
        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"] {
          border-radius: clamp(1.1rem, 2.5vw, 1.45rem);
        }

        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          > button:first-child,
        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          > button:last-child {
          border-radius: 999px !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          > button:first-child {
          color: var(--text-secondary) !important;
        }

        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          input {
          color: var(--text-primary) !important;
          caret-color: var(--brand) !important;
        }
      }
    `}</style>
  );
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
      <CompactHeader notificationSlot={notificationSlot} />
      <MobileHeaderSearchStyles />
    </>
  );
}
