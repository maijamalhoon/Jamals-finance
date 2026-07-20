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

type HeaderMode = "desktop" | "compact" | null;

type ResponsiveDashboardHeaderProps = {
  notificationSlot: ReactNode;
};

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
        <DesktopHeader notificationSlot={notificationSlot} />
        <HeaderSearchAutoClose />
      </div>
    );
  }

  return <CompactHeader notificationSlot={notificationSlot} />;
}
