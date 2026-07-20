"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;

type NavigatorWithVirtualKeyboard = Navigator & {
  virtualKeyboard?: {
    show?: () => void;
    hide?: () => void;
  };
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
      let openFrame: number | null = null;

      const isSearchOpen = () => input.getAttribute("aria-hidden") === "false";

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
          // Native focus remains the fallback when the API is unavailable.
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

      const cancelAutoClose = () => {
        if (closeTimer === null) return;
        window.clearTimeout(closeTimer);
        closeTimer = null;
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
          focusSearchInput();
          scheduleAutoClose();
          return;
        }

        cancelAutoClose();
        dismissKeyboard();
      };

      const handleOpen = () => {
        // This native listener runs inside the original tap. The component also
        // commits its open state synchronously, so the cursor and keyboard start
        // without requiring a second tap inside the field.
        focusSearchInput();

        if (openFrame !== null) window.cancelAnimationFrame(openFrame);
        openFrame = window.requestAnimationFrame(() => {
          openFrame = null;
          syncOpenState();

          if (isSearchOpen()) focusSearchInput();
        });
      };

      const handleInput = () => {
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

      const stateObserver = new MutationObserver(syncOpenState);
      stateObserver.observe(input, {
        attributes: true,
        attributeFilter: ["aria-hidden"],
      });

      openButton.addEventListener("click", handleOpen);
      input.addEventListener("input", handleInput);
      input.addEventListener("keydown", handleKeyDown);
      closeButton.addEventListener("click", handleClose);
      syncOpenState();

      boundCleanup = () => {
        cancelAutoClose();
        dismissKeyboard();
        if (openFrame !== null) window.cancelAnimationFrame(openFrame);
        stateObserver.disconnect();
        openButton.removeEventListener("click", handleOpen);
        input.removeEventListener("input", handleInput);
        input.removeEventListener("keydown", handleKeyDown);
        closeButton.removeEventListener("click", handleClose);
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
