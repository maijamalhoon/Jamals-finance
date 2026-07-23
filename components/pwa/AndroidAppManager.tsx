"use client";

import { Download, Globe2, Smartphone } from "@/components/icons/jalvoro/compat";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ANDROID_RELEASE_FALLBACK,
  compareVersions,
  type AndroidRelease,
} from "@/lib/app-release";

const CURRENT_WRAPPER_VERSION = "1.0.1";
const RELEASE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const INSTALLED_VERSION_KEY = "jamals-finance-android-installed-version";
const DISMISSED_VERSION_KEY = "jamals-finance-android-prompt-dismissed-version";

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent);
}

function isStandaloneExperience() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function isTrustedWebActivityLaunch() {
  const query = new URLSearchParams(window.location.search);

  return (
    document.referrer.startsWith("android-app://") ||
    (query.get("source") === "twa" && isStandaloneExperience())
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AndroidAppManager() {
  const pathname = usePathname();
  const [release, setRelease] = useState<AndroidRelease>(
    ANDROID_RELEASE_FALLBACK,
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const downloadButtonRef = useRef<HTMLAnchorElement>(null);
  const updateToastVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRelease = async () => {
      try {
        const response = await fetch("/api/app-release/android", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) return;
        const nextRelease = (await response.json()) as AndroidRelease;

        if (
          !cancelled &&
          nextRelease.version &&
          nextRelease.apkUrl &&
          Number.isFinite(nextRelease.versionCode)
        ) {
          setRelease(nextRelease);
        }
      } catch {
        // The embedded fallback keeps the official current APK available.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadRelease();
    };

    const onFocus = () => void loadRelease();

    void loadRelease();
    const interval = window.setInterval(
      loadRelease,
      RELEASE_CHECK_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!isAndroidDevice() || !isTrustedWebActivityLaunch()) return;

    const query = new URLSearchParams(window.location.search);
    const declaredVersion = query.get("appVersion")?.trim();
    const storedVersion = window.localStorage.getItem(INSTALLED_VERSION_KEY);

    if (declaredVersion) {
      window.localStorage.setItem(INSTALLED_VERSION_KEY, declaredVersion);
    } else if (!storedVersion) {
      window.localStorage.setItem(
        INSTALLED_VERSION_KEY,
        CURRENT_WRAPPER_VERSION,
      );
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setShowPrompt(false);
      return;
    }

    if (!isAndroidDevice() || isStandaloneExperience()) return;
    if (window.localStorage.getItem(INSTALLED_VERSION_KEY)) return;

    const dismissedVersion = window.localStorage.getItem(
      DISMISSED_VERSION_KEY,
    );
    if (dismissedVersion === release.version) return;

    const timer = window.setTimeout(() => setShowPrompt(true), 650);
    return () => window.clearTimeout(timer);
  }, [pathname, release.version]);

  useEffect(() => {
    if (!isAndroidDevice() || !isStandaloneExperience()) return;

    const installedVersion = window.localStorage.getItem(INSTALLED_VERSION_KEY);
    if (!installedVersion) return;
    if (compareVersions(release.version, installedVersion) <= 0) return;
    if (updateToastVersionRef.current === release.version) return;

    updateToastVersionRef.current = release.version;
    toast.info(`Mobile app update ${release.version} is ready.`, {
      description:
        "Tap Update, then approve Android's install confirmation. Your data stays safe.",
      duration: 20_000,
      action: {
        label: "Update",
        onClick: () => window.location.assign(release.apkUrl),
      },
    });
  }, [release]);

  useEffect(() => {
    if (!showPrompt) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    downloadButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.localStorage.setItem(DISMISSED_VERSION_KEY, release.version);
      setShowPrompt(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [release.version, showPrompt]);

  const continueOnBrowser = () => {
    window.localStorage.setItem(DISMISSED_VERSION_KEY, release.version);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-16 sm:items-center sm:p-6"
      role="presentation"
    >
      <section
        aria-describedby="android-app-description"
        aria-labelledby="android-app-title"
        aria-modal="true"
        className="w-full max-w-md rounded-[28px] bg-background p-5 text-text-primary shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6"
        role="dialog"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-info/12 text-info"
          >
            <Smartphone size={26} strokeWidth={2.1} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-info">
              Mobile app
            </p>
            <h2
              className="mt-1 text-xl font-bold tracking-tight text-text-primary"
              id="android-app-title"
            >
              Get Jamal&apos;s Finance
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-text-secondary"
              id="android-app-description"
            >
              Install the official Android app or continue using the same secure
              finance workspace in your browser.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-text-secondary">
          <span>Latest version {release.version}</span>
          {formatFileSize(release.fileSizeBytes) ? (
            <>
              <span aria-hidden="true">•</span>
              <span>{formatFileSize(release.fileSizeBytes)}</span>
            </>
          ) : null}
          <span aria-hidden="true">•</span>
          <span>{release.minimumAndroid}+</span>
        </div>

        <div className="mt-5 grid gap-2.5">
          <a
            className="primary-action finance-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl"
            href={release.apkUrl}
            onClick={() => setShowPrompt(false)}
            ref={downloadButtonRef}
          >
            <Download aria-hidden="true" size={18} />
            Download for Mobile
          </a>

          <button
            className="finance-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black/5 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-black/8 dark:bg-white/8 dark:hover:bg-white/12"
            onClick={continueOnBrowser}
            type="button"
          >
            <Globe2 aria-hidden="true" size={18} />
            Continue on Browser
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-5 text-text-secondary">
          The download button always resolves the latest published official APK.
        </p>
      </section>
    </div>
  );
}
