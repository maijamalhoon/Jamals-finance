"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import AndroidAppManager from "@/components/pwa/AndroidAppManager";
import AppUpdateManager from "@/components/pwa/AppUpdateManager";
import WindowsAppManager from "@/components/pwa/WindowsAppManager";
import AcceleratedMotionPerformance from "@/components/performance/AcceleratedMotionPerformance";

declare global {
  interface Window {
    __jamalsFinancePwaRegistered?: boolean;
  }
}

function canUseServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return window.location.protocol === "https:" || isLocalhost;
}

export default function PWARegister() {
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
      <AcceleratedMotionPerformance />
      <AndroidAppManager />
      <WindowsAppManager />
      <AppUpdateManager />
    </>
  );
}
