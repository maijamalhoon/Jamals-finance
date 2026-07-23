"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { APP_NAME } from "@/lib/brand";

type AppVersionResponse = {
  version: string;
};

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function isInstalledExperience() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    document.referrer.startsWith("android-app://")
  );
}

export default function AppUpdateManager() {
  const baselineVersionRef = useRef<string | null>(null);
  const notifiedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isInstalledExperience()) return;

    let cancelled = false;

    const checkForUpdate = async () => {
      try {
        const response = await fetch("/api/app-version", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) return;

        const payload = (await response.json()) as AppVersionResponse;
        const nextVersion = payload.version?.trim();
        if (!nextVersion || nextVersion === "development" || cancelled) return;

        if (!baselineVersionRef.current) {
          baselineVersionRef.current = nextVersion;
          return;
        }

        if (baselineVersionRef.current === nextVersion) return;
        if (notifiedVersionRef.current === nextVersion) return;

        notifiedVersionRef.current = nextVersion;
        toast.info("App update is ready.", {
          description: `Update now to load the latest ${APP_NAME} version.`,
          duration: 20_000,
          action: {
            label: "Update",
            onClick: async () => {
              baselineVersionRef.current = nextVersion;

              try {
                const registration =
                  await navigator.serviceWorker?.getRegistration();
                await registration?.update();
              } finally {
                window.location.reload();
              }
            },
          },
        });
      } catch {
        // A temporary network failure must never interrupt the installed app.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };

    const onFocus = () => void checkForUpdate();

    void checkForUpdate();
    const interval = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
