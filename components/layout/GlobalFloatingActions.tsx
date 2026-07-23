"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPageLoaded(false);

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let revealTimer = 0;

    const revealAfterPageSettles = () => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          revealTimer = window.setTimeout(() => {
            if (!cancelled) setPageLoaded(true);
          }, 500);
        });
      });
    };

    const handleWindowLoad = () => {
      revealAfterPageSettles();
    };

    if (document.readyState === "complete") {
      revealAfterPageSettles();
    } else {
      window.addEventListener("load", handleWindowLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", handleWindowLoad);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(revealTimer);
    };
  }, [pathname]);

  if (!mounted || !pageLoaded || isSettingsRoute(pathname)) return null;

  return createPortal(
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
    </>,
    document.body,
  );
}
