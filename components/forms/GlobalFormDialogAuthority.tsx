"use client";

import { useEffect } from "react";

const DIALOG_SELECTOR = '[data-slot="dialog-content"], [role="dialog"]';
const CENTERED_ATTRIBUTE = "data-jf-global-centered-dialog";

const GLOBAL_DIALOG_STYLE = `
:root {
  --jf-global-final-action-width: 88%;
  --jf-global-final-action-max-width: 28rem;
  --jf-global-final-action-radius: 1.3rem;
  --jf-global-form-action-radius: var(--jf-global-final-action-radius);
}

html body .finance-modal-content .finance-modal-footer {
  justify-items: center !important;
}

html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"],
.auth-primary-action,
.auth-step button.w-full:not(.auth-provider-action),
.jf-auth-card button.w-full:not(.auth-provider-action) {
  width: var(--jf-global-final-action-width) !important;
  min-width: 0 !important;
  max-width: var(--jf-global-final-action-max-width) !important;
  margin-inline: auto !important;
  justify-self: center !important;
  border-radius: var(--jf-global-final-action-radius) !important;
}
`;

function getDialogs() {
  const dialogs = new Set<HTMLElement>();

  document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR).forEach((dialog) => {
    if (dialog.hasAttribute("data-jf-dialog-position-custom")) return;

    const parentDialog = dialog.parentElement?.closest<HTMLElement>(
      '[data-slot="dialog-content"]',
    );
    if (parentDialog && parentDialog !== dialog) return;

    dialogs.add(dialog);
  });

  return Array.from(dialogs);
}

function centerDialog(dialog: HTMLElement) {
  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const centerX = viewportLeft + viewportWidth / 2;
  const centerY = viewportTop + viewportHeight / 2;

  dialog.setAttribute(CENTERED_ATTRIBUTE, "true");
  dialog.style.setProperty("position", "fixed", "important");
  dialog.style.setProperty("top", `${centerY}px`, "important");
  dialog.style.setProperty("right", "auto", "important");
  dialog.style.setProperty("bottom", "auto", "important");
  dialog.style.setProperty("left", `${centerX}px`, "important");
  dialog.style.setProperty("margin", "0", "important");
  dialog.style.setProperty("translate", "none", "important");
  dialog.style.setProperty(
    "transform",
    "translate3d(-50%, -50%, 0)",
    "important",
  );
  dialog.style.setProperty("transform-origin", "center center", "important");
  dialog.style.setProperty(
    "max-height",
    `${Math.max(0, viewportHeight - 16)}px`,
    "important",
  );
}

function syncDialogCenters() {
  getDialogs().forEach(centerDialog);
}

function clearDialogCenter(dialog: HTMLElement) {
  dialog.removeAttribute(CENTERED_ATTRIBUTE);

  [
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "margin",
    "translate",
    "transform",
    "transform-origin",
    "max-height",
  ].forEach((property) => dialog.style.removeProperty(property));
}

export default function GlobalFormDialogAuthority() {
  useEffect(() => {
    let frame: number | null = null;

    const scheduleSync = () => {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        syncDialogCenters();
      });
    };

    syncDialogCenters();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const viewport = window.visualViewport;
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("orientationchange", scheduleSync, { passive: true });
    viewport?.addEventListener("resize", scheduleSync, { passive: true });
    viewport?.addEventListener("scroll", scheduleSync, { passive: true });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      viewport?.removeEventListener("resize", scheduleSync);
      viewport?.removeEventListener("scroll", scheduleSync);

      document
        .querySelectorAll<HTMLElement>(`[${CENTERED_ATTRIBUTE}="true"]`)
        .forEach(clearDialogCenter);
    };
  }, []);

  return <style>{GLOBAL_DIALOG_STYLE}</style>;
}
