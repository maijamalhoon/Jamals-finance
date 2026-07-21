"use client";

import { useEffect } from "react";

const ACTION_PATTERN = /^(add|apply|archive|cancel|cash out|choose|confirm|create|delete|download|enable|export|pay|record|refund|remove|resend|reset|restore|retry|save|send|set|sign out|transfer|update|upload|verify|withdraw)\b/i;
const LOADING_PATTERN = /^(adding|applying|archiving|cancelling|confirming|creating|deleting|downloading|enabling|exporting|paying|processing|recording|refunding|removing|resending|resetting|restoring|retrying|saving|sending|signing out|transferring|updating|uploading|verifying|withdrawing)\b/i;
const CONFIRMATION_TITLE_PATTERN = /^(archive|cash out|confirm|delete|refund|remove|restore|sign out|transfer|withdraw)\b/i;

function compactText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\.{3,}/g, "…").trim();
}

function shortActionLabel(value: string) {
  const label = compactText(value);
  const lower = label.toLowerCase();

  if (!label) return "Action";
  if (LOADING_PATTERN.test(label)) {
    if (lower.startsWith("signing out")) return "Signing Out…";
    if (lower.startsWith("processing")) return "Processing…";
    const verb = label.split(/\s+/)[0].replace(/…?$/, "");
    return `${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}…`;
  }

  if (lower.startsWith("cash out")) return "Cash Out";
  if (lower.startsWith("sign out")) return "Sign Out";
  if (lower.startsWith("choose")) return "Choose";
  if (lower.startsWith("resend")) return "Resend";
  if (lower.startsWith("record") || lower.startsWith("pay")) return "Pay";
  if (lower.startsWith("save") || lower.startsWith("set")) return "Save";
  if (lower.startsWith("add")) return "Add";
  if (lower.startsWith("create")) return "Create";
  if (lower.startsWith("update")) return "Update";
  if (lower.startsWith("delete") || lower.startsWith("remove")) return "Delete";
  if (lower.startsWith("send")) return "Send";
  if (lower.startsWith("verify")) return "Verify";
  if (lower.startsWith("withdraw")) return "Withdraw";
  if (lower.startsWith("transfer")) return "Transfer";
  if (lower.startsWith("refund")) return "Refund";
  if (lower.startsWith("apply")) return "Apply";
  if (lower.startsWith("confirm")) return "Confirm";
  if (lower.startsWith("download") || lower.startsWith("export")) return "Download";
  if (lower.startsWith("upload")) return "Upload";
  if (lower.startsWith("enable")) return "Enable";
  if (lower.startsWith("archive")) return "Archive";
  if (lower.startsWith("restore")) return "Restore";
  if (lower.startsWith("reset")) return "Reset";
  if (lower.startsWith("retry")) return "Retry";
  if (lower.startsWith("cancel")) return "Cancel";

  return label.length <= 14 ? label : label.split(" ").slice(0, 2).join(" ");
}

function isConfirmationDialog(dialog: HTMLElement) {
  const title = compactText(
    dialog.querySelector<HTMLElement>('[data-slot="dialog-title"]')?.textContent ?? "",
  );
  return CONFIRMATION_TITLE_PATTERN.test(title);
}

function getActionRoots() {
  const roots = new Set<HTMLElement>();

  document
    .querySelectorAll<HTMLElement>('.finance-modal-content, [data-slot="dialog-content"]')
    .forEach((dialog) => {
      if (dialog.hasAttribute("data-global-confirm-dialog")) return;
      if (dialog.classList.contains("finance-modal-content") || isConfirmationDialog(dialog)) {
        roots.add(dialog);
      }
    });

  return Array.from(roots);
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
  if (/^(back|view)\b/i.test(label)) return true;

  return false;
}

function shouldManageAction(button: HTMLButtonElement) {
  if (isDecorativeOrNavigationButton(button)) return false;
  if (button.type === "submit") return true;
  if (button.closest('.finance-modal-footer, [data-slot="dialog-footer"]')) return true;

  const label = compactText(button.textContent ?? "");
  return ACTION_PATTERN.test(label) || LOADING_PATTERN.test(label);
}

function markAction(button: HTMLButtonElement) {
  if (!shouldManageAction(button)) return;

  const originalLabel = compactText(button.textContent ?? "");
  button.dataset.jfFormAction = "true";
  button.dataset.jfFormActionLabel = shortActionLabel(originalLabel);

  if (button.dataset.jfGlobalGeneratedActionAria === "true") {
    button.setAttribute("aria-label", originalLabel);
  } else if (!button.hasAttribute("aria-label") && originalLabel) {
    button.setAttribute("aria-label", originalLabel);
    button.dataset.jfGlobalGeneratedActionAria = "true";
  }
}

function syncActions() {
  getActionRoots().forEach((root) => {
    root.querySelectorAll<HTMLButtonElement>("button").forEach(markAction);
  });
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
    });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      document
        .querySelectorAll<HTMLButtonElement>(
          'button[data-jf-global-generated-action-aria="true"]',
        )
        .forEach((button) => {
          button.removeAttribute("aria-label");
          delete button.dataset.jfGlobalGeneratedActionAria;
        });
    };
  }, []);

  return null;
}
