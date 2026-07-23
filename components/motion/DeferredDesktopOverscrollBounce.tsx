"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DesktopOverscrollBounce = dynamic(
  () => import("@/components/motion/DesktopOverscrollBounce"),
  { ssr: false },
);

const DESKTOP_POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function DeferredDesktopOverscrollBounce() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const desktopPointer = window.matchMedia(DESKTOP_POINTER_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    let cancelled = false;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;

    const cancelPending = () => {
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (fallbackHandle !== null) window.clearTimeout(fallbackHandle);
      idleHandle = null;
      fallbackHandle = null;
    };

    const activate = () => {
      idleHandle = null;
      fallbackHandle = null;
      if (!cancelled && desktopPointer.matches && !reducedMotion.matches) {
        setEnabled(true);
      }
    };

    const schedule = () => {
      cancelPending();

      if (!desktopPointer.matches || reducedMotion.matches) {
        setEnabled(false);
        return;
      }

      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(activate, { timeout: 2_000 });
      } else {
        fallbackHandle = window.setTimeout(activate, 350);
      }
    };

    const scheduleAfterLoad = () => schedule();

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", scheduleAfterLoad, { once: true });

    desktopPointer.addEventListener("change", schedule);
    reducedMotion.addEventListener("change", schedule);

    return () => {
      cancelled = true;
      cancelPending();
      window.removeEventListener("load", scheduleAfterLoad);
      desktopPointer.removeEventListener("change", schedule);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, []);

  return enabled ? <DesktopOverscrollBounce /> : null;
}
