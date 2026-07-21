"use client";

import { useEffect } from "react";

import styles from "./FinancePickerKeyboardGuard.module.css";

const FINANCE_PICKER_SELECTOR = [
  ".finance-account-select",
  '[data-slot="select-trigger"]',
  '[role="listbox"][aria-label]',
  '[aria-haspopup="dialog"][aria-controls$="-calendar"]',
].join(",");

const ACTION_VERB_PATTERN = /^(add|apply|cancel|cash out|confirm|create|delete|download|export|pay|record|refund|remove|save|send|set|sign out|transfer|update|verify|withdraw)\b/i;
const ACTION_LOADING_PATTERN = /^(adding|applying|cancelling|confirming|creating|deleting|downloading|exporting|paying|processing|recording|refunding|removing|saving|sending|signing out|transferring|updating|verifying|withdrawing)\b/i;

const FINANCE_FORM_RUNTIME_STYLE = `
:root {
  --jf-global-form-action-height: clamp(2.5rem, 5.2dvh, 2.75rem);
  --jf-global-form-action-radius: 1.05rem;
  --jf-global-form-action-gap: clamp(0.5rem, 1.4vw, 0.625rem);
}

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

/* Every final form action shares one responsive button footprint. */
.finance-modal-content .finance-modal-footer {
  gap: var(--jf-global-form-action-gap) !important;
}

.finance-modal-content button[data-jf-form-action="true"] {
  box-sizing: border-box !important;
  height: var(--jf-global-form-action-height) !important;
  min-height: var(--jf-global-form-action-height) !important;
  max-height: var(--jf-global-form-action-height) !important;
  border-radius: var(--jf-global-form-action-radius) !important;
  gap: 0 !important;
  font-size: 0 !important;
  line-height: 1 !important;
}

.finance-modal-content button[data-jf-form-action="true"] > * {
  display: none !important;
}

.finance-modal-content button[data-jf-form-action="true"] svg {
  display: none !important;
}

.finance-modal-content button[data-jf-form-action="true"]::after {
  content: attr(data-jf-form-action-label);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  font-size: clamp(0.82rem, 1.6vw, 0.9rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Inline submit actions visually become the footer directly below their form. */
.finance-modal-content button[data-jf-inline-form-action="true"] {
  position: relative;
  isolation: isolate;
  width: 100% !important;
  margin-top: var(--jf-global-form-edge-gap, 0.875rem) !important;
}

.finance-modal-content button[data-jf-inline-form-action="true"]::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: calc(var(--jf-global-form-edge-gap, 0.875rem) * -1);
  border-radius: calc(
    var(--jf-global-form-action-radius) +
      var(--jf-global-form-edge-gap, 0.875rem)
  );
  background: var(--card);
  pointer-events: none;
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

function normalizeActionCopy(value: string) {
  return value.replace(/\s+/g, " ").replace(/\.{3,}/g, "…").trim();
}

function getShortActionLabel(value: string) {
  const label = normalizeActionCopy(value);
  if (!label) return "Action";

  if (ACTION_LOADING_PATTERN.test(label)) {
    const match = label.match(ACTION_LOADING_PATTERN)?.[1]?.toLowerCase() ?? "processing";
    const loadingLabels: Record<string, string> = {
      adding: "Adding…",
      applying: "Applying…",
      cancelling: "Cancelling…",
      confirming: "Confirming…",
      creating: "Creating…",
      deleting: "Deleting…",
      downloading: "Downloading…",
      exporting: "Exporting…",
      paying: "Paying…",
      processing: "Processing…",
      recording: "Recording…",
      refunding: "Refunding…",
      removing: "Removing…",
      saving: "Saving…",
      sending: "Sending…",
      "signing out": "Signing Out…",
      transferring: "Transferring…",
      updating: "Updating…",
      verifying: "Verifying…",
      withdrawing: "Withdrawing…",
    };

    return loadingLabels[match] ?? "Processing…";
  }

  if (/^cash out\b/i.test(label)) return "Cash Out";
  if (/^sign out\b/i.test(label)) return "Sign Out";
  if (/^(record|pay)\b/i.test(label)) return "Pay";
  if (/^(save|set)\b/i.test(label)) return "Save";
  if (/^add\b/i.test(label)) return "Add";
  if (/^create\b/i.test(label)) return "Create";
  if (/^(update|edit)\b/i.test(label)) return "Update";
  if (/^(delete|remove)\b/i.test(label)) return "Delete";
  if (/^send\b/i.test(label)) return "Send";
  if (/^verify\b/i.test(label)) return "Verify";
  if (/^withdraw\b/i.test(label)) return "Withdraw";
  if (/^transfer\b/i.test(label)) return "Transfer";
  if (/^refund\b/i.test(label)) return "Refund";
  if (/^apply\b/i.test(label)) return "Apply";
  if (/^confirm\b/i.test(label)) return "Confirm";
  if (/^(download|export)\b/i.test(label)) return "Download";
  if (/^cancel\b/i.test(label)) return "Cancel";

  return label.length <= 14 ? label : label.split(" ").slice(0, 2).join(" ");
}

function isFormActionButton(button: HTMLButtonElement) {
  if (button.matches('[data-slot="dialog-close"], [aria-haspopup], [role="radio"]')) {
    return false;
  }

  if (button.closest(".finance-modal-footer")) return true;
  if (!button.closest("form") && !button.closest(".settings-security-panel")) {
    return false;
  }

  const label = normalizeActionCopy(button.textContent ?? "");
  return ACTION_VERB_PATTERN.test(label) || ACTION_LOADING_PATTERN.test(label);
}

function syncFormActionButtons() {
  document
    .querySelectorAll<HTMLElement>(".finance-modal-content")
    .forEach((modal) => {
      modal.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (!isFormActionButton(button)) return;

        const originalLabel = normalizeActionCopy(button.textContent ?? "");
        button.dataset.jfFormAction = "true";
        button.dataset.jfFormActionLabel = getShortActionLabel(originalLabel);

        if (!button.hasAttribute("aria-label") && originalLabel) {
          button.setAttribute("aria-label", originalLabel);
          button.dataset.jfGeneratedActionAria = "true";
        }

        if (button.closest(".finance-modal-footer")) {
          delete button.dataset.jfInlineFormAction;
        } else {
          button.dataset.jfInlineFormAction = "true";
        }
      });
    });
}

export default function FinancePickerKeyboardGuard() {
  useEffect(() => {
    const coarsePointer = window.matchMedia(
      "(max-width: 1024px) and (pointer: coarse)",
    );
    let syncFrame: number | null = null;

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
      syncFormActionButtons();
    };

    const scheduleFinanceSync = () => {
      if (syncFrame !== null) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = null;
        syncFinanceControls();
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(FINANCE_PICKER_SELECTOR)) return;
      dismissSoftKeyboard();
    };

    syncFinanceControls();

    const observer = new MutationObserver(scheduleFinanceSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    coarsePointer.addEventListener("change", scheduleFinanceSync);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      observer.disconnect();
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
      coarsePointer.removeEventListener("change", scheduleFinanceSync);
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

      document
        .querySelectorAll<HTMLButtonElement>('button[data-jf-form-action="true"]')
        .forEach((button) => {
          if (button.dataset.jfGeneratedActionAria === "true") {
            button.removeAttribute("aria-label");
          }
          delete button.dataset.jfFormAction;
          delete button.dataset.jfFormActionLabel;
          delete button.dataset.jfInlineFormAction;
          delete button.dataset.jfGeneratedActionAria;
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
