"use client";

import { useEffect } from "react";

const AUTO_CLOSE_DELAY_MS = 6000;

export default function HeaderSearchAutoClose() {
  useEffect(() => {
    const input = document.getElementById(
      "desktop-inline-transaction-search",
    ) as HTMLInputElement | null;
    const searchForm = input?.closest<HTMLFormElement>("form");
    const openButton = searchForm?.querySelector<HTMLButtonElement>(
      "[data-header-search-trigger]",
    );
    const closeButton = searchForm?.querySelector<HTMLButtonElement>(
      'button[aria-label="Close transaction search"]',
    );

    if (!input || !searchForm || !openButton || !closeButton) return;

    let closeTimer: number | null = null;
    let openFrame: number | null = null;

    const isSearchOpen = () =>
      input.getAttribute("aria-hidden") === "false" && closeButton.tabIndex === 0;

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

        if (isSearchOpen() && !input.value.trim()) {
          closeButton.click();
        }
      }, AUTO_CLOSE_DELAY_MS);
    };

    const handleOpen = () => {
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      openFrame = window.requestAnimationFrame(() => {
        openFrame = null;
        if (isSearchOpen()) scheduleAutoClose();
      });
    };

    const handleInput = () => {
      if (input.value.trim()) {
        cancelAutoClose();
        return;
      }

      if (isSearchOpen()) scheduleAutoClose();
    };

    openButton.addEventListener("click", handleOpen);
    input.addEventListener("input", handleInput);
    closeButton.addEventListener("click", cancelAutoClose);

    return () => {
      cancelAutoClose();
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      openButton.removeEventListener("click", handleOpen);
      input.removeEventListener("input", handleInput);
      closeButton.removeEventListener("click", cancelAutoClose);
    };
  }, []);

  return null;
}
