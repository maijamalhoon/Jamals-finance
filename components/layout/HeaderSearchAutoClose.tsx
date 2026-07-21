"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6_000;

export default function HeaderSearchAutoClose() {
  useEffect(() => {
    let boundCleanup: (() => void) | null = null;
    let mountObserver: MutationObserver | null = null;

    const bindSearch = () => {
      const input = document.getElementById(
        "desktop-inline-transaction-search",
      ) as HTMLInputElement | null;
      const searchForm = input?.closest<HTMLFormElement>("form");
      const closeButton = searchForm?.querySelector<HTMLButtonElement>(
        'button[aria-label="Close transaction search"]',
      );

      if (!input || !searchForm || !closeButton) return false;

      let closeTimer: number | null = null;

      const isSearchOpen = () => input.getAttribute("aria-hidden") === "false";

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
            closeButton.click();
          }
        }, AUTO_CLOSE_DELAY_MS);
      };

      const syncSearchState = () => {
        if (isSearchOpen()) {
          scheduleAutoClose();
          return;
        }

        cancelAutoClose();
      };

      const handleInput = () => {
        if (input.value.trim()) {
          cancelAutoClose();
          return;
        }

        scheduleAutoClose();
      };

      const stateObserver = new MutationObserver(syncSearchState);
      stateObserver.observe(input, {
        attributes: true,
        attributeFilter: ["aria-hidden"],
      });

      input.addEventListener("input", handleInput);
      closeButton.addEventListener("click", cancelAutoClose);
      syncSearchState();

      boundCleanup = () => {
        cancelAutoClose();
        stateObserver.disconnect();
        input.removeEventListener("input", handleInput);
        closeButton.removeEventListener("click", cancelAutoClose);
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

  return null;
}
