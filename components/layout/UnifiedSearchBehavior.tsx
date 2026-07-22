"use client";

import { useEffect } from "react";

const PAYABLES_SEARCH_ID = "payables-search";

function createCloseButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "jf-unified-search-close finance-focus";
  button.setAttribute("aria-label", "Clear and close search");
  button.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  `;
  return button;
}

function enhancePayablesSearch(input: HTMLInputElement) {
  const form = input.closest<HTMLFormElement>("form");
  if (!form || form.dataset.unifiedSearchReady === "true") return null;

  form.dataset.unifiedSearchReady = "true";
  form.dataset.unifiedSearch = "payables";
  form.dataset.open = input.value.trim() ? "true" : "false";
  form.setAttribute("role", "search");
  form.setAttribute("aria-label", "Search payables");

  input.inputMode = "search";
  input.enterKeyHint = "search";
  input.setAttribute("autocomplete", "off");

  const closeButton = createCloseButton();
  form.appendChild(closeButton);

  let focusFrame: number | null = null;

  const cancelFocusFrame = () => {
    if (focusFrame === null) return;
    window.cancelAnimationFrame(focusFrame);
    focusFrame = null;
  };

  const setOpen = (open: boolean) => {
    form.dataset.open = open ? "true" : "false";
    closeButton.tabIndex = open ? 0 : -1;
  };

  const focusInput = () => {
    cancelFocusFrame();
    focusFrame = window.requestAnimationFrame(() => {
      focusFrame = null;
      input.focus({ preventScroll: true });
      const caretPosition = input.value.length;
      try {
        input.setSelectionRange(caretPosition, caretPosition);
      } catch {
        // Some older mobile engines do not expose text selection APIs here.
      }
    });
  };

  const openSearch = () => {
    if (form.dataset.open !== "true") setOpen(true);
    focusInput();
  };

  const handleFormPointerDown = (event: PointerEvent) => {
    if (closeButton.contains(event.target as Node)) return;
    if (form.dataset.open === "true") return;

    event.preventDefault();
    openSearch();
  };

  const handleFormClick = (event: MouseEvent) => {
    if (closeButton.contains(event.target as Node)) return;
    if (form.dataset.open !== "true") openSearch();
  };

  const handleInputFocus = () => setOpen(true);

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    input.blur();
    setOpen(false);
  };

  const handleClose = () => {
    const hadSearchValue = input.value.trim().length > 0;

    cancelFocusFrame();
    input.blur();
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    setOpen(false);

    if (hadSearchValue) {
      window.requestAnimationFrame(() => form.requestSubmit());
    }
  };

  form.addEventListener("pointerdown", handleFormPointerDown, true);
  form.addEventListener("click", handleFormClick);
  input.addEventListener("focus", handleInputFocus);
  input.addEventListener("keydown", handleInputKeyDown);
  closeButton.addEventListener("click", handleClose);

  setOpen(form.dataset.open === "true");

  return () => {
    cancelFocusFrame();
    form.removeEventListener("pointerdown", handleFormPointerDown, true);
    form.removeEventListener("click", handleFormClick);
    input.removeEventListener("focus", handleInputFocus);
    input.removeEventListener("keydown", handleInputKeyDown);
    closeButton.removeEventListener("click", handleClose);
    closeButton.remove();
    delete form.dataset.unifiedSearchReady;
    delete form.dataset.unifiedSearch;
    delete form.dataset.open;
  };
}

function keepTransactionActionsAvailable() {
  const searchControl = document.querySelector<HTMLElement>(
    "#transaction-filter-controls .jf-transaction-search",
  );
  const actions = searchControl?.nextElementSibling;
  if (!(actions instanceof HTMLElement)) return;

  if (actions.hasAttribute("aria-hidden")) {
    actions.removeAttribute("aria-hidden");
  }

  actions.querySelectorAll<HTMLButtonElement>('button[tabindex="-1"]').forEach(
    (button) => {
      button.removeAttribute("tabindex");
    },
  );
}

export default function UnifiedSearchBehavior() {
  useEffect(() => {
    const cleanups = new Map<HTMLFormElement, () => void>();

    const scan = () => {
      for (const [form, cleanup] of cleanups) {
        if (form.isConnected) continue;
        cleanup();
        cleanups.delete(form);
      }

      const input = document.getElementById(
        PAYABLES_SEARCH_ID,
      ) as HTMLInputElement | null;
      const form = input?.closest<HTMLFormElement>("form") ?? null;

      if (input && form && !cleanups.has(form)) {
        const cleanup = enhancePayablesSearch(input);
        if (cleanup) cleanups.set(form, cleanup);
      }

      keepTransactionActionsAvailable();
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "tabindex", "data-open"],
    });

    return () => {
      observer.disconnect();
      for (const cleanup of cleanups.values()) cleanup();
      cleanups.clear();
    };
  }, []);

  return null;
}
