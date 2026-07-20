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

type PrimedSearchStyles = {
  controlWidth: string;
  inputWidth: string;
  inputFlex: string;
  inputOpacity: string;
  inputPointerEvents: string;
  inputTabIndex: number;
  inputAriaHidden: string | null;
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
    let focusFrame: number | null = null;
    let focusTimer: number | null = null;
    let releaseFrame: number | null = null;
    let primedStyles: PrimedSearchStyles | null = null;
    let focusSequence = 0;
    let closing = false;

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

    const cancelFocusWork = () => {
      focusSequence += 1;

      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame);
        focusFrame = null;
      }

      if (focusTimer !== null) {
        window.clearTimeout(focusTimer);
        focusTimer = null;
      }
    };

    const verifyFocusAfterOpen = () => {
      const sequence = ++focusSequence;

      queueMicrotask(() => {
        if (sequence !== focusSequence || !isSearchOpen() || closing) return;
        focusSearchInput(false);

        focusFrame = window.requestAnimationFrame(() => {
          focusFrame = null;
          if (sequence !== focusSequence || !isSearchOpen() || closing) return;
          focusSearchInput(false);

          focusTimer = window.setTimeout(() => {
            focusTimer = null;
            if (sequence !== focusSequence || !isSearchOpen() || closing) return;
            focusSearchInput(false);
          }, 90);
        });
      });
    };

    const cancelAutoClose = () => {
      if (closeTimer === null) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    };

    const restorePrimedStyles = () => {
      if (!primedStyles) return;

      searchControl.style.width = primedStyles.controlWidth;
      input.style.width = primedStyles.inputWidth;
      input.style.flex = primedStyles.inputFlex;
      input.style.opacity = primedStyles.inputOpacity;
      input.style.pointerEvents = primedStyles.inputPointerEvents;

      if (isSearchOpen()) {
        input.tabIndex = 0;
        input.setAttribute("aria-hidden", "false");
      } else {
        input.tabIndex = primedStyles.inputTabIndex;
        if (primedStyles.inputAriaHidden === null) {
          input.removeAttribute("aria-hidden");
        } else {
          input.setAttribute("aria-hidden", primedStyles.inputAriaHidden);
        }
      }

      primedStyles = null;
    };

    const primeAndFocusSearch = () => {
      if (!primedStyles) {
        primedStyles = {
          controlWidth: searchControl.style.width,
          inputWidth: input.style.width,
          inputFlex: input.style.flex,
          inputOpacity: input.style.opacity,
          inputPointerEvents: input.style.pointerEvents,
          inputTabIndex: input.tabIndex,
          inputAriaHidden: input.getAttribute("aria-hidden"),
        };
      }

      closing = false;
      searchControl.style.width = "min(26.25rem, calc(100vw - 2rem))";
      input.style.width = "auto";
      input.style.flex = "1 1 auto";
      input.style.opacity = "1";
      input.style.pointerEvents = "auto";
      input.tabIndex = 0;
      input.setAttribute("aria-hidden", "false");

      focusSearchInput(true);
    };

    const dismissKeyboard = () => {
      closing = true;
      cancelFocusWork();
      input.blur();

      try {
        virtualKeyboard?.hide?.();
      } catch {
        // Blur remains the cross-browser fallback.
      }
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
        closing = false;

        if (releaseFrame !== null) window.cancelAnimationFrame(releaseFrame);
        releaseFrame = window.requestAnimationFrame(() => {
          releaseFrame = null;
          restorePrimedStyles();
          verifyFocusAfterOpen();
          scheduleAutoClose();
        });
        return;
      }

      cancelAutoClose();
      dismissKeyboard();
      restorePrimedStyles();
    };

    const handleOpenPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || isSearchOpen()) return;
      primeAndFocusSearch();
    };

    const handleOpenClick = () => {
      closing = false;
      verifyFocusAfterOpen();
    };

    const handleInput = () => {
      if (input.value.trim()) {
        cancelAutoClose();
        return;
      }

      scheduleAutoClose();
    };

    const handleInputBlur = () => {
      if (!isSearchOpen() || closing) return;

      queueMicrotask(() => {
        if (!isSearchOpen() || closing || document.activeElement === input) return;
        focusSearchInput(false);
        verifyFocusAfterOpen();
      });
    };

    const handleClosePointerDown = () => {
      closing = true;
      cancelFocusWork();
    };

    const handleCloseClick = () => {
      cancelAutoClose();
      dismissKeyboard();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismissKeyboard();
    };

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!isSearchOpen()) return;
      if (event.target instanceof Node && searchControl.contains(event.target)) {
        return;
      }

      closing = true;
      cancelFocusWork();
    };

    const openStateObserver = new MutationObserver(syncOpenState);
    openStateObserver.observe(searchControl, {
      attributes: true,
      attributeFilter: ["data-open"],
    });

    openButton.addEventListener("pointerdown", handleOpenPointerDown);
    openButton.addEventListener("click", handleOpenClick);
    input.addEventListener("input", handleInput);
    input.addEventListener("blur", handleInputBlur);
    input.addEventListener("keydown", handleKeyDown);
    closeButton.addEventListener("pointerdown", handleClosePointerDown);
    closeButton.addEventListener("click", handleCloseClick);
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    syncOpenState();

    return () => {
      cancelAutoClose();
      dismissKeyboard();
      restorePrimedStyles();
      openStateObserver.disconnect();
      if (releaseFrame !== null) window.cancelAnimationFrame(releaseFrame);
      openButton.removeEventListener("pointerdown", handleOpenPointerDown);
      openButton.removeEventListener("click", handleOpenClick);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("blur", handleInputBlur);
      input.removeEventListener("keydown", handleKeyDown);
      closeButton.removeEventListener("pointerdown", handleClosePointerDown);
      closeButton.removeEventListener("click", handleCloseClick);
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, []);

  return (
    <style jsx global>{`
      #transaction-page-search {
        appearance: textfield;
        -webkit-appearance: textfield;
        caret-color: var(--brand);
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
