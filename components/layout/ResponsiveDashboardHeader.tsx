"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

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
        className="min-h-[60px] shrink-0 border-b border-border bg-surface-primary/95 print:hidden lg:min-h-[88px]"
      />
    );
  }

  if (mode === "desktop") {
    return (
      <div className="jf-dashboard-header-wrap shrink-0 print:hidden">
        <DesktopHeader notificationSlot={notificationSlot} />
      </div>
    );
  }

  return <CompactHeader notificationSlot={notificationSlot} />;
}
