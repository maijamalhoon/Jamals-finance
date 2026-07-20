"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;

type NavigatorWithVirtualKeyboard = Navigator & {
  virtualKeyboard?: {
    show?: () => void;
    hide?: () => void;
  };
};

type PrimedInputStyles = {
  width: string;
  flex: string;
  opacity: string;
  pointerEvents: string;
  tabIndex: number;
  ariaHidden: string | null;
};

export default function MobileHeaderSearchEnhancer() {
  useEffect(() => {
    let boundCleanup: (() => void) | null = null;
    let mountObserver: MutationObserver | null = null;

    const bindSearch = () => {
      const input = document.getElementById(
        "mobile-inline-transaction-search",
      ) as HTMLInputElement | null;
      const searchForm = input?.closest<HTMLFormElement>(
        'form[data-mobile-control-cluster][role="search"]',
      );
      const openButton = searchForm?.querySelector<HTMLButtonElement>(
        'button[aria-expanded]',
      );
      const closeButton = searchForm?.querySelector<HTMLButtonElement>(
        'button[aria-label="Close transaction search"]',
      );

      if (!input || !searchForm || !openButton || !closeButton) return false;
      if (searchForm.dataset.mobileSearchEnhanced === "true") return true;

      searchForm.dataset.mobileSearchEnhanced = "true";
      input.inputMode = "search";
      input.enterKeyHint = "search";

      const virtualKeyboard = (navigator as NavigatorWithVirtualKeyboard)
        .virtualKeyboard;

      let closeTimer: number | null = null;
      let focusFrame: number | null = null;
      let focusTimer: number | null = null;
      let releaseFrame: number | null = null;
      let primedStyles: PrimedInputStyles | null = null;
      let focusSequence = 0;
      let closing = false;

      const isSearchOpen = () =>
        openButton.getAttribute("aria-expanded") === "true";

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
              if (sequence !== focusSequence || !isSearchOpen() || closing) {
                return;
              }
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

        input.style.width = primedStyles.width;
        input.style.flex = primedStyles.flex;
        input.style.opacity = primedStyles.opacity;
        input.style.pointerEvents = primedStyles.pointerEvents;

        if (isSearchOpen()) {
          input.tabIndex = 0;
          if (input.getAttribute("aria-hidden") !== "false") {
            input.setAttribute("aria-hidden", "false");
          }
        } else {
          input.tabIndex = primedStyles.tabIndex;
          if (primedStyles.ariaHidden === null) {
            input.removeAttribute("aria-hidden");
          } else {
            input.setAttribute("aria-hidden", primedStyles.ariaHidden);
          }
        }

        primedStyles = null;
      };

      const primeAndFocusSearch = () => {
        if (!primedStyles) {
          primedStyles = {
            width: input.style.width,
            flex: input.style.flex,
            opacity: input.style.opacity,
            pointerEvents: input.style.pointerEvents,
            tabIndex: input.tabIndex,
            ariaHidden: input.getAttribute("aria-hidden"),
          };
        }

        closing = false;
        input.style.width = "1px";
        input.style.flex = "0 0 1px";
        input.style.opacity = "0.01";
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
        const open = isSearchOpen();
        searchForm.dataset.mobileSearchOpen = open ? "true" : "false";

        if (open) {
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
          if (!isSearchOpen() || closing || document.activeElement === input) {
            return;
          }
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
        if (event.target instanceof Node && searchForm.contains(event.target)) {
          return;
        }

        closing = true;
        cancelFocusWork();
      };

      const stateObserver = new MutationObserver(syncOpenState);
      stateObserver.observe(openButton, {
        attributes: true,
        attributeFilter: ["aria-expanded"],
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

      boundCleanup = () => {
        cancelAutoClose();
        dismissKeyboard();
        restorePrimedStyles();
        if (releaseFrame !== null) window.cancelAnimationFrame(releaseFrame);
        stateObserver.disconnect();
        openButton.removeEventListener("pointerdown", handleOpenPointerDown);
        openButton.removeEventListener("click", handleOpenClick);
        input.removeEventListener("input", handleInput);
        input.removeEventListener("blur", handleInputBlur);
        input.removeEventListener("keydown", handleKeyDown);
        closeButton.removeEventListener("pointerdown", handleClosePointerDown);
        closeButton.removeEventListener("click", handleCloseClick);
        document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
        delete searchForm.dataset.mobileSearchEnhanced;
        delete searchForm.dataset.mobileSearchOpen;
      };

      return true;
    };

    if (!bindSearch()) {
      mountObserver = new MutationObserver(() => {
        if (!bindSearch()) return;
        mountObserver?.disconnect();
        mountObserver = null;
      });
      mountObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      mountObserver?.disconnect();
      boundCleanup?.();
    };
  }, []);

  return (
    <style jsx global>{`
      @media (max-width: 1023px) {
        form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"] {
          border: 0 !important;
          border-radius: clamp(1.1rem, 2.5vw, 1.45rem) !important;
          background: var(--card) !important;
          box-shadow: none !important;
          backdrop-filter: blur(18px) saturate(110%) !important;
        }

        .dark
          form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"] {
          background: var(--card) !important;
          box-shadow: none !important;
        }

        form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"]
          > button:first-child,
        form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"]
          > button:last-child {
          border-radius: 999px !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"]
          > button:first-child {
          color: var(--text-secondary) !important;
        }

        form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"]
          input {
          color: var(--text-primary) !important;
          caret-color: var(--brand) !important;
        }
      }
    `}</style>
  );
}
