"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;

type NavigatorWithVirtualKeyboard = Navigator & {
  virtualKeyboard?: {
    show?: () => void;
    hide?: () => void;
  };
};

export default function TransactionSearchAutoClose() {
  useEffect(() => {
    const input = document.getElementById(
      "transaction-page-search",
    ) as HTMLInputElement | null;
    const searchControl = input?.closest<HTMLElement>(
      ".jf-transaction-search",
    );
    const openButton = searchControl?.querySelector<HTMLButtonElement>(
      'button[aria-expanded]',
    );
    const closeButton = searchControl?.querySelector<HTMLButtonElement>(
      'button[aria-label="Close search"], button[aria-label="Clear and close search"]',
    );

    if (!input || !searchControl || !openButton || !closeButton) return;

    const navigationEntries = window.performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    const legacyNavigationType = (
      window.performance as Performance & { navigation?: { type?: number } }
    ).navigation?.type;
    const pageWasReloaded =
      navigationEntries[0]?.type === "reload" || legacyNavigationType === 1;

    if (pageWasReloaded) {
      const url = new URL(window.location.href);

      if (url.searchParams.has("search")) {
        url.searchParams.delete("search");
        url.searchParams.delete("limit");
        window.location.replace(`${url.pathname}${url.search}${url.hash}`);
        return;
      }
    }

    const virtualKeyboard = (navigator as NavigatorWithVirtualKeyboard)
      .virtualKeyboard;

    // Keep only the app's custom close control. React can restore the JSX
    // search type during re-renders, so enforce text whenever that happens.
    const removeNativeClearControl = () => {
      if (input.type !== "text") input.type = "text";
      input.inputMode = "search";
      input.enterKeyHint = "search";
    };

    const focusSearchInput = () => {
      input.focus({ preventScroll: true });

      try {
        const caretPosition = input.value.length;
        input.setSelectionRange(caretPosition, caretPosition);
      } catch {
        // Selection APIs can be unavailable on a few older mobile engines.
      }

      try {
        virtualKeyboard?.show?.();
      } catch {
        // Native focus remains the fallback when the Virtual Keyboard API is absent.
      }
    };

    const dismissKeyboard = () => {
      input.blur();

      try {
        virtualKeyboard?.hide?.();
      } catch {
        // Blur remains the cross-browser fallback.
      }
    };

    removeNativeClearControl();

    const typeObserver = new MutationObserver(removeNativeClearControl);
    typeObserver.observe(input, {
      attributes: true,
      attributeFilter: ["type"],
    });

    let closeTimer: number | null = null;
    let openFrame: number | null = null;
    let primeFrame: number | null = null;

    const cancelAutoClose = () => {
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    };

    const restorePrimedStyles = (
      controlWidth: string,
      inputWidth: string,
      inputFlex: string,
      inputOpacity: string,
      inputPointerEvents: string,
    ) => {
      searchControl.style.width = controlWidth;
      input.style.width = inputWidth;
      input.style.flex = inputFlex;
      input.style.opacity = inputOpacity;
      input.style.pointerEvents = inputPointerEvents;

      if (searchControl.dataset.open !== "true") input.tabIndex = -1;
    };

    const primeAndFocusSearch = () => {
      if (primeFrame !== null) window.cancelAnimationFrame(primeFrame);

      const controlWidth = searchControl.style.width;
      const inputWidth = input.style.width;
      const inputFlex = input.style.flex;
      const inputOpacity = input.style.opacity;
      const inputPointerEvents = input.style.pointerEvents;

      // React opens the bar immediately after this native click listener. These
      // temporary inline values make the input visibly focusable during the
      // original user gesture, which reliably opens mobile keyboards.
      searchControl.style.width = "min(26.25rem, calc(100vw - 2rem))";
      input.style.width = "auto";
      input.style.flex = "1 1 auto";
      input.style.opacity = "1";
      input.style.pointerEvents = "auto";
      input.tabIndex = 0;

      focusSearchInput();

      primeFrame = window.requestAnimationFrame(() => {
        primeFrame = null;
        restorePrimedStyles(
          controlWidth,
          inputWidth,
          inputFlex,
          inputOpacity,
          inputPointerEvents,
        );
      });
    };

    const scheduleAutoClose = () => {
      cancelAutoClose();
      if (searchControl.dataset.open !== "true" || input.value.trim()) return;

      closeTimer = window.setTimeout(() => {
        closeTimer = null;

        if (
          searchControl.dataset.open === "true" &&
          !input.value.trim()
        ) {
          dismissKeyboard();
          closeButton.click();
        }
      }, AUTO_CLOSE_DELAY_MS);
    };

    const syncOpenState = () => {
      if (searchControl.dataset.open === "true") {
        removeNativeClearControl();
        focusSearchInput();
        scheduleAutoClose();
        return;
      }

      cancelAutoClose();
      dismissKeyboard();
    };

    const openStateObserver = new MutationObserver(syncOpenState);
    openStateObserver.observe(searchControl, {
      attributes: true,
      attributeFilter: ["data-open"],
    });

    const handleOpen = () => {
      removeNativeClearControl();
      primeAndFocusSearch();

      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      openFrame = window.requestAnimationFrame(() => {
        openFrame = null;
        removeNativeClearControl();
        focusSearchInput();
        scheduleAutoClose();
      });
    };

    const handleInput = () => {
      window.requestAnimationFrame(removeNativeClearControl);

      if (input.value.trim()) {
        cancelAutoClose();
        return;
      }

      scheduleAutoClose();
    };

    const handleClose = () => {
      cancelAutoClose();
      dismissKeyboard();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissKeyboard();
    };

    openButton.addEventListener("click", handleOpen);
    input.addEventListener("input", handleInput);
    input.addEventListener("keydown", handleKeyDown);
    closeButton.addEventListener("click", handleClose);
    syncOpenState();

    return () => {
      cancelAutoClose();
      dismissKeyboard();
      typeObserver.disconnect();
      openStateObserver.disconnect();
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      if (primeFrame !== null) window.cancelAnimationFrame(primeFrame);
      openButton.removeEventListener("click", handleOpen);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKeyDown);
      closeButton.removeEventListener("click", handleClose);
    };
  }, []);

  return null;
}
