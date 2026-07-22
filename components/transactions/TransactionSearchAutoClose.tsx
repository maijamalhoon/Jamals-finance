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

export default function TransactionSearchAutoClose() {
  useEffect(() => {
    const input = document.getElementById(
      "transaction-page-search",
    ) as HTMLInputElement | null;
    const searchControl = input?.closest<HTMLElement>(
      ".jf-transaction-search",
    );

    if (!input || !searchControl) return;

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

    input.inputMode = "search";
    input.enterKeyHint = "search";

    let closeTimer: number | null = null;
    let isComposing = false;

    const isSearchOpen = () => searchControl.dataset.open === "true";

    const clearAutoClose = () => {
      if (closeTimer === null) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    };

    const closeWithoutClearingSearch = () => {
      if (!isSearchOpen() || isComposing) return;

      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    };

    const scheduleAutoClose = () => {
      clearAutoClose();
      if (!isSearchOpen()) return;

      closeTimer = window.setTimeout(() => {
        closeTimer = null;

        if (isComposing) {
          scheduleAutoClose();
          return;
        }

        closeWithoutClearingSearch();
      }, AUTO_CLOSE_DELAY_MS);
    };

    const handleActivity = () => {
      if (!isSearchOpen()) return;
      scheduleAutoClose();
    };

    const handleCompositionStart = () => {
      isComposing = true;
      clearAutoClose();
    };

    const handleCompositionEnd = () => {
      isComposing = false;
      scheduleAutoClose();
    };

    const syncOpenState = () => {
      if (!isSearchOpen()) {
        clearAutoClose();
        return;
      }

      window.requestAnimationFrame(() => {
        if (!isSearchOpen()) return;
        input.focus({ preventScroll: true });
        scheduleAutoClose();
      });
    };

    const openStateObserver = new MutationObserver(syncOpenState);
    openStateObserver.observe(searchControl, {
      attributes: true,
      attributeFilter: ["data-open"],
    });

    searchControl.addEventListener("pointerdown", handleActivity, true);
    searchControl.addEventListener("keydown", handleActivity, true);
    searchControl.addEventListener("focusin", handleActivity, true);
    input.addEventListener("input", handleActivity);
    input.addEventListener("compositionstart", handleCompositionStart);
    input.addEventListener("compositionend", handleCompositionEnd);

    syncOpenState();

    return () => {
      clearAutoClose();
      openStateObserver.disconnect();
      searchControl.removeEventListener("pointerdown", handleActivity, true);
      searchControl.removeEventListener("keydown", handleActivity, true);
      searchControl.removeEventListener("focusin", handleActivity, true);
      input.removeEventListener("input", handleActivity);
      input.removeEventListener("compositionstart", handleCompositionStart);
      input.removeEventListener("compositionend", handleCompositionEnd);
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
