"use client";

import { useEffect } from "react";

import styles from "./FinancePickerKeyboardGuard.module.css";

const FINANCE_PICKER_SELECTOR = [
  ".finance-account-select",
  '[data-slot="select-trigger"]',
  '[role="listbox"][aria-label]',
  '[aria-haspopup="dialog"][aria-controls$="-calendar"]',
].join(",");

const FINANCE_FORM_RUNTIME_STYLE = `
.dark [data-slot="dialog-content"].finance-modal-content,
.dark [role="dialog"].finance-modal-content {
  --card: #1b2a40;
  --surface-primary: #1b2a40;
  --surface-elevated: #1b2a40;
  --popover: #1b2a40;
  --surface-secondary: #213149;
  --surface-inset: #213149;
  --surface-soft: #22334b;
  --input: #213149;

  background: var(--card) !important;
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.24) !important;
}

.dark [data-slot="dialog-content"].finance-modal-content > .finance-modal-header,
.dark [data-slot="dialog-content"].finance-modal-content > .finance-modal-body,
.dark [data-slot="dialog-content"].finance-modal-content > .finance-modal-footer,
.dark [role="dialog"].finance-modal-content > .finance-modal-header,
.dark [role="dialog"].finance-modal-content > .finance-modal-body,
.dark [role="dialog"].finance-modal-content > .finance-modal-footer {
  background: var(--card) !important;
  box-shadow: none !important;
}

.dark .finance-modal-content .field-input,
.dark .finance-modal-content [data-slot="select-trigger"],
.dark .finance-modal-content select.finance-control,
.dark .finance-modal-content textarea.field-input,
.dark .finance-modal-content [role="listbox"].field-input {
  background: var(--surface-inset) !important;
  box-shadow: none !important;
}

/* Edit Investment: keep the saved asset visible without an editable field. */
.finance-modal-content
  [data-slot="finance-form-field"]:has(> #investment-name):not(:has(> button))
  > .field-label {
  display: none !important;
}

.finance-modal-content
  [data-slot="finance-form-field"]:has(> #investment-name):not(:has(> button))
  > #investment-name {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--text-primary) !important;
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  line-height: 1.4 !important;
  pointer-events: none !important;
  caret-color: transparent !important;
}

/* Edit Goal: show the saved goal name as smaller, non-editable text only. */
.finance-modal-content
  [data-slot="finance-form-field"]:has(> #goal-name[data-finance-locked-name="true"])
  > .field-label {
  display: none !important;
}

.finance-modal-content
  [data-slot="finance-form-field"]:has(> #goal-name[data-finance-locked-name="true"])
  > #goal-name {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--text-primary) !important;
  font-size: 0.875rem !important;
  font-weight: 650 !important;
  line-height: 1.25rem !important;
  pointer-events: none !important;
  caret-color: transparent !important;
}

/* All finalized finance forms use labels only; placeholder copy stays hidden. */
.finance-modal-content input::placeholder,
.finance-modal-content textarea::placeholder {
  color: transparent !important;
  opacity: 0 !important;
}
`;

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

    const syncLockedGoalNames = () => {
      document
        .querySelectorAll<HTMLElement>(".finance-modal-content")
        .forEach((modal) => {
          const title = modal
            .querySelector<HTMLElement>('[data-slot="dialog-title"]')
            ?.textContent?.trim();
          const goalName = modal.querySelector<HTMLInputElement>("#goal-name");
          if (!goalName) return;

          if (title === "Edit Goal") {
            goalName.readOnly = true;
            goalName.tabIndex = -1;
            goalName.setAttribute("aria-readonly", "true");
            goalName.dataset.financeLockedName = "true";
            return;
          }

          if (goalName.dataset.financeLockedName === "true") {
            goalName.readOnly = false;
            goalName.removeAttribute("tabindex");
            goalName.removeAttribute("aria-readonly");
            delete goalName.dataset.financeLockedName;
          }
        });
    };

    const syncFinanceControls = () => {
      syncDateInputs();
      syncLockedGoalNames();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(FINANCE_PICKER_SELECTOR)) return;
      dismissSoftKeyboard();
    };

    syncFinanceControls();

    const observer = new MutationObserver(syncFinanceControls);
    observer.observe(document.body, { childList: true, subtree: true });
    coarsePointer.addEventListener("change", syncFinanceControls);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      observer.disconnect();
      coarsePointer.removeEventListener("change", syncFinanceControls);
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

      document
        .querySelectorAll<HTMLInputElement>(
          'input[data-finance-locked-name="true"]',
        )
        .forEach((input) => {
          input.readOnly = false;
          input.removeAttribute("tabindex");
          input.removeAttribute("aria-readonly");
          delete input.dataset.financeLockedName;
        });
    };
  }, []);

  return (
    <>
      <span aria-hidden="true" className={styles.guard} />
      <style>{FINANCE_FORM_RUNTIME_STYLE}</style>
    </>
  );
}
