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

    // Keep the custom close control only; mobile browsers add their own clear "X"
    // to search inputs after text is entered.
    input.type = "text";

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
          closeButton.click();
        }
      }, AUTO_CLOSE_DELAY_MS);
    };

    const handleOpen = () => {
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      openFrame = window.requestAnimationFrame(() => {
        openFrame = null;
        scheduleAutoClose();
      });
    };

    const handleInput = () => {
      if (input.value.trim()) {
        cancelAutoClose();
        return;
      }

      if (searchControl.dataset.open === "true") scheduleAutoClose();
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
