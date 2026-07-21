"use client";

import { useEffect } from "react";

const MANAGED_CONTROL_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
  "textarea",
  "select",
  ".field-input",
  ".finance-account-select",
  ".auth-input",
  ".auth-field-control",
  '[data-slot="input"]',
  '[data-slot="textarea"]',
  '[data-slot="select-trigger"]',
  '[role="combobox"]',
  '[role="listbox"][aria-roledescription="scroll picker"]',
  '[role="spinbutton"][aria-haspopup="dialog"]',
  'button[aria-haspopup="listbox"]',
].join(",");

const MANAGED_FORM_MARKER_SELECTOR = [
  ".auth-field",
  ".auth-input",
  ".finance-form-field",
  '[data-slot="finance-form-field"]',
  ".field-input",
  ".finance-account-select",
  '[data-slot="select-trigger"]',
  '[role="listbox"][aria-roledescription="scroll picker"]',
].join(",");

const GLOBAL_FIELD_HEIGHT = "var(--jf-global-form-control-height, 3rem)";
const RUNTIME_FIELD_ATTRIBUTE = "data-jf-global-field-height";
const RUNTIME_GROUP_ATTRIBUTE = "data-jf-global-field-group";

function isManagedForm(form: HTMLFormElement) {
  if (form.matches('[role="search"], [data-mobile-control-cluster]')) return false;
  if (form.closest("header, nav, .jf-desktop-header")) return false;
  return Boolean(form.querySelector(MANAGED_FORM_MARKER_SELECTOR));
}

function getManagedRoots() {
  const roots = new Set<HTMLElement>();

  document
    .querySelectorAll<HTMLElement>(
      '.finance-modal-content, [data-slot="dialog-content"].finance-modal-content',
    )
    .forEach((root) => roots.add(root));

  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    if (isManagedForm(form)) roots.add(form);
  });

  return Array.from(roots);
}

function isLockedPresentationField(element: HTMLElement) {
  if (element.dataset.financeLockedName === "true") return true;

  if (element.id === "investment-name") {
    const field = element.closest<HTMLElement>('[data-slot="finance-form-field"]');
    if (field && !field.querySelector(":scope > button")) return true;
  }

  return false;
}

function setExactFieldHeight(element: HTMLElement) {
  if (isLockedPresentationField(element)) return;

  element.setAttribute(RUNTIME_FIELD_ATTRIBUTE, "true");
  element.style.setProperty("box-sizing", "border-box", "important");
  element.style.setProperty("height", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("min-height", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("max-height", GLOBAL_FIELD_HEIGHT, "important");
}

function setExactGroupHeight(group: HTMLElement) {
  group.setAttribute(RUNTIME_GROUP_ATTRIBUTE, "true");
  group.style.setProperty("box-sizing", "border-box", "important");
  group.style.setProperty("height", GLOBAL_FIELD_HEIGHT, "important");
  group.style.setProperty("min-height", GLOBAL_FIELD_HEIGHT, "important");
  group.style.setProperty("max-height", GLOBAL_FIELD_HEIGHT, "important");

  group
    .querySelectorAll<HTMLElement>(
      ':scope > button[role="radio"], :scope > button[aria-pressed]',
    )
    .forEach((button) => {
      button.style.setProperty("height", "100%", "important");
      button.style.setProperty("min-height", "0", "important");
      button.style.setProperty("max-height", "100%", "important");
    });
}

function syncAllFormFieldHeights() {
  getManagedRoots().forEach((root) => {
    root
      .querySelectorAll<HTMLElement>(MANAGED_CONTROL_SELECTOR)
      .forEach(setExactFieldHeight);

    root
      .querySelectorAll<HTMLElement>('[role="radiogroup"]')
      .forEach(setExactGroupHeight);

    if (root.matches(".finance-modal-content")) {
      root
        .querySelectorAll<HTMLElement>(
          '.finance-modal-body > div:has(> button[aria-pressed])',
        )
        .forEach(setExactGroupHeight);
    }
  });
}

export default function GlobalFormFieldAuthority() {
  useEffect(() => {
    let syncFrame: number | null = null;

    const scheduleSync = () => {
      if (syncFrame !== null) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = null;
        syncAllFormFieldHeights();
      });
    };

    syncAllFormFieldHeights();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-slot", "role", "aria-haspopup"],
    });

    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("orientationchange", scheduleSync, { passive: true });

    return () => {
      observer.disconnect();
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
    };
  }, []);

  return null;
}
