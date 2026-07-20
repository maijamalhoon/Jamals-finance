"use client";

import { useEffect } from "react";

const runtimeCss = `
.settings-profile-details-hard,
.settings-account-security-hard,
.settings-currency-hard,
.settings-date-format-hard {
  top: 50% !important;
  right: auto !important;
  bottom: auto !important;
  left: 50% !important;
  width: min(calc(100vw - 1rem), var(--settings-hard-modal-width, 32rem)) !important;
  height: max-content !important;
  max-height: calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
  margin: 0 !important;
  transform: translate3d(-50%, -50%, 0) !important;
  border: 0 !important;
  background: var(--card) !important;
  box-shadow: 0 14px 34px rgb(0 0 0 / 0.2) !important;
}

.settings-account-security-hard {
  --settings-hard-modal-width: 36rem;
}

.settings-profile-details-hard::before,
.settings-account-security-hard::before {
  content: "";
  position: absolute;
  z-index: 5;
  top: 0.8rem;
  left: 0;
  width: 0.28rem;
  height: 2.7rem;
  border-radius: 0 999px 999px 0;
  pointer-events: none;
}

.settings-profile-details-hard::before {
  background: var(--investment) !important;
}

.settings-account-security-hard::before {
  background: var(--info) !important;
}

.settings-profile-details-hard .finance-modal-header,
.settings-account-security-hard .finance-modal-header {
  min-height: 4.25rem !important;
  padding: 1rem 3.75rem 0.9rem 1.25rem !important;
  border: 0 !important;
  background: var(--card) !important;
  box-shadow: none !important;
}

.settings-profile-details-hard .finance-modal-header .finance-icon-container,
.settings-account-security-hard .finance-modal-header .finance-icon-container,
.settings-profile-details-hard .finance-modal-header [data-slot="dialog-description"],
.settings-account-security-hard .finance-modal-header [data-slot="dialog-description"] {
  display: none !important;
}

.settings-profile-details-hard .finance-modal-header > div,
.settings-account-security-hard .finance-modal-header > div {
  gap: 0 !important;
}

.settings-profile-details-hard .finance-modal-body,
.settings-account-security-hard .finance-modal-body {
  min-height: 0 !important;
  border: 0 !important;
  background: var(--card) !important;
  box-shadow: none !important;
}

.settings-profile-details-hard .finance-modal-body {
  flex: 0 1 auto !important;
}

.settings-profile-details-hard .settings-email-field > p {
  display: none !important;
}

.settings-profile-details-hard .finance-modal-body > button[type="submit"] {
  width: 100% !important;
  min-height: var(--oneui-control-height-lg) !important;
  border: 0 !important;
  background: var(--investment) !important;
  color: var(--text-inverse) !important;
  box-shadow: none !important;
}

.settings-profile-details-hard .finance-modal-body > button[type="submit"] > svg:not(.animate-spin) {
  display: none !important;
}

.settings-account-security-hard .finance-modal-body {
  flex: 1 1 auto !important;
  max-height: calc(100dvh - 5.25rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
}

.settings-account-security-hard .settings-security-panel {
  gap: 0.8rem !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  padding: 0.25rem 0 !important;
  box-shadow: none !important;
}

.settings-account-security-hard .settings-security-panel + .settings-security-panel {
  margin-top: 0.65rem !important;
  padding-top: 0.75rem !important;
}

.settings-account-security-hard .settings-security-panel-icon {
  width: 1.75rem !important;
  height: 1.75rem !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--info) !important;
  box-shadow: none !important;
}

.settings-account-security-hard .settings-security-panel-heading {
  align-items: flex-start !important;
  gap: 0.7rem !important;
}

.settings-account-security-hard .settings-coming-soon {
  min-height: 1.65rem !important;
  border: 0 !important;
  background: var(--surface-inset) !important;
  box-shadow: none !important;
}

.settings-account-security-hard .settings-security-panel:first-of-type > button,
.settings-account-security-hard .settings-security-panel:first-of-type form button[type="submit"] {
  border: 0 !important;
  background: var(--info) !important;
  color: var(--text-inverse) !important;
  box-shadow: none !important;
}

.settings-account-security-hard .settings-security-panel:last-of-type > button {
  border: 0 !important;
  background: color-mix(in srgb, var(--danger), transparent 88%) !important;
  color: var(--danger) !important;
  box-shadow: none !important;
}

.settings-force-wheel {
  position: relative !important;
  overflow: hidden !important;
  touch-action: none !important;
  cursor: ns-resize !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

.settings-force-wheel > [data-slot="select-value"] {
  opacity: 0 !important;
}

.settings-force-wheel > svg {
  opacity: 0.55 !important;
}

.settings-wheel-overlay {
  position: absolute;
  inset: 0 2.6rem 0 0;
  z-index: 2;
  display: flex;
  align-items: center;
  min-width: 0;
  padding-left: 1rem;
  color: var(--text-primary);
  font-weight: 650;
  pointer-events: none;
  will-change: transform, opacity;
  transition: transform 180ms cubic-bezier(0.22, 0.72, 0.2, 1), opacity 180ms ease;
}

.settings-force-wheel[data-wheel-dragging="true"] .settings-wheel-overlay {
  transition: none !important;
}

.dark .settings-profile-details-hard,
.dark .settings-account-security-hard {
  box-shadow: 0 14px 34px rgb(0 0 0 / 0.28) !important;
}
`;

type WheelDefinition = {
  id: string;
  options: readonly string[];
};

const wheelDefinitions: WheelDefinition[] = [
  { id: "settings-currency-select", options: ["PKR", "USD"] },
  {
    id: "settings-date-format-select",
    options: ["Jun 22, 2026", "22 Jun 2026", "2026-06-22"],
  },
];

