"use client";

import { useEffect } from "react";

const FORM_ROOT_SELECTOR =
  '.finance-modal-content, [data-slot="dialog-content"]';
const ACCOUNT_SELECTOR = ".finance-account-select";
const MAX_BUTTON_ATTRIBUTE = "data-jf-account-amount-max-button";
const MANAGED_INPUT_ATTRIBUTE = "data-jf-account-amount-max-input";
const MANAGED_HOST_ATTRIBUTE = "data-jf-account-amount-max-host";
const HIDDEN_SOURCE_ATTRIBUTE = "data-jf-account-amount-max-source-hidden";
const AMOUNT_LABEL_PATTERN = /\b(amount|contribution|payment)\b/i;

const GLOBAL_ACCOUNT_MAX_STYLE = `
html body button[${MAX_BUTTON_ATTRIBUTE}="true"] {
  position: absolute !important;
  z-index: 4 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0.25rem 0.375rem !important;
  border: 0 !important;
  border-radius: 0.55rem !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 0.6875rem !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  letter-spacing: 0.02em !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  transform: translateY(-50%) !important;
  transition: opacity 160ms ease, transform 160ms ease !important;
}

html body button[${MAX_BUTTON_ATTRIBUTE}="true"]:hover {
  opacity: 0.68 !important;
}

html body button[${MAX_BUTTON_ATTRIBUTE}="true"]:active {
  transform: translateY(-50%) scale(0.95) !important;
}

html body button[${MAX_BUTTON_ATTRIBUTE}="true"]:disabled {
  cursor: not-allowed !important;
  color: var(--text-tertiary) !important;
  opacity: 0.45 !important;
}
`;

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseDisplayedNumber(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    )
    .replace(/\u00a0/g, " ");
  const matches = normalized.match(/-?\d[\d,]*(?:\.\d+)?/g);
  if (!matches?.length) return null;

  const parsed = Number(matches[matches.length - 1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEditableAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "";
  const rounded = Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function getFieldLabel(root: HTMLElement, input: HTMLInputElement) {
  const directLabel = input.id
    ? Array.from(root.querySelectorAll<HTMLLabelElement>("label")).find(
        (label) => label.htmlFor === input.id,
      )
    : null;

  if (directLabel) return directLabel;

  const field = input.closest<HTMLElement>(
    '[data-slot="finance-form-field"], .finance-form-field',
  );
  return field?.querySelector<HTMLLabelElement>("label") ?? null;
}

function getCommonAncestor(first: HTMLElement, second: HTMLElement) {
  let current: HTMLElement | null = first;
  while (current) {
    if (current.contains(second)) return current;
    current = current.parentElement;
  }
  return null;
}

function getFieldContainer(
  root: HTMLElement,
  input: HTMLInputElement,
  label: HTMLLabelElement,
) {
  return (
    input.closest<HTMLElement>(
      '[data-slot="finance-form-field"], .finance-form-field',
    ) ??
    getCommonAncestor(label, input) ??
    root
  );
}

function getSelectedBalance(root: HTMLElement) {
  const accountControl = root.querySelector<HTMLElement>(ACCOUNT_SELECTOR);
  if (!accountControl) return null;

  const activeId = accountControl.getAttribute("aria-activedescendant");
  const activeOption = activeId
    ? root.ownerDocument.getElementById(activeId)
    : accountControl.querySelector<HTMLElement>(
        '[role="option"][aria-selected="true"]',
      );
  const selectedScope = activeOption ?? accountControl;
  const balanceNode =
    selectedScope.querySelector<HTMLElement>(".text-right") ??
    accountControl.querySelector<HTMLElement>(".text-right");

  return parseDisplayedNumber(balanceNode?.textContent);
}

function getFieldCap(field: HTMLElement, input: HTMLInputElement) {
  const nativeMaximum = Number(input.max);
  const caps: number[] = [];

  if (input.max !== "" && Number.isFinite(nativeMaximum) && nativeMaximum >= 0) {
    caps.push(nativeMaximum);
  }

  field.querySelectorAll<HTMLElement>("p, [data-jf-max-cap]").forEach((node) => {
    const text = compactText(node.textContent ?? "");
    if (!/\b(remaining|available|maximum|max)\b/i.test(text)) return;
    const parsed = parseDisplayedNumber(text);
    if (parsed !== null && parsed >= 0) caps.push(parsed);
  });

  return caps.length ? Math.min(...caps) : null;
}

function getAccentColor(root: HTMLElement) {
  const style = window.getComputedStyle(root);
  return (
    style.getPropertyValue("--finance-action").trim() ||
    style.getPropertyValue("--transaction-accent").trim() ||
    style.getPropertyValue("--active").trim() ||
    "currentColor"
  );
}

function getExistingMaxButtons(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) =>
      button.getAttribute(MAX_BUTTON_ATTRIBUTE) !== "true" &&
      /^max\b/i.test(compactText(button.textContent ?? "")),
  );
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.focus({ preventScroll: true });
}

function positionButton(
  button: HTMLButtonElement,
  input: HTMLInputElement,
  host: HTMLElement,
) {
  const inputRect = input.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const top = inputRect.top - hostRect.top + inputRect.height / 2;
  const right = Math.max(8, hostRect.right - inputRect.right + 8);

  button.style.setProperty("top", `${top}px`, "important");
  button.style.setProperty("right", `${right}px`, "important");
}

