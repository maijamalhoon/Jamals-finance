"use client";

import { useEffect } from "react";

const DIALOG_SELECTOR = '[data-slot="dialog-content"], [role="dialog"]';
const CENTERED_ATTRIBUTE = "data-jf-global-centered-dialog";
const KEYBOARD_ATTRIBUTE = "data-jf-keyboard-stable-dialog";
const TEXT_ENTRY_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="date"]):not([type="month"]):not([type="week"]):not([type="time"])',
  "textarea",
  '[contenteditable="true"]',
].join(",");

interface ViewportMetrics {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface DialogBaseline {
  viewportWidth: number;
  viewportHeight: number;
  screenTop: number;
  screenCenterX: number;
}

const dialogBaselines = new Map<HTMLElement, DialogBaseline>();

const GLOBAL_DIALOG_STYLE = `
:root {
  --jf-global-final-action-width: 88%;
  --jf-global-final-action-max-width: 28rem;
  --jf-global-final-action-radius: 1.3rem;
  --jf-global-form-action-radius: var(--jf-global-final-action-radius);
  --jf-global-form-button-bottom-space: clamp(0.3rem, 0.75vw, 0.45rem);
}

html body .finance-modal-content .finance-modal-footer {
  justify-items: center !important;
  padding-bottom: calc(
    var(--jf-global-form-edge-gap, 1rem) +
      var(--jf-global-form-button-bottom-space) + env(safe-area-inset-bottom)
  ) !important;
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

/* Investment, Transfer and every shared primary action use the same flat shell
   as Income and Expense. Their authored semantic background color remains. */
html body .finance-modal-content
  .finance-primary-action[data-jf-form-action="true"] {
  padding-block: 0 !important;
  border: 0 !important;
  background-image: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
  appearance: none !important;
}

html body .finance-modal-content form > button[data-jf-form-action="true"]:last-child,
html body .finance-modal-content > button[data-jf-form-action="true"]:last-child,
html body .finance-modal-content .finance-modal-body > button[data-jf-form-action="true"]:last-child {
  margin-bottom: var(--jf-global-form-button-bottom-space) !important;
}

.auth-primary-action:last-child,
.auth-step button.w-full:not(.auth-provider-action):last-child,
.jf-auth-card button.w-full:not(.auth-provider-action):last-child {
  margin-bottom: var(--jf-global-form-button-bottom-space) !important;
}

/* While a mobile keyboard is open, the card keeps its screen-top position.
   Only its available height changes, so the body scrolls instead of the whole
   form jumping toward the top of the screen. */
html body [${KEYBOARD_ATTRIBUTE}="true"] {
  overscroll-behavior: contain !important;
}
`;

function getViewportMetrics(): ViewportMetrics {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
  };
}

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

function getActiveTextEntry(dialog: HTMLElement) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (!dialog.contains(active) || !active.matches(TEXT_ENTRY_SELECTOR)) return null;
  return active;
}

function isTouchViewport(metrics: ViewportMetrics) {
  return metrics.width <= 1024 || navigator.maxTouchPoints > 0;
}

function isKeyboardOpen(
  dialog: HTMLElement,
  metrics: ViewportMetrics,
  baseline: DialogBaseline,
) {
  if (!isTouchViewport(metrics) || !getActiveTextEntry(dialog)) return false;

  const lostHeight = baseline.viewportHeight - metrics.height;
  const threshold = Math.max(120, baseline.viewportHeight * 0.16);
  const sameOrientation =
    Math.abs(baseline.viewportWidth - metrics.width) < Math.max(48, baseline.viewportWidth * 0.12);

  return sameOrientation && lostHeight >= threshold;
}

function setDialogFrame(
  dialog: HTMLElement,
  top: number,
  left: number,
  transform: string,
  maxHeight: number,
) {
  dialog.setAttribute(CENTERED_ATTRIBUTE, "true");
  dialog.style.setProperty("position", "fixed", "important");
  dialog.style.setProperty("top", `${top}px`, "important");
  dialog.style.setProperty("right", "auto", "important");
  dialog.style.setProperty("bottom", "auto", "important");
  dialog.style.setProperty("left", `${left}px`, "important");
  dialog.style.setProperty("margin", "0", "important");
  dialog.style.setProperty("translate", "none", "important");
  dialog.style.setProperty("transform", transform, "important");
  dialog.style.setProperty("transform-origin", "center center", "important");
  dialog.style.setProperty("max-height", `${Math.max(0, maxHeight)}px`, "important");
}

