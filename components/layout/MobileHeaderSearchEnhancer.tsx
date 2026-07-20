"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;

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

      let closeTimer: number | null = null;
      let openFrame: number | null = null;

      const isSearchOpen = () => input.getAttribute("aria-hidden") === "false";

      const dismissKeyboard = () => {
        if (document.activeElement === input) input.blur();
      };

      const cancelAutoClose = () => {
        if (closeTimer === null) return;
        window.clearTimeout(closeTimer);
        closeTimer = null;
      };

      const syncOpenState = () => {
        const open = isSearchOpen();
        searchForm.dataset.mobileSearchOpen = open ? "true" : "false";

        if (!open) {
          cancelAutoClose();
          dismissKeyboard();
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

      const handleOpen = () => {
        if (openFrame !== null) window.cancelAnimationFrame(openFrame);
        openFrame = window.requestAnimationFrame(() => {
          openFrame = null;
          syncOpenState();
          scheduleAutoClose();
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
        syncOpenState();
      };

      const stateObserver = new MutationObserver(syncOpenState);
      stateObserver.observe(input, {
        attributes: true,
        attributeFilter: ["aria-hidden"],
      });

      openButton.addEventListener("click", handleOpen);
      input.addEventListener("input", handleInput);
      closeButton.addEventListener("click", handleClose);
      syncOpenState();

      boundCleanup = () => {
        cancelAutoClose();
        dismissKeyboard();
        if (openFrame !== null) window.cancelAnimationFrame(openFrame);
        stateObserver.disconnect();
        openButton.removeEventListener("click", handleOpen);
        input.removeEventListener("input", handleInput);
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
          box-shadow: inset 0 0 0 1px
            color-mix(in srgb, var(--border), transparent 55%) !important;
          backdrop-filter: blur(18px) saturate(110%) !important;
        }

        .dark
          form[data-mobile-control-cluster][role="search"][data-mobile-search-enhanced="true"][data-mobile-search-open="true"] {
          background: var(--card) !important;
          box-shadow: inset 0 0 0 1px
            color-mix(in srgb, var(--border), transparent 48%) !important;
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