function clearManagedInput(input: HTMLInputElement) {
  if (input.getAttribute(MANAGED_INPUT_ATTRIBUTE) !== "true") return;
  input.style.removeProperty("padding-right");
  input.removeAttribute(MANAGED_INPUT_ATTRIBUTE);
}

function clearManagedHost(host: HTMLElement) {
  if (host.getAttribute(MANAGED_HOST_ATTRIBUTE) !== "true") return;
  host.style.removeProperty("position");
  host.removeAttribute(MANAGED_HOST_ATTRIBUTE);
}

function restoreHiddenSources(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLButtonElement>(
      `button[${HIDDEN_SOURCE_ATTRIBUTE}="true"]`,
    )
    .forEach((button) => {
      button.style.removeProperty("display");
      button.removeAttribute(HIDDEN_SOURCE_ATTRIBUTE);
    });
}

function removeInjectedButton(button: HTMLButtonElement) {
  const inputId = button.dataset.jfAccountAmountMaxInputId;
  const input = inputId
    ? document.getElementById(inputId)
    : button.parentElement?.querySelector<HTMLInputElement>(
        `input[${MANAGED_INPUT_ATTRIBUTE}="true"]`,
      );
  if (input instanceof HTMLInputElement) clearManagedInput(input);

  const host = button.parentElement;
  if (host) clearManagedHost(host);
  button.remove();
}

function syncAmountInput(root: HTMLElement, input: HTMLInputElement) {
  if (input.disabled || input.readOnly) return;

  const label = getFieldLabel(root, input);
  if (!label || !AMOUNT_LABEL_PATTERN.test(compactText(label.textContent ?? ""))) {
    return;
  }

  const field = getFieldContainer(root, input, label);
  const host = input.parentElement;
  if (!host) return;

  const existingMaxButtons = getExistingMaxButtons(root);
  const inlineExisting = existingMaxButtons.find(
    (button) => button.parentElement === host,
  );
  if (inlineExisting) return;

  const proxiedSource = existingMaxButtons.find((button) => field.contains(button));
  const selectedBalance = getSelectedBalance(root);
  const cap = getFieldCap(field, input);
  const maximum =
    selectedBalance === null
      ? cap
      : cap === null
        ? selectedBalance
        : Math.min(selectedBalance, cap);

  let button = host.querySelector<HTMLButtonElement>(
    `button[${MAX_BUTTON_ATTRIBUTE}="true"][data-jf-account-amount-max-for="${input.id}"]`,
  );

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.textContent = "Max";
    button.setAttribute(MAX_BUTTON_ATTRIBUTE, "true");
    button.dataset.jfAccountAmountMaxFor = input.id;
    button.dataset.jfAccountAmountMaxInputId = input.id;
    button.setAttribute("aria-label", "Use the maximum available amount");
    button.title = "Use maximum available amount";
    host.appendChild(button);
  }

  const computedHostPosition = window.getComputedStyle(host).position;
  if (computedHostPosition === "static") {
    host.style.setProperty("position", "relative", "important");
    host.setAttribute(MANAGED_HOST_ATTRIBUTE, "true");
  }

  input.style.setProperty("padding-right", "3.5rem", "important");
  input.setAttribute(MANAGED_INPUT_ATTRIBUTE, "true");
  button.style.setProperty("color", getAccentColor(root), "important");
  positionButton(button, input, host);

  if (proxiedSource) {
    proxiedSource.style.setProperty("display", "none", "important");
    proxiedSource.setAttribute(HIDDEN_SOURCE_ATTRIBUTE, "true");
    button.disabled = proxiedSource.disabled;
    button.onclick = () => proxiedSource.click();
    return;
  }

  button.disabled = maximum === null || maximum <= 0;
  button.onclick = () => {
    if (maximum === null || maximum <= 0) return;
    setReactInputValue(input, formatEditableAmount(maximum));
  };
}

function syncAll() {
  const liveButtons = new Set<HTMLButtonElement>();

  document.querySelectorAll<HTMLElement>(FORM_ROOT_SELECTOR).forEach((root) => {
    if (!root.querySelector(ACCOUNT_SELECTOR)) return;

    root
      .querySelectorAll<HTMLInputElement>(
        'input[type="number"], input[inputmode="decimal"]',
      )
      .forEach((input) => syncAmountInput(root, input));

    root
      .querySelectorAll<HTMLButtonElement>(
        `button[${MAX_BUTTON_ATTRIBUTE}="true"]`,
      )
      .forEach((button) => liveButtons.add(button));
  });

  document
    .querySelectorAll<HTMLButtonElement>(
      `button[${MAX_BUTTON_ATTRIBUTE}="true"]`,
    )
    .forEach((button) => {
      if (!liveButtons.has(button) || !button.isConnected) removeInjectedButton(button);
    });
}

export default function GlobalAccountAmountMaxAuthority() {
  useEffect(() => {
    let frame: number | null = null;

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        syncAll();
      });
    };

    syncAll();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "aria-activedescendant",
        "aria-selected",
        "data-state",
        "disabled",
        "max",
        "value",
      ],
    });

    document.addEventListener("change", schedule, true);
    document.addEventListener("input", schedule, true);
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      document.removeEventListener("change", schedule, true);
      document.removeEventListener("input", schedule, true);
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);

      document
        .querySelectorAll<HTMLButtonElement>(
          `button[${MAX_BUTTON_ATTRIBUTE}="true"]`,
        )
        .forEach(removeInjectedButton);
      restoreHiddenSources();
    };
  }, []);

  return <style>{GLOBAL_ACCOUNT_MAX_STYLE}</style>;
}