function revealFocusedField(dialog: HTMLElement) {
  const active = getActiveTextEntry(dialog);
  if (!active) return;

  const body = active.closest<HTMLElement>(".finance-modal-body");
  if (!body) return;

  const target =
    active.closest<HTMLElement>(
      '[data-slot="finance-form-field"], .finance-form-field',
    ) ?? active;

  window.requestAnimationFrame(() => {
    if (!body.isConnected || !target.isConnected) return;

    const bodyRect = body.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const edgeGap = 12;

    if (targetRect.bottom > bodyRect.bottom - edgeGap) {
      body.scrollTop += targetRect.bottom - bodyRect.bottom + edgeGap;
    } else if (targetRect.top < bodyRect.top + edgeGap) {
      body.scrollTop -= bodyRect.top + edgeGap - targetRect.top;
    }
  });
}

function centerDialog(dialog: HTMLElement) {
  const metrics = getViewportMetrics();
  const baseline = dialogBaselines.get(dialog);

  if (baseline && isKeyboardOpen(dialog, metrics, baseline)) {
    const stableTop = metrics.top + Math.max(8, baseline.screenTop);
    const stableLeft = metrics.left + baseline.screenCenterX;
    const visibleBottom = metrics.top + metrics.height;
    const availableHeight = Math.max(160, visibleBottom - stableTop - 8);

    dialog.setAttribute(KEYBOARD_ATTRIBUTE, "true");
    setDialogFrame(
      dialog,
      stableTop,
      stableLeft,
      "translate3d(-50%, 0, 0)",
      availableHeight,
    );
    revealFocusedField(dialog);
    return;
  }

  dialog.removeAttribute(KEYBOARD_ATTRIBUTE);

  const centerX = metrics.left + metrics.width / 2;
  const centerY = metrics.top + metrics.height / 2;
  setDialogFrame(
    dialog,
    centerY,
    centerX,
    "translate3d(-50%, -50%, 0)",
    metrics.height - 16,
  );

  const rect = dialog.getBoundingClientRect();
  dialogBaselines.set(dialog, {
    viewportWidth: metrics.width,
    viewportHeight: metrics.height,
    screenTop: Math.max(8, rect.top - metrics.top),
    screenCenterX: centerX - metrics.left,
  });
}

function syncDialogCenters() {
  for (const dialog of dialogBaselines.keys()) {
    if (!dialog.isConnected) dialogBaselines.delete(dialog);
  }
  getDialogs().forEach(centerDialog);
}

function containsDialog(node: Node) {
  if (!(node instanceof Element)) return false;
  return node.matches(DIALOG_SELECTOR) || Boolean(node.querySelector(DIALOG_SELECTOR));
}

function clearDialogCenter(dialog: HTMLElement) {
  dialog.removeAttribute(CENTERED_ATTRIBUTE);
  dialog.removeAttribute(KEYBOARD_ATTRIBUTE);
  dialogBaselines.delete(dialog);

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

    const scheduleViewportSync = () => {
      if (!document.querySelector(DIALOG_SELECTOR)) return;
      scheduleSync();
    };

    const resetForOrientation = () => {
      dialogBaselines.clear();
      scheduleViewportSync();
    };

    const handleFocusOut = () => {
      window.setTimeout(scheduleViewportSync, 80);
    };

    syncDialogCenters();

    const observer = new MutationObserver((mutations) => {
      const dialogAdded = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(containsDialog),
      );
      if (dialogAdded) scheduleSync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const viewport = window.visualViewport;
    window.addEventListener("resize", scheduleViewportSync, { passive: true });
    window.addEventListener("orientationchange", resetForOrientation, {
      passive: true,
    });
    document.addEventListener("focusin", scheduleViewportSync, true);
    document.addEventListener("focusout", handleFocusOut, true);
    viewport?.addEventListener("resize", scheduleViewportSync, { passive: true });
    viewport?.addEventListener("scroll", scheduleViewportSync, { passive: true });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleViewportSync);
      window.removeEventListener("orientationchange", resetForOrientation);
      document.removeEventListener("focusin", scheduleViewportSync, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      viewport?.removeEventListener("resize", scheduleViewportSync);
      viewport?.removeEventListener("scroll", scheduleViewportSync);

      document
        .querySelectorAll<HTMLElement>(`[${CENTERED_ATTRIBUTE}="true"]`)
        .forEach(clearDialogCenter);
      dialogBaselines.clear();
    };
  }, []);

  return <style>{GLOBAL_DIALOG_STYLE}</style>;
}
