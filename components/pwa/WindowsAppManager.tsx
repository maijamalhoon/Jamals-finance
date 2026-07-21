"use client";

import { Download, Globe2, MonitorDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const WINDOWS_PROMPT_DISMISSED_KEY =
  "jamals-finance-windows-install-prompt-dismissed";
const WINDOWS_APP_INSTALLED_KEY = "jamals-finance-windows-app-installed";

function isWindowsDevice() {
  const navigatorWithData = window.navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  return /Windows/i.test(
    navigatorWithData.userAgentData?.platform ?? window.navigator.userAgent,
  );
}

function isStandaloneExperience() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches
  );
}

export default function WindowsAppManager() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const installButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isWindowsDevice() || isStandaloneExperience()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      window.localStorage.setItem(WINDOWS_APP_INSTALLED_KEY, "true");
      window.localStorage.removeItem(WINDOWS_PROMPT_DISMISSED_KEY);
      setShowPrompt(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setShowPrompt(false);
      return;
    }

    if (!installEvent || !isWindowsDevice() || isStandaloneExperience()) return;
    if (window.localStorage.getItem(WINDOWS_APP_INSTALLED_KEY) === "true") return;
    if (window.localStorage.getItem(WINDOWS_PROMPT_DISMISSED_KEY) === "true") {
      return;
    }

    const timer = window.setTimeout(() => setShowPrompt(true), 650);
    return () => window.clearTimeout(timer);
  }, [installEvent, pathname]);

  useEffect(() => {
    if (!showPrompt) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    installButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.localStorage.setItem(WINDOWS_PROMPT_DISMISSED_KEY, "true");
      setShowPrompt(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showPrompt]);

  const installWindowsApp = async () => {
    if (!installEvent) {
      toast.info("Install is available from your browser menu.", {
        description: "In Microsoft Edge, choose Apps → Install Jamal's Finance.",
      });
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(WINDOWS_APP_INSTALLED_KEY, "true");
      window.localStorage.removeItem(WINDOWS_PROMPT_DISMISSED_KEY);
      setShowPrompt(false);
      setInstallEvent(null);
      return;
    }

    window.localStorage.setItem(WINDOWS_PROMPT_DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  const continueOnWebsite = () => {
    window.localStorage.setItem(WINDOWS_PROMPT_DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 px-3 pb-3 pt-16 sm:items-center sm:p-6"
      role="presentation"
    >
      <section
        aria-describedby="windows-app-description"
        aria-labelledby="windows-app-title"
        aria-modal="true"
        className="w-full max-w-md rounded-[28px] bg-background p-5 text-text-primary shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6"
        role="dialog"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-info/12 text-info"
          >
            <MonitorDown size={27} strokeWidth={2.1} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-info">
              Windows app
            </p>
            <h2
              className="mt-1 text-xl font-bold tracking-tight text-text-primary"
              id="windows-app-title"
            >
              Install Jamal&apos;s Finance
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-text-secondary"
              id="windows-app-description"
            >
              Use the same secure finance workspace from your Start Menu,
              Taskbar, and desktop without a browser address bar.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2.5">
          <button
            className="primary-action finance-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl"
            onClick={() => void installWindowsApp()}
            ref={installButtonRef}
            type="button"
          >
            <Download aria-hidden="true" size={18} />
            Install Windows App
          </button>

          <button
            className="finance-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black/5 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-black/8 dark:bg-white/8 dark:hover:bg-white/12"
            onClick={continueOnWebsite}
            type="button"
          >
            <Globe2 aria-hidden="true" size={18} />
            Continue on Website
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-5 text-text-secondary">
          Installs securely through Microsoft Edge or another supported Chromium
          browser. Website updates arrive automatically.
        </p>
      </section>
    </div>
  );
}
