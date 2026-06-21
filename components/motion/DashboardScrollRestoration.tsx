"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const storageKey = (pathname: string) => `jamal-dashboard-scroll:${pathname}`;

export default function DashboardScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    if (!scroller) return;

    const restore = window.requestAnimationFrame(() => {
      const stored = sessionStorage.getItem(storageKey(pathname));
      scroller.scrollTop = stored ? Number(stored) : 0;
    });

    const save = () => {
      sessionStorage.setItem(storageKey(pathname), String(scroller.scrollTop));
    };

    scroller.addEventListener("scroll", save, { passive: true });

    return () => {
      window.cancelAnimationFrame(restore);
      save();
      scroller.removeEventListener("scroll", save);
    };
  }, [pathname]);

  return null;
}