const wheelCleanup = new Map<HTMLElement, () => void>();

function visibleText(element: HTMLElement) {
  const value = element.querySelector<HTMLElement>('[data-slot="select-value"]');
  return (value?.textContent ?? element.textContent ?? "").trim();
}

function findOptionIndex(options: readonly string[], current: string) {
  const exact = options.findIndex((option) => option === current);
  if (exact >= 0) return exact;
  return options.findIndex((option) => current.includes(option));
}

function chooseSelectOption(trigger: HTMLElement, label: string) {
  trigger.click();

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      const items = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="select-item"]'),
      );
      const target = items.find((item) => item.textContent?.trim() === label);
      target?.click();
    }, 0);
  });
}

function installWheel(trigger: HTMLElement, options: readonly string[]) {
  if (wheelCleanup.has(trigger)) return;

  if (trigger.getAttribute("aria-roledescription") === "scroll picker") {
    trigger.classList.add("settings-force-wheel");
    wheelCleanup.set(trigger, () => trigger.classList.remove("settings-force-wheel"));
    return;
  }

  if (trigger.dataset.slot !== "select-trigger") return;

  trigger.classList.add("settings-force-wheel");
  const overlay = document.createElement("span");
  overlay.className = "settings-wheel-overlay";
  overlay.setAttribute("aria-hidden", "true");
  trigger.appendChild(overlay);

  let startY = 0;
  let currentY = 0;
  let pointerId: number | null = null;
  let moved = false;
  let wheelLocked = false;

  const refresh = () => {
    overlay.textContent = visibleText(trigger);
  };

  const observer = new MutationObserver(refresh);
  observer.observe(trigger, { subtree: true, childList: true, characterData: true });
  refresh();

  const moveSelection = (direction: number) => {
    const current = visibleText(trigger);
    const currentIndex = Math.max(0, findOptionIndex(options, current));
    const nextIndex = Math.min(
      options.length - 1,
      Math.max(0, currentIndex + direction),
    );
    if (nextIndex === currentIndex) return;
    overlay.textContent = options[nextIndex];
    chooseSelectOption(trigger, options[nextIndex]);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    pointerId = event.pointerId;
    startY = event.clientY;
    currentY = event.clientY;
    moved = false;
    trigger.dataset.wheelDragging = "true";
    trigger.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    currentY = event.clientY;
    const delta = Math.max(-22, Math.min(22, currentY - startY));
    moved = moved || Math.abs(currentY - startY) > 5;
    overlay.style.transform = `translate3d(0, ${delta}px, 0)`;
    overlay.style.opacity = String(1 - Math.min(0.45, Math.abs(delta) / 55));
  };

  const finishPointer = (event: PointerEvent, cancelled = false) => {
    if (pointerId !== event.pointerId) return;
    if (trigger.hasPointerCapture(event.pointerId)) {
      trigger.releasePointerCapture(event.pointerId);
    }
    pointerId = null;
    delete trigger.dataset.wheelDragging;
    overlay.style.transform = "translate3d(0, 0, 0)";
    overlay.style.opacity = "1";

    const delta = currentY - startY;
    if (!cancelled && moved && Math.abs(delta) >= 10) {
      moveSelection(delta < 0 ? 1 : -1);
      return;
    }

    if (!cancelled && !moved) trigger.click();
  };

  const handleWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaY) < 2 || wheelLocked) return;
    event.preventDefault();
    wheelLocked = true;
    moveSelection(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => {
      wheelLocked = false;
    }, 180);
  };

  trigger.addEventListener("pointerdown", handlePointerDown);
  trigger.addEventListener("pointermove", handlePointerMove);
  trigger.addEventListener("pointerup", finishPointer);
  trigger.addEventListener("pointercancel", (event) => finishPointer(event, true));
  trigger.addEventListener("wheel", handleWheel, { passive: false });

  wheelCleanup.set(trigger, () => {
    observer.disconnect();
    trigger.removeEventListener("pointerdown", handlePointerDown);
    trigger.removeEventListener("pointermove", handlePointerMove);
    trigger.removeEventListener("pointerup", finishPointer);
    trigger.removeEventListener("wheel", handleWheel);
    trigger.classList.remove("settings-force-wheel");
    overlay.remove();
  });
}

function enhanceDialogs() {
  document
    .querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')
    .forEach((dialog) => {
      if (dialog.querySelector("#settings-reference-display-name")) {
        dialog.classList.add("settings-profile-details-hard");
        dialog
          .querySelector("#settings-reference-email")
          ?.closest('[data-slot="finance-form-field"]')
          ?.classList.add("settings-email-field");
      }

      if (dialog.querySelector(".settings-security-panel")) {
        dialog.classList.add("settings-account-security-hard");
      }

      if (dialog.querySelector("#settings-currency-select")) {
        dialog.classList.add("settings-currency-hard");
      }

      if (dialog.querySelector("#settings-date-format-select")) {
        dialog.classList.add("settings-date-format-hard");
      }
    });

  wheelDefinitions.forEach(({ id, options }) => {
    const control = document.getElementById(id);
    if (control instanceof HTMLElement) installWheel(control, options);
  });
}

export default function SettingsModalRuntimeEnhancer() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(enhanceDialogs);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true });
    document.addEventListener("click", schedule, true);
    schedule();

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.cancelAnimationFrame(frame);
      wheelCleanup.forEach((cleanup) => cleanup());
      wheelCleanup.clear();
    };
  }, []);

  return <style>{runtimeCss}</style>;
}
