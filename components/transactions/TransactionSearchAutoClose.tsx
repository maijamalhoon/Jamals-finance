"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;
const RESETTABLE_TRANSACTION_PARAMS = [
  "search",
  "type",
  "from",
  "to",
  "period",
  "source",
  "category",
  "account",
  "person",
  "item",
  "min",
  "max",
  "sort",
  "limit",
] as const;

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
      const hadResettableParams = RESETTABLE_TRANSACTION_PARAMS.some((param) =>
        url.searchParams.has(param),
      );

      if (hadResettableParams) {
        RESETTABLE_TRANSACTION_PARAMS.forEach((param) => {
          url.searchParams.delete(param);
        });
        window.location.replace(`${url.pathname}${url.search}${url.hash}`);
        return;
      }
    }

    const virtualKeyboard = (navigator as NavigatorWithVirtualKeyboard)
      .virtualKeyboard;

    input.inputMode = "search";
    input.enterKeyHint = "search";

    let closeTimer: number | null = null;
    let openFrame: number | null = null;
    let verificationFrame: number | null = null;
    let primeFrame: number | null = null;
    let focusSequence = 0;

    const isSearchOpen = () => searchControl.dataset.open === "true";

    const placeCaret = () => {
      try {
        const caretPosition = input.value.length;
        input.setSelectionRange(caretPosition, caretPosition);
      } catch {
        // Selection APIs can be unavailable on a few older mobile engines.
      }
    };

    const focusSearchInput = (showKeyboard = true) => {
      input.focus({ preventScroll: true });
      placeCaret();

      if (!showKeyboard) return;

      try {
        virtualKeyboard?.show?.();
      } catch {
        // Native focus remains the fallback when the API is unavailable.
      }
    };

    const cancelFocusVerification = () => {
      focusSequence += 1;
      if (verificationFrame !== null) {
        window.cancelAnimationFrame(verificationFrame);
        verificationFrame = null;
      }
    };

    const verifyFocusAfterOpen = () => {
      const sequence = ++focusSequence;

      queueMicrotask(() => {
        if (sequence !== focusSequence || !isSearchOpen()) return;
        focusSearchInput();

        verificationFrame = window.requestAnimationFrame(() => {
          verificationFrame = null;
          if (sequence !== focusSequence || !isSearchOpen()) return;
          focusSearchInput();
        });
      });
    };

    const dismissKeyboard = () => {
      cancelFocusVerification();
      input.blur();

      try {
        virtualKeyboard?.hide?.();
      } catch {
        // Blur remains the cross-browser fallback.
      }
    };

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

      if (!isSearchOpen()) input.tabIndex = -1;
    };

    const primeAndFocusSearch = () => {
      if (primeFrame !== null) window.cancelAnimationFrame(primeFrame);

      const controlWidth = searchControl.style.width;
      const inputWidth = input.style.width;
      const inputFlex = input.style.flex;
      const inputOpacity = input.style.opacity;
      const inputPointerEvents = input.style.pointerEvents;

      // Make the input focusable during the original user gesture. React then
      // opens the authored search UI and the verification pass keeps the caret.
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
      if (!isSearchOpen() || input.value.trim()) return;

      closeTimer = window.setTimeout(() => {
        closeTimer = null;

        if (isSearchOpen() && !input.value.trim()) {
          dismissKeyboard();
          closeButton.click();
        }
      }, AUTO_CLOSE_DELAY_MS);
    };

    const syncOpenState = () => {
      if (isSearchOpen()) {
        verifyFocusAfterOpen();
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
      primeAndFocusSearch();
      verifyFocusAfterOpen();

      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      openFrame = window.requestAnimationFrame(() => {
        openFrame = null;
        if (!isSearchOpen()) return;
        focusSearchInput();
        scheduleAutoClose();
      });
    };

    const handleInput = () => {
      placeCaret();

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
      openStateObserver.disconnect();
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      if (primeFrame !== null) window.cancelAnimationFrame(primeFrame);
      openButton.removeEventListener("click", handleOpen);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKeyDown);
      closeButton.removeEventListener("click", handleClose);
    };
  }, []);

  return (
    <style jsx global>{`
      #transaction-page-search {
        appearance: textfield;
        -webkit-appearance: textfield;
      }

      #transaction-page-search::-webkit-search-decoration,
      #transaction-page-search::-webkit-search-cancel-button,
      #transaction-page-search::-webkit-search-results-button,
      #transaction-page-search::-webkit-search-results-decoration {
        display: none;
        -webkit-appearance: none;
      }
    `}</style>
  );
}
