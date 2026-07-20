"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;

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

    // Keep only the app's custom close control. React can restore the JSX
    // search type during re-renders, so enforce text whenever that happens.
    const removeNativeClearControl = () => {
      if (input.type !== "text") input.type = "text";
    };

    const focusSearchInput = () => {
      input.focus({ preventScroll: true });
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    };

    const dismissKeyboard = () => {
      if (document.activeElement === input) input.blur();
    };

    removeNativeClearControl();

    const typeObserver = new MutationObserver(removeNativeClearControl);
    typeObserver.observe(input, {
      attributes: true,
      attributeFilter: ["type"],
    });

    const openStateObserver = new MutationObserver(() => {
      if (searchControl.dataset.open !== "true") dismissKeyboard();
    });
    openStateObserver.observe(searchControl, {
      attributes: true,
      attributeFilter: ["data-open"],
    });

    let closeTimer: number | null = null;
    let openFrame: number | null = null;

    const cancelAutoClose = () => {
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    };

    const scheduleAutoClose = () => {
      cancelAutoClose();
      if (input.value.trim()) return;

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

    const handleOpen = () => {
      // Focus during the original tap so mobile browsers open their keyboard.
      removeNativeClearControl();
      focusSearchInput();

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

      if (searchControl.dataset.open === "true") scheduleAutoClose();
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

    return () => {
      cancelAutoClose();
      dismissKeyboard();
      typeObserver.disconnect();
      openStateObserver.disconnect();
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      openButton.removeEventListener("click", handleOpen);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKeyDown);
      closeButton.removeEventListener("click", handleClose);
    };
  }, []);

  return null;
}
