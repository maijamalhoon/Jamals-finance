"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const GlobalAccountAmountMaxAuthority = dynamic(
  () => import("@/components/forms/GlobalAccountAmountMaxAuthority"),
);
const GlobalFormActionAuthority = dynamic(
  () => import("@/components/forms/GlobalFormActionAuthority"),
);
const GlobalFormAuditAuthority = dynamic(
  () => import("@/components/forms/GlobalFormAuditAuthority"),
);
const GlobalFormDialogAuthority = dynamic(
  () => import("@/components/forms/GlobalFormDialogAuthority"),
);
const GlobalFormFieldAuthority = dynamic(
  () => import("@/components/forms/GlobalFormFieldAuthority"),
);
const AndroidAppManager = dynamic(
  () => import("@/components/pwa/AndroidAppManager"),
);
const AppUpdateManager = dynamic(
  () => import("@/components/pwa/AppUpdateManager"),
);
const WindowsAppManager = dynamic(
  () => import("@/components/pwa/WindowsAppManager"),
);
const AcceleratedMotionPerformance = dynamic(
  () => import("@/components/performance/AcceleratedMotionPerformance"),
);

declare global {
  interface Window {
    __jamalsFinancePwaRegistered?: boolean;
  }
}

const EDITABLE_TEXT_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"])',
  "textarea",
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
].join(",");

function canUseServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return window.location.protocol === "https:" || isLocalhost;
}

export default function PWARegister() {
  const pathname = usePathname();
  const [deferredRuntimeReady, setDeferredRuntimeReady] = useState(false);
  const needsFormRuntime = pathname !== "/";

  useEffect(() => {
    const allowTextSelection = (event: Event) => {
      event.stopPropagation();
    };

    const allowEditableContextMenu = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(EDITABLE_TEXT_SELECTOR)) return;

      event.stopPropagation();
    };

    window.addEventListener("selectstart", allowTextSelection, true);
    window.addEventListener("contextmenu", allowEditableContextMenu, true);

    return () => {
      window.removeEventListener("selectstart", allowTextSelection, true);
      window.removeEventListener("contextmenu", allowEditableContextMenu, true);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;

    const enableDeferredRuntime = () => {
      idleHandle = null;
      fallbackHandle = null;
      if (!cancelled) setDeferredRuntimeReady(true);
    };

    const scheduleDeferredRuntime = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(enableDeferredRuntime, {
          timeout: 1_500,
        });
        return;
      }

      fallbackHandle = window.setTimeout(enableDeferredRuntime, 250);
    };

    if (document.readyState === "complete") {
      scheduleDeferredRuntime();
    } else {
      window.addEventListener("load", scheduleDeferredRuntime, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleDeferredRuntime);
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (fallbackHandle !== null) window.clearTimeout(fallbackHandle);
    };
  }, []);

  useEffect(() => {
    if (!canUseServiceWorker()) return;
    if (window.__jamalsFinancePwaRegistered) return;

    window.__jamalsFinancePwaRegistered = true;

    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toast.info("New Jamal's Finance update is ready.", {
                description: "Update to use the latest version.",
                action: {
                  label: "Update",
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        });

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          onControllerChange,
        );
      } catch (error) {
        console.warn("PWA service worker registration failed:", error);
      }
    };

    window.addEventListener("load", registerServiceWorker, { once: true });

    return () => {
      window.removeEventListener("load", registerServiceWorker);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return (
    <>
      {needsFormRuntime ? (
        <>
          <GlobalFormAuditAuthority />
          <GlobalFormDialogAuthority />
          <GlobalFormFieldAuthority />
          <GlobalFormActionAuthority />
          <GlobalAccountAmountMaxAuthority />
        </>
      ) : null}
      {deferredRuntimeReady ? (
        <>
          <AcceleratedMotionPerformance />
          <AndroidAppManager />
          <WindowsAppManager />
          <AppUpdateManager />
        </>
      ) : null}
    </>
  );
}
