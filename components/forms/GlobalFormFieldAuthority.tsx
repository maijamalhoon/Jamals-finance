"use client";

import { useEffect } from "react";

const MANAGED_CONTROL_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
  "textarea",
  "select",
  ".field-input",
  ".finance-control",
  ".finance-account-select",
  ".auth-input",
  ".auth-field-control",
  '[data-slot="input"]',
  '[data-slot="textarea"]',
  '[data-slot="select-trigger"]',
  '[data-finance-control="true"]',
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
  ".finance-control",
  ".finance-account-select",
  '[data-slot="select-trigger"]',
  '[role="listbox"][aria-roledescription="scroll picker"]',
].join(",");

const MANAGED_GROUP_SELECTOR = '[role="radiogroup"], [role="group"]';
const FINANCE_ROOT_SELECTOR =
  '.finance-modal-content, [data-slot="dialog-content"].finance-modal-content';
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
    .querySelectorAll<HTMLElement>(FINANCE_ROOT_SELECTOR)
    .forEach((root) => roots.add(root));

  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    if (isManagedForm(form)) roots.add(form);
  });

  return Array.from(roots);
}

function hasDirectButton(
  container: HTMLElement,
  predicate: (button: HTMLButtonElement) => boolean,
) {
  return Array.from(container.children).some(
    (child) => child instanceof HTMLButtonElement && predicate(child),
  );
}

function isManagedChoiceGroup(group: HTMLElement) {
  return hasDirectButton(
    group,
    (button) =>
      button.getAttribute("role") === "radio" || button.hasAttribute("aria-pressed"),
  );
}

function isLockedPresentationField(element: HTMLElement) {
  if (element.dataset.financeLockedName === "true") return true;

  if (element.id === "investment-name") {
    const field = element.closest<HTMLElement>('[data-slot="finance-form-field"]');
    if (field && !hasDirectButton(field, () => true)) return true;
  }

  return false;
}

function setExactFieldFootprint(element: HTMLElement) {
  if (isLockedPresentationField(element)) return;

  element.setAttribute(RUNTIME_FIELD_ATTRIBUTE, "true");
  element.style.setProperty("box-sizing", "border-box", "important");
  element.style.setProperty("inline-size", "100%", "important");
  element.style.setProperty("width", "100%", "important");
  element.style.setProperty("min-inline-size", "0", "important");
  element.style.setProperty("min-width", "0", "important");
  element.style.setProperty("max-inline-size", "100%", "important");
  element.style.setProperty("max-width", "100%", "important");
  element.style.setProperty("block-size", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("height", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("min-block-size", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("min-height", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("max-block-size", GLOBAL_FIELD_HEIGHT, "important");
  element.style.setProperty("max-height", GLOBAL_FIELD_HEIGHT, "important");
}

function setExactGroupFootprint(group: HTMLElement) {
  if (!isManagedChoiceGroup(group)) return;

  group.setAttribute(RUNTIME_GROUP_ATTRIBUTE, "true");
  group.style.setProperty("box-sizing", "border-box", "important");
  group.style.setProperty("inline-size", "100%", "important");
  group.style.setProperty("width", "100%", "important");
  group.style.setProperty("min-inline-size", "0", "important");
  group.style.setProperty("min-width", "0", "important");
  group.style.setProperty("max-inline-size", "100%", "important");
  group.style.setProperty("max-width", "100%", "important");
  group.style.setProperty("block-size", GLOBAL_FIELD_HEIGHT, "important");
  group.style.setProperty("height", GLOBAL_FIELD_HEIGHT, "important");
  group.style.setProperty("min-height", GLOBAL_FIELD_HEIGHT, "important");
  group.style.setProperty("max-height", GLOBAL_FIELD_HEIGHT, "important");

  Array.from(group.children).forEach((child) => {
    if (!(child instanceof HTMLButtonElement)) return;
    if (
      child.getAttribute("role") !== "radio" &&
      !child.hasAttribute("aria-pressed")
    ) {
      return;
    }
    child.style.setProperty("height", "100%", "important");
    child.style.setProperty("min-height", "0", "important");
    child.style.setProperty("max-height", "100%", "important");
  });
}

function syncManagedRoot(root: HTMLElement) {
  if (root instanceof HTMLFormElement && !isManagedForm(root)) return;

  root
    .querySelectorAll<HTMLElement>(MANAGED_CONTROL_SELECTOR)
    .forEach(setExactFieldFootprint);

  root
    .querySelectorAll<HTMLElement>(MANAGED_GROUP_SELECTOR)
    .forEach(setExactGroupFootprint);

  if (root.matches(".finance-modal-content")) {
    root
      .querySelectorAll<HTMLElement>(".finance-modal-body > div")
      .forEach(setExactGroupFootprint);
  }
}

function syncAllFormFieldFootprints() {
  getManagedRoots().forEach(syncManagedRoot);
}

function collectManagedRoots(node: Node, roots: Set<HTMLElement>) {
  if (!(node instanceof Element)) return;

  const nearestFinanceRoot = node.closest<HTMLElement>(FINANCE_ROOT_SELECTOR);
  if (nearestFinanceRoot) roots.add(nearestFinanceRoot);

  const nearestForm = node.closest<HTMLFormElement>("form");
  if (nearestForm && isManagedForm(nearestForm)) roots.add(nearestForm);

  if (node.matches(FINANCE_ROOT_SELECTOR)) roots.add(node as HTMLElement);
  if (node instanceof HTMLFormElement && isManagedForm(node)) roots.add(node);

  node.querySelectorAll<HTMLElement>(FINANCE_ROOT_SELECTOR).forEach((root) => {
    roots.add(root);
  });
  node.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    if (isManagedForm(form)) roots.add(form);
  });
}

export default function GlobalFormFieldAuthority() {
  useEffect(() => {
    let syncFrame: number | null = null;
    const pendingRoots = new Set<HTMLElement>();

    const flushPendingRoots = () => {
      syncFrame = null;
      const roots = Array.from(pendingRoots).filter((root) => root.isConnected);
      pendingRoots.clear();
      roots.forEach(syncManagedRoot);
    };

    const scheduleSync = () => {
      if (syncFrame !== null || pendingRoots.size === 0) return;
      syncFrame = window.requestAnimationFrame(flushPendingRoots);
    };

    syncAllFormFieldFootprints();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        collectManagedRoots(mutation.target, pendingRoots);
        mutation.addedNodes.forEach((node) => collectManagedRoots(node, pendingRoots));
      });
      scheduleSync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-slot", "role", "aria-haspopup"],
    });

    return () => {
      observer.disconnect();
      pendingRoots.clear();
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
    };
  }, []);

  return null;
}
