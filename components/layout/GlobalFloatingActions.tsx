"use client";

import { usePathname } from "next/navigation";

import FloatingActions from "@/components/layout/FloatingActions";

function isSettingsRoute(pathname: string) {
  return (
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/settings/")
  );
}

export default function GlobalFloatingActions() {
  const pathname = usePathname();

  if (isSettingsRoute(pathname)) return null;

  return (
    <>
      <FloatingActions />
      <style jsx global>{`
        .jf-floating-actions {
          pointer-events: none;
        }

        .jf-floating-actions button,
        .jf-floating-actions [role="menu"] {
          pointer-events: auto;
        }
      `}</style>
    </>
  );
}
