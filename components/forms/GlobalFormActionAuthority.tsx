"use client";

import { useEffect } from "react";

const ACTION_PATTERN = /^(add|apply|archive|cancel|cash out|confirm|create|delete|download|enable|export|pay|record|refund|remove|resend|reset|restore|retry|save|send|set|sign out|transfer|update|upload|verify|withdraw)\b/i;
const LOADING_PATTERN = /^(adding|applying|archiving|cancelling|confirming|creating|deleting|downloading|enabling|exporting|paying|processing|recording|refunding|removing|resending|resetting|restoring|retrying|saving|sending|signing out|transferring|updating|uploading|verifying|withdrawing)\b/i;
const CONFIRMATION_TITLE_PATTERN = /^(archive|cash out|confirm|delete|refund|remove|restore|sign out|transfer|withdraw)\b/i;
const AUTH_ACTION_SELECTOR = [
  ".auth-primary-action",
  ".auth-step button.w-full:not(.auth-provider-action)",
  ".jf-auth-card button.w-full:not(.auth-provider-action)",
].join(",");
const UNIFIED_ACTION_RADIUS = "var(--jf-global-final-action-radius, 1.3rem)";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\.{3,}/g, "…").trim();
}

function isConfirmationDialog(dialog: HTMLElement) {
  const title = compactText(
    dialog.querySelector<HTMLElement>('[data-slot="dialog-title"]')?.textContent ?? "",
  );
  return CONFIRMATION_TITLE_PATTERN.test(title);
}

function getActionRoots() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '.finance-modal-content, [data-slot="dialog-content"]',
    ),
  ).filter(
    (dialog) =>
      dialog.classList.contains("finance-modal-content") ||
      isConfirmationDialog(dialog),
  );
}

function isDecorativeOrNavigationButton(button: HTMLButtonElement) {
  if (
    button.matches(
      '[data-slot="dialog-close"], [aria-haspopup], [role="radio"], [role="tab"]',
    )
  ) {
    return true;
  }

  if (
    button.matches(
      ".auth-password-toggle, .auth-inline-field-action, .auth-step-back",
    )
  ) {
    return true;
  }

  if (button.querySelector(".finance-icon-bubble")) return true;

  const label = compactText(button.textContent ?? "");
  if (!label) return true;
  return /^(back|view|max|swap)\b/i.test(label);
}

function hasActionCopy(button: HTMLButtonElement) {
  const label = compactText(button.textContent ?? "");
  return ACTION_PATTERN.test(label) || LOADING_PATTERN.test(label);
}

function shouldManageAction(button: HTMLButtonElement, root: HTMLElement) {
  if (isDecorativeOrNavigationButton(button)) return false;

  if (
    button.closest('.finance-modal-footer, [data-slot="dialog-footer"]')
  ) {
    return true;
  }

  if (button.type === "submit") return true;

  if (button.closest(".settings-security-panel")) {
    return hasActionCopy(button);
  }

  if (isConfirmationDialog(root)) {
    return hasActionCopy(button);
  }

  return false;
}

function clearLegacyGeneratedPresentation(button: HTMLButtonElement) {
  delete button.dataset.jfFormActionLabel;
  delete button.dataset.jfInlineFormAction;

  if (
    button.dataset.jfGeneratedActionAria === "true" ||
    button.dataset.jfGlobalGeneratedActionAria === "true"
  ) {
    button.removeAttribute("aria-label");
  }

  delete button.dataset.jfGeneratedActionAria;
  delete button.dataset.jfGlobalGeneratedActionAria;
}

function applyUnifiedCurve(button: HTMLButtonElement) {
  button.style.setProperty("border-radius", UNIFIED_ACTION_RADIUS, "important");
  button.style.setProperty("overflow", "hidden", "important");
  button.dataset.jfGlobalActionCurve = "true";
}

function clearUnifiedCurve(button: HTMLButtonElement) {
  if (button.dataset.jfGlobalActionCurve !== "true") return;
  button.style.removeProperty("border-radius");
  button.style.removeProperty("overflow");
  delete button.dataset.jfGlobalActionCurve;
}

function syncAction(button: HTMLButtonElement, root: HTMLElement) {
  const managed = shouldManageAction(button, root);

  if (!managed) {
    delete button.dataset.jfFormAction;
    delete button.dataset.jfGlobalActionManaged;
    clearLegacyGeneratedPresentation(button);
    clearUnifiedCurve(button);
    return;
  }

  button.dataset.jfFormAction = "true";
  button.dataset.jfGlobalActionManaged = "true";
  clearLegacyGeneratedPresentation(button);
  applyUnifiedCurve(button);
}

function syncActions() {
  getActionRoots().forEach((root) => {
    root
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((button) => syncAction(button, root));
  });

  document
    .querySelectorAll<HTMLButtonElement>(AUTH_ACTION_SELECTOR)
    .forEach(applyUnifiedCurve);
}

export default function GlobalFormActionAuthority() {
  useEffect(() => {
    let frame: number | null = null;

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        syncActions();
      });
    };

    syncActions();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "class",
        "disabled",
        "aria-label",
        "data-jf-form-action",
        "data-jf-form-action-label",
        "data-jf-inline-form-action",
      ],
    });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);

      document
        .querySelectorAll<HTMLButtonElement>(
          'button[data-jf-global-action-managed="true"]',
        )
        .forEach((button) => {
          delete button.dataset.jfFormAction;
          delete button.dataset.jfGlobalActionManaged;
          clearLegacyGeneratedPresentation(button);
        });

      document
        .querySelectorAll<HTMLButtonElement>(
          'button[data-jf-global-action-curve="true"]',
        )
        .forEach(clearUnifiedCurve);
    };
  }, []);

  return null;
}
