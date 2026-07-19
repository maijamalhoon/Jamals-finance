"use client";

import { useEffect } from "react";

import styles from "./FinancePickerKeyboardGuard.module.css";

const FINANCE_PICKER_SELECTOR = [
  ".finance-account-select",
  '[data-slot="select-trigger"]',
  '[role="listbox"][aria-label]',
  '[aria-haspopup="dialog"][aria-controls$="-calendar"]',
].join(",");

function isEditableElement(element: Element | null): element is HTMLElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

function dismissSoftKeyboard() {
  const activeElement = document.activeElement;
  if (isEditableElement(activeElement)) activeElement.blur();

  const virtualKeyboard = (
    navigator as Navigator & {
      virtualKeyboard?: { hide?: () => void };
    }
  ).virtualKeyboard;

  virtualKeyboard?.hide?.();
}

export default function FinancePickerKeyboardGuard() {
  useEffect(() => {
    const coarsePointer = window.matchMedia(
      "(max-width: 1024px) and (pointer: coarse)",
    );

    const syncDateInputs = () => {
      const dateInputs = document.querySelectorAll<HTMLInputElement>(
        'input[aria-haspopup="dialog"][aria-controls$="-calendar"]',
      );

      dateInputs.forEach((input) => {
        if (coarsePointer.matches) {
          input.readOnly = true;
          input.setAttribute("inputmode", "none");
          input.dataset.financeDateReadonly = "true";
          return;
        }

        if (input.dataset.financeDateReadonly === "true") {
          input.readOnly = false;
          input.setAttribute("inputmode", "numeric");
          delete input.dataset.financeDateReadonly;
        }
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(FINANCE_PICKER_SELECTOR)) return;
      dismissSoftKeyboard();
    };

    syncDateInputs();

    const observer = new MutationObserver(syncDateInputs);
    observer.observe(document.body, { childList: true, subtree: true });
    coarsePointer.addEventListener("change", syncDateInputs);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      observer.disconnect();
      coarsePointer.removeEventListener("change", syncDateInputs);
      document.removeEventListener("pointerdown", handlePointerDown, true);

      document
        .querySelectorAll<HTMLInputElement>(
          'input[data-finance-date-readonly="true"]',
        )
        .forEach((input) => {
          input.readOnly = false;
          input.setAttribute("inputmode", "numeric");
          delete input.dataset.financeDateReadonly;
        });
    };
  }, []);

  return <span aria-hidden="true" className={styles.guard} />;
}
